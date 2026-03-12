/**
 * Parser OFX/OFC para importação de extratos bancários
 *
 * Suporta o formato OFX (Open Financial Exchange) usado por
 * praticamente todos os bancos brasileiros: Itaú, Bradesco,
 * Santander, BB, Caixa, Nubank, Inter, C6, BTG, XP, etc.
 *
 * Particularidades do OFX brasileiro:
 * - Tags frequentemente sem fechamento (SGML, não XML)
 * - Datas no formato YYYYMMDDHHMMSS ou YYYYMMDD
 * - Valores com ponto decimal: -150.00
 * - Encoding geralmente ISO-8859-1 (latin1)
 */

import type { ParsedTransaction } from './csv-parser';

interface OFXParseResult {
  transactions: ParsedTransaction[];
  errors: string[];
  totalRows: number;
  bankInfo?: {
    bankId?: string;
    branchId?: string;
    accountId?: string;
    accountType?: string;
  };
}

function parseOFXDate(raw: string): string | null {
  const cleaned = raw.trim().replace(/\[.*\]/, '');
  // YYYYMMDDHHMMSS or YYYYMMDD
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  const m = parseInt(month);
  const d = parseInt(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${year}-${month}-${day}`;
}

function extractTagValue(block: string, tag: string): string {
  // OFX tags can be self-closing (no end tag) or have end tags
  // Pattern 1: <TAG>value<\/TAG>
  const withClose = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const matchClose = block.match(withClose);
  if (matchClose) return matchClose[1].trim();

  // Pattern 2: <TAG>value\n (no closing tag - common in Brazilian OFX)
  const withoutClose = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
  const matchOpen = block.match(withoutClose);
  if (matchOpen) return matchOpen[1].trim();

  return '';
}

function extractTransactionBlocks(content: string): string[] {
  const blocks: string[] = [];
  const pattern = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST))/gi;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

export function parseOFX(content: string): OFXParseResult {
  const errors: string[] = [];
  const transactions: ParsedTransaction[] = [];

  // Verify this looks like OFX
  if (!content.includes('<OFX>') && !content.includes('<ofx>') &&
      !content.includes('OFXHEADER') && !content.includes('<OFC>')) {
    return { transactions: [], errors: ['Arquivo não parece ser OFX/OFC válido'], totalRows: 0 };
  }

  // Extract bank info
  const bankId = extractTagValue(content, 'BANKID');
  const branchId = extractTagValue(content, 'BRANCHID');
  const accountId = extractTagValue(content, 'ACCTID');
  const accountType = extractTagValue(content, 'ACCTTYPE');

  const bankInfo = (bankId || accountId)
    ? { bankId, branchId, accountId, accountType }
    : undefined;

  // Extract transaction blocks
  const blocks = extractTransactionBlocks(content);

  if (blocks.length === 0) {
    return { transactions: [], errors: ['Nenhuma transação encontrada no arquivo OFX'], totalRows: 0, bankInfo };
  }

  let idCounter = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    const trnType = extractTagValue(block, 'TRNTYPE');
    const dtPosted = extractTagValue(block, 'DTPOSTED');
    const trnAmt = extractTagValue(block, 'TRNAMT');
    const memo = extractTagValue(block, 'MEMO');
    const name = extractTagValue(block, 'NAME');
    const checkNum = extractTagValue(block, 'CHECKNUM');
    const refNum = extractTagValue(block, 'REFNUM');

    // Date
    const parsedDate = parseOFXDate(dtPosted);
    if (!parsedDate) {
      errors.push(`Transação ${i + 1}: Data inválida "${dtPosted}"`);
      continue;
    }

    // Amount
    const amount = parseFloat(trnAmt.replace(',', '.'));
    if (isNaN(amount)) {
      errors.push(`Transação ${i + 1}: Valor inválido "${trnAmt}"`);
      continue;
    }

    // Description: prefer MEMO, fallback to NAME, then type + ref
    let description = memo || name || '';
    if (!description) {
      description = [trnType, checkNum, refNum].filter(Boolean).join(' - ') || `Transação ${i + 1}`;
    }
    // Clean up common OFX description noise
    description = description
      .replace(/\s+/g, ' ')
      .trim();

    // Type: in OFX, negative = debit (expense), positive = credit (income)
    const isExpense = amount < 0;

    transactions.push({
      id: `ofx-${idCounter++}`,
      date: parsedDate,
      description,
      amount: Math.abs(amount),
      type: isExpense ? 'expense' : 'income',
      selected: true,
    });
  }

  return {
    transactions,
    errors,
    totalRows: blocks.length,
    bankInfo,
  };
}

/**
 * Lê arquivo OFX com encoding correto.
 * Muitos OFX brasileiros usam ISO-8859-1 (latin1).
 * Tenta detectar pelo header do OFX ou assume latin1.
 */
export function readOFXFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // First try reading as ArrayBuffer to detect encoding
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);

      // Check for UTF-8 BOM
      const hasUtf8Bom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;

      // Check OFX header for charset hint
      const headerPreview = new TextDecoder('ascii').decode(bytes.slice(0, 500));
      const charsetMatch = headerPreview.match(/CHARSET:\s*(\S+)/i);
      const encodingMatch = headerPreview.match(/ENCODING:\s*(\S+)/i);

      let encoding = 'iso-8859-1'; // Default for Brazilian OFX
      if (hasUtf8Bom) {
        encoding = 'utf-8';
      } else if (charsetMatch) {
        const cs = charsetMatch[1].toUpperCase();
        if (cs.includes('UTF') || cs.includes('UNICODE')) encoding = 'utf-8';
      } else if (encodingMatch) {
        const enc = encodingMatch[1].toUpperCase();
        if (enc.includes('UTF') || enc.includes('UNICODE')) encoding = 'utf-8';
      }

      // Decode with detected encoding
      const decoder = new TextDecoder(encoding);
      const text = decoder.decode(buffer);
      resolve(text);
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo OFX'));
    reader.readAsArrayBuffer(file);
  });
}
