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
 * Detecta o separador do CSV (vírgula, ponto-e-vírgula ou tab)
 */
function detectSeparator(firstLine: string): string {
  const separators = [';', ',', '\t'];
  let best = ',';
  let maxCount = 0;

  for (const sep of separators) {
    const count = (firstLine.match(new RegExp(`\\${sep}`, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      best = sep;
    }
  }

  return best;
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

/**
 * Detecta qual coluna é data, descrição e valor
 */
function detectColumns(headers: string[], firstDataRow: string[]): { dateCol: number; descCol: number; amountCol: number } {
  let dateCol = -1;
  let amountCol = -1;
  let descCol = -1;

  // Try by header names first
  const dateKeywords = ['data', 'date', 'dt', 'vencimento'];
  const amountKeywords = ['valor', 'amount', 'value', 'preço', 'preco', 'total', 'vlr'];
  const descKeywords = ['descrição', 'descricao', 'description', 'desc', 'título', 'titulo', 'estabelecimento', 'lançamento', 'lancamento'];

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

  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { transactions: [], errors: ['Arquivo vazio ou com dados insuficientes'], totalRows: lines.length };
  }

  const separator = detectSeparator(lines[0]);
  const allRows = lines.map((line) => line.split(separator));

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

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length < 2) continue; // skip malformed rows

    const rawDate = row[dateCol] || '';
    const rawDesc = row[descCol] || '';
    const rawAmount = row[amountCol] || '';

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

    const description = rawDesc.replace(/['"]/g, '').trim();
    if (!description) continue;

    transactions.push({
      id: `csv-${idCounter++}`,
      date: parsedDate,
      description,
      amount: Math.abs(parsedAmount),
      type: parsedAmount < 0 ? 'income' : 'expense', // Negative = payment/credit
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
