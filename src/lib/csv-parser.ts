/**
 * Parser de CSV para importação de transações de faturas de cartão
 * 
 * Suporta formatos comuns de CSV de bancos brasileiros:
 * - data;descrição;valor (Nubank, Inter, etc.)
 * - data,descrição,valor
 * - Com ou sem cabeçalho
 */

export interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  selected: boolean;
}

interface ParseResult {
  transactions: ParsedTransaction[];
  errors: string[];
  totalRows: number;
}

/**
 * Conta ocorrências do separador que estão FORA de aspas (evita contar vírgulas dentro de "campo, com vírgula")
 */
function countSeparatorOutsideQuotes(line: string, sep: string): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && c === sep) {
      count++;
    }
  }
  return count;
}

/**
 * Detecta o separador do CSV (vírgula, ponto-e-vírgula ou tab)
 * Usa contagem fora de aspas para não confundir com separadores dentro de campos
 */
function detectSeparator(firstLine: string): string {
  const separators = [';', ',', '\t'];
  let best = ',';
  let maxCount = 0;

  for (const sep of separators) {
    const count = countSeparatorOutsideQuotes(firstLine, sep);
    if (count > maxCount) {
      maxCount = count;
      best = sep;
    }
  }

  return best;
}

/**
 * Divide uma linha CSV respeitando campos entre aspas (ex: "Loja, Filial"; 01/01/2025; 100)
 * Assim o separador dentro de aspas não quebra a coluna.
 */
function splitCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (inQuotes) {
      current += c;
    } else if (c === separator) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Tenta parsear uma data em múltiplos formatos
 */
function parseDate(value: string): string | null {
  const cleaned = value.trim().replace(/['"]/g, '');
  
  // DD/MM/YYYY or DD-MM-YYYY
  const brFormat = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (brFormat) {
    const day = brFormat[1].padStart(2, '0');
    const month = brFormat[2].padStart(2, '0');
    let year = brFormat[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD
  const isoFormat = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoFormat) {
    return `${isoFormat[1]}-${isoFormat[2].padStart(2, '0')}-${isoFormat[3].padStart(2, '0')}`;
  }

  return null;
}

/**
 * Parseia um valor monetário brasileiro
 */
function parseAmount(value: string): number | null {
  let cleaned = value.trim().replace(/['"R$\s]/g, '');
  
  // "1.234,56" → "1234.56"
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Presets for known bank CSV formats
const BANK_PRESETS: { match: RegExp; dateCol: number; descCol: number; amountCol: number }[] = [
  // Nubank: Date,Title,Amount (English headers)
  { match: /^date[,;].*title[,;].*amount/i, dateCol: 0, descCol: 1, amountCol: 2 },
  // Nubank alt: Data,Descrição,Valor
  { match: /^data[,;].*descri[çc][ãa]o[,;].*valor/i, dateCol: 0, descCol: 1, amountCol: 2 },
  // Inter: Data Lançamento;Descrição;Valor
  { match: /data\s*lan[çc]amento/i, dateCol: 0, descCol: 1, amountCol: 2 },
  // C6: Data;Descrição;Valor (R$)
  { match: /valor\s*\(r\$\)/i, dateCol: 0, descCol: 1, amountCol: 2 },
  // Bradesco: Data;Histórico;Valor
  { match: /hist[óo]rico/i, dateCol: 0, descCol: 1, amountCol: 2 },
  // Itaú: data;lançamento;ag/origem;valor;saldo
  { match: /ag\/origem|ag\.?\s*origem/i, dateCol: 0, descCol: 1, amountCol: 3 },
  // BB: Data;Dependencia Origem;Histórico;Data do Balancete;Número do documento;Valor
  { match: /depend[eê]ncia\s*origem/i, dateCol: 0, descCol: 2, amountCol: 5 },
  // Santander: Data;Descrição;Valor;Saldo
  { match: /^data[,;]descri[çc][ãa]o[,;]valor[,;]saldo/i, dateCol: 0, descCol: 1, amountCol: 2 },
  // Caixa: Data;Descrição;Doc;Credito;Debito
  { match: /cr[ée]dito[,;]d[ée]bito/i, dateCol: 0, descCol: 1, amountCol: 3 },
  // Sicredi/Sicoob: Data Movimento;Descrição;Tipo;Valor
  { match: /data\s*movimento/i, dateCol: 0, descCol: 1, amountCol: 3 },
];

/**
 * Detecta qual coluna é data, descrição e valor
 */
function detectColumns(headers: string[], firstDataRow: string[]): { dateCol: number; descCol: number; amountCol: number } {
  let dateCol = -1;
  let amountCol = -1;
  let descCol = -1;

  // Try bank presets first
  const headerLine = headers.join(';');
  for (const preset of BANK_PRESETS) {
    if (preset.match.test(headerLine)) {
      return { dateCol: preset.dateCol, descCol: preset.descCol, amountCol: preset.amountCol };
    }
  }

  // Try by header names
  const dateKeywords = ['data', 'date', 'dt', 'vencimento'];
  const amountKeywords = ['valor', 'amount', 'value', 'preço', 'preco', 'total', 'vlr'];
  const descKeywords = ['descrição', 'descricao', 'description', 'desc', 'título', 'titulo', 'estabelecimento', 'lançamento', 'lancamento', 'historico', 'histórico', 'title'];

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim();
    if (dateKeywords.some((k) => h.includes(k))) dateCol = i;
    if (amountKeywords.some((k) => h.includes(k))) amountCol = i;
    if (descKeywords.some((k) => h.includes(k))) descCol = i;
  }

  // Fallback: detect by data content
  if (dateCol === -1 || amountCol === -1) {
    for (let i = 0; i < firstDataRow.length; i++) {
      const val = firstDataRow[i].trim();
      if (dateCol === -1 && parseDate(val)) {
        dateCol = i;
      } else if (amountCol === -1 && parseAmount(val) !== null && /[\d,.]/.test(val)) {
        amountCol = i;
      }
    }
  }

  // Description is the remaining column
  if (descCol === -1) {
    for (let i = 0; i < headers.length; i++) {
      if (i !== dateCol && i !== amountCol) {
        descCol = i;
        break;
      }
    }
  }

  return {
    dateCol: dateCol >= 0 ? dateCol : 0,
    descCol: descCol >= 0 ? descCol : 1,
    amountCol: amountCol >= 0 ? amountCol : 2,
  };
}

/**
 * Parseia o conteúdo de um CSV e retorna transações
 */
export function parseCSV(content: string): ParseResult {
  const errors: string[] = [];
  const transactions: ParsedTransaction[] = [];

  // Remove BOM se o arquivo veio do Excel/Windows
  const normalized = content.replace(/^\uFEFF/, '');
  const lines = normalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { transactions: [], errors: ['Arquivo vazio ou com dados insuficientes'], totalRows: lines.length };
  }

  const separator = detectSeparator(lines[0]);
  const allRows = lines.map((line) => splitCSVLine(line, separator));

  // Detect if first row is header
  const firstRowHasDate = parseDate(allRows[0][0]) !== null;
  const hasHeader = !firstRowHasDate;

  const headers = hasHeader ? allRows[0] : allRows[0].map((_, i) => `col${i}`);
  const dataRows = hasHeader ? allRows.slice(1) : allRows;

  if (dataRows.length === 0) {
    return { transactions: [], errors: ['Nenhuma linha de dados encontrada'], totalRows: 0 };
  }

  const { dateCol, descCol, amountCol } = detectColumns(headers, dataRows[0]);

  let idCounter = 0;

  const minCols = Math.max(dateCol, descCol, amountCol) + 1;
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length < minCols) continue; // linha com menos colunas que o esperado

    const rawDate = (row[dateCol] ?? '').trim();
    const rawDesc = (row[descCol] ?? '').trim();
    const rawAmount = (row[amountCol] ?? '').trim();

    const parsedDate = parseDate(rawDate);
    const parsedAmount = parseAmount(rawAmount);

    if (!parsedDate) {
      errors.push(`Linha ${i + (hasHeader ? 2 : 1)}: Data inválida "${rawDate}"`);
      continue;
    }

    if (parsedAmount === null) {
      errors.push(`Linha ${i + (hasHeader ? 2 : 1)}: Valor inválido "${rawAmount}"`);
      continue;
    }

    const description = rawDesc.replace(/['"]/g, '').trim() || `Transação ${i + 1}`;

    transactions.push({
      id: `csv-${idCounter++}`,
      date: parsedDate,
      description,
      amount: Math.abs(parsedAmount),
      type: parsedAmount < 0 ? 'expense' : 'income',
      selected: true,
    });
  }

  return { transactions, errors, totalRows: dataRows.length };
}

/**
 * Lê o conteúdo de um arquivo CSV
 */
export function readCSVFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsText(file, 'UTF-8');
  });
}
