import * as XLSX from 'xlsx';
import { ReconciliationMetadata, AccountSection } from '../types';

export interface ParsedFile {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  detectedHeaderRow: number;
  metadata?: ReconciliationMetadata;
}

const HEADER_KEYWORDS = [
  'fecha', 'date', 'fch', 'dia', 'valor', 'monto', 'amount', 'importe',
  'nit', 'cedula', 'cédula', 'identificacion', 'identificación', 'nombre',
  'cliente', 'referencia', 'reference', 'concepto', 'descripcion', 'descripción',
  'debito', 'débito', 'credito', 'crédito', 'comprobante', 'saldo',
];

export function parseNumberSafe(val: unknown): number | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : Number(val.toFixed(2));
  let s = String(val).trim().replace(/[$\s]/g, '');
  if (!s) return undefined;
  const isParen = /^\(.*\)$/.test(s);
  if (isParen) s = s.slice(1, -1);
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 2) s = s.replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  if (isNaN(n)) return undefined;
  const rounded = Number(n.toFixed(2));
  return isParen ? -Math.abs(rounded) : rounded;
}

export function isControlRow(values: unknown[]): boolean {
  const strVals = values.map((v) => String(v ?? '').trim());
  const fullText = strVals.join(' ').toLowerCase();
  if (!fullText) return true;

  if (
    fullText.startsWith('cuenta contable') ||
    fullText.includes('total general') ||
    fullText.includes('totales generales') ||
    fullText.startsWith('procesado en') ||
    fullText.startsWith('generado el') ||
    fullText.startsWith('fecha de corte') ||
    fullText.startsWith('pagina ') ||
    fullText.startsWith('página ')
  ) {
    return true;
  }

  const firstNonEmpty = strVals.find((v) => v !== '') || '';
  if (/^(total|totales|subtotal|suma|gran total|saldo inicial|saldo final|saldo anterior)/i.test(firstNonEmpty)) {
    return true;
  }

  return false;
}

/**
 * Extracts metadata from a sheet matrix (headers, company name, NIT, balances, accounts)
 */
export function extractMetadataFromMatrix(matrix: unknown[][]): ReconciliationMetadata {
  const meta: ReconciliationMetadata = {};
  const accounts: AccountSection[] = [];

  // 1. Scan top header rows (rows 0 to 6) for Company name, NIT, Period
  const headerSlice = matrix.slice(0, 7);
  for (let idx = 0; idx < headerSlice.length; idx++) {
    const row = headerSlice[idx];
    const text = row.map((v) => String(v ?? '').trim()).filter(Boolean).join(' ');
    if (!text) continue;

    // NIT detection
    const nitMatch = text.match(/nit[\s.:]*([0-9.\-]+)/i);
    if (nitMatch && !meta.companyNit) {
      meta.companyNit = nitMatch[1].replace(/[^\d\-]/g, '');
    }

    // Company name detection (usually rows 1-3 when uppercase and not a label)
    if (!meta.companyName && idx <= 3) {
      const candidate = row.find((cell) => {
        const str = String(cell ?? '').trim();
        return (
          str.length >= 6 &&
          /S\.?A\.?S\.?|LTDA|S\.?A\.?|INC|CORP|CONSTRUCTORES|INGENIEROS|COMERCIALIZADORA/i.test(str)
        );
      });
      if (candidate) {
        meta.companyName = String(candidate).trim();
      } else if (idx === 1 && text.length > 5 && !/movimiento|auxiliar|extracto|pagina|fecha/i.test(text)) {
        meta.companyName = text;
      }
    }

    // Period detection
    const periodMatch = text.match(/(?:periodo|desde|al|corte)[\s.:]*([0-9\/\-\s]+(?:al|a|-)?\s*[0-9\/\-]+)/i);
    if (periodMatch && !meta.period) {
      meta.period = periodMatch[1].trim();
    }
  }

  // 2. Scan for "Cuenta contable:" rows, balances, debits, credits
  for (const row of matrix) {
    const text = row.map((v) => String(v ?? '').trim()).join(' ');
    const lower = text.toLowerCase();

    // Cuenta bancaria en extracto
    const ctaMatch = text.match(/(?:cuenta|cta|no\.\s*cuenta)[\s\w]*[:#]?\s*([0-9\-]{5,})/i);
    if (ctaMatch && !meta.bankAccount) {
      meta.bankAccount = ctaMatch[1].replace(/[\s\-]/g, '');
    }

    // Cuenta contable en auxiliar
    if (lower.startsWith('cuenta contable') || lower.includes('cuenta contable:')) {
      const ctaMatchExact = text.match(/cuenta\s+contable\s*[:#]?\s*([0-9]{4,12})?\s*([^\d\n\r]+.*)?/i);
      const code = ctaMatchExact?.[1]?.trim() || '';
      const name = ctaMatchExact?.[2]?.trim() || text.replace(/cuenta\s+contable\s*[:#]?/i, '').trim();

      // Extract all numbers in this "Cuenta contable" row:
      // Typically: [Saldo inicial, Débito, Crédito, Saldo total cuenta (Saldo final)]
      const rowNumbers: number[] = [];
      for (const cell of row) {
        const num = parseNumberSafe(cell);
        if (num !== undefined) rowNumbers.push(num);
      }

      let initialBal = 0;
      let debits = 0;
      let credits = 0;
      let finalBal = 0;

      if (rowNumbers.length >= 4) {
        initialBal = rowNumbers[0];
        debits = rowNumbers[1];
        credits = rowNumbers[2];
        finalBal = rowNumbers[3];
      } else if (rowNumbers.length === 3) {
        initialBal = rowNumbers[0];
        debits = rowNumbers[1];
        credits = rowNumbers[2];
        finalBal = Number((initialBal + debits - credits).toFixed(2));
      } else if (rowNumbers.length === 2) {
        initialBal = rowNumbers[0];
        finalBal = rowNumbers[1];
      } else if (rowNumbers.length === 1) {
        initialBal = rowNumbers[0];
      }

      if (meta.ledgerInitialBalance === undefined) meta.ledgerInitialBalance = initialBal;
      if (meta.ledgerTotalDebits === undefined) meta.ledgerTotalDebits = debits;
      if (meta.ledgerTotalCredits === undefined) meta.ledgerTotalCredits = credits;
      if (meta.ledgerFinalBalance === undefined) meta.ledgerFinalBalance = finalBal;
      if (!meta.ledgerAccount) meta.ledgerAccount = `${code} ${name}`.trim();
      if (!meta.accountCode) meta.accountCode = code;
      if (!meta.accountName) meta.accountName = name;

      accounts.push({
        code,
        name,
        initialBalance: initialBal,
        debits,
        credits,
        finalBalance: finalBal,
      });
    }

    // Saldo anterior / saldo inicial
    if (lower.includes('saldo anterior') || lower.includes('saldo inicial')) {
      for (const cell of row) {
        const num = parseNumberSafe(cell);
        if (num !== undefined) {
          if (meta.bankPreviousBalance === undefined) meta.bankPreviousBalance = num;
          if (meta.ledgerInitialBalance === undefined) meta.ledgerInitialBalance = num;
          break;
        }
      }
    }

    // Saldo actual / saldo final
    if (lower.includes('saldo actual') || lower.includes('saldo final') || lower.includes('nuevo saldo')) {
      for (const cell of row) {
        const num = parseNumberSafe(cell);
        if (num !== undefined) {
          if (meta.bankCurrentBalance === undefined) meta.bankCurrentBalance = num;
          if (meta.ledgerFinalBalance === undefined) meta.ledgerFinalBalance = num;
          break;
        }
      }
    }

    // Totales abonos / cargos (Extracto bancario)
    if (lower.includes('total abonos') || lower.includes('abonos:')) {
      for (const cell of row) {
        const num = parseNumberSafe(cell);
        if (num !== undefined) {
          meta.bankTotalCredits = num;
          break;
        }
      }
    }
    if (lower.includes('total cargos') || lower.includes('cargos:')) {
      for (const cell of row) {
        const num = parseNumberSafe(cell);
        if (num !== undefined) {
          meta.bankTotalDebits = num;
          break;
        }
      }
    }

    // Totales débitos / créditos (Libro contable)
    if (lower.includes('total débitos') || lower.includes('total debitos')) {
      for (const cell of row) {
        const num = parseNumberSafe(cell);
        if (num !== undefined) {
          meta.ledgerTotalDebits = num;
          break;
        }
      }
    }
    if (lower.includes('total créditos') || lower.includes('total creditos')) {
      for (const cell of row) {
        const num = parseNumberSafe(cell);
        if (num !== undefined) {
          meta.ledgerTotalCredits = num;
          break;
        }
      }
    }
  }

  if (accounts.length > 0) {
    meta.availableAccounts = accounts;
  }

  // Warning if accounts differ
  if (meta.bankAccount && meta.ledgerAccount) {
    const bankNorm = meta.bankAccount.replace(/\D/g, '');
    const ledgerNorm = meta.ledgerAccount.replace(/\D/g, '');
    if (bankNorm.length >= 6 && ledgerNorm.length >= 6 && !ledgerNorm.includes(bankNorm) && !bankNorm.includes(ledgerNorm)) {
      meta.accountMatchWarning = `El extracto bancario (cta ${meta.bankAccount}) y el libro contable (${meta.ledgerAccount}) podrían corresponder a cuentas distintas.`;
    }
  }

  return meta;
}

export function parseSheetRows(matrix: unknown[][]): ParsedFile {
  const metadata = extractMetadataFromMatrix(matrix);

  const headerRowIndex = matrix.findIndex((row, index) => {
    if (index >= 20) return false;
    const labels = row.map((value) => String(value ?? '').trim().toLowerCase());
    return labels.filter((label) => HEADER_KEYWORDS.some((keyword) => label.includes(keyword))).length >= 2;
  });
  const detectedHeaderRow = headerRowIndex >= 0
    ? headerRowIndex
    : matrix.findIndex((row) => row.some((value) => String(value ?? '').trim() !== ''));

  if (detectedHeaderRow < 0) {
    return { headers: [], rows: [], totalRows: 0, detectedHeaderRow: 0, metadata };
  }

  const sourceHeaders = matrix[detectedHeaderRow].map((value, index) => {
    const label = String(value ?? '').trim();
    return label || `Columna ${index + 1}`;
  });
  const headerCounts = new Map<string, number>();
  const headers = sourceHeaders.map((header) => {
    const count = (headerCounts.get(header) || 0) + 1;
    headerCounts.set(header, count);
    return count === 1 ? header : `${header} (${count})`;
  });

  const rawDataRows = matrix.slice(detectedHeaderRow + 1);

  // Identify if there is a 'SALDO' column to extract running balances if needed
  const saldoColIdx = headers.findIndex((h) => /^saldo$/i.test(h.trim()));

  const filteredDataRows = rawDataRows.filter((row) => {
    if (!row.some((value) => String(value ?? '').trim() !== '')) return false;
    if (isControlRow(row)) return false;
    return true;
  });

  // If bankCurrentBalance is missing but SALDO column exists, extract from the last movement
  if (saldoColIdx >= 0 && filteredDataRows.length > 0) {
    const lastRow = filteredDataRows[filteredDataRows.length - 1];
    const lastSaldo = parseNumberSafe(lastRow[saldoColIdx]);
    if (lastSaldo !== undefined && metadata.bankCurrentBalance === undefined) {
      metadata.bankCurrentBalance = lastSaldo;
    }

    const firstRow = filteredDataRows[0];
    const firstSaldo = parseNumberSafe(firstRow[saldoColIdx]);
    const firstVal = parseNumberSafe(firstRow.find((_, i) => i !== saldoColIdx && parseNumberSafe(firstRow[i]) !== undefined));
    if (firstSaldo !== undefined && metadata.bankPreviousBalance === undefined) {
      metadata.bankPreviousBalance = firstVal !== undefined ? Number((firstSaldo - firstVal).toFixed(2)) : firstSaldo;
    }
  }

  const rows = filteredDataRows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']))
  );

  return { headers, rows, totalRows: rows.length, detectedHeaderRow, metadata };
}

/**
 * Parse an uploaded file (xlsx, xls, csv) into rows, checking all workbook sheets
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  return parseBuffer(buffer);
}

/**
 * Parse file from ArrayBuffer with multi-sheet intelligence (Movimientos + Resumen)
 */
export function parseBuffer(buffer: ArrayBuffer): ParsedFile {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  // 1. If workbook has multiple sheets, check for 'Resumen' and 'Movimientos'
  let summarySheetName: string | undefined;
  let movementSheetName: string | undefined;

  for (const name of workbook.SheetNames) {
    const lower = name.toLowerCase().trim();
    if (lower === 'resumen' || lower.includes('resumen') || lower.includes('saldo')) {
      summarySheetName = name;
    }
    if (lower === 'movimientos' || lower.includes('movimiento') || lower.includes('extracto') || lower.includes('auxiliar')) {
      movementSheetName = name;
    }
  }

  // Primary movements worksheet
  const targetSheetName = movementSheetName || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[targetSheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  const parsed = parseSheetRows(matrix);

  // If a summary sheet exists, merge its metadata (balances) into parsed metadata
  if (summarySheetName && summarySheetName !== targetSheetName) {
    const summaryWorksheet = workbook.Sheets[summarySheetName];
    const summaryMatrix = XLSX.utils.sheet_to_json<unknown[]>(summaryWorksheet, {
      header: 1,
      defval: '',
      raw: false,
    });
    const summaryMeta = extractMetadataFromMatrix(summaryMatrix);

    parsed.metadata = {
      ...parsed.metadata,
      ...summaryMeta,
      // Priority to explicit summary sheet values
      bankPreviousBalance: summaryMeta.bankPreviousBalance ?? parsed.metadata?.bankPreviousBalance,
      bankCurrentBalance: summaryMeta.bankCurrentBalance ?? parsed.metadata?.bankCurrentBalance,
      bankTotalCredits: summaryMeta.bankTotalCredits ?? parsed.metadata?.bankTotalCredits,
      bankTotalDebits: summaryMeta.bankTotalDebits ?? parsed.metadata?.bankTotalDebits,
    };
  }

  return parsed;
}

export function generateSampleBankStatement(): Blob {
  const data = [
    { Fecha: '01/03/2024', Descripción: 'PAGO CLIENTE JUAN PEREZ', Valor: '350.000', NIT: '79.123.456-7', Referencia: 'REF-001' },
    { Fecha: '02/03/2024', Descripción: 'CONSIGNACION MARIA GOMEZ', Valor: '$1.200.000', NIT: ' 52.987.654 ', Referencia: 'REF-002' },
    { Fecha: '03/03/2024', Descripción: 'PAGO EMPRESA ABC LTDA', Valor: '2.500.000', NIT: '900123456', Referencia: 'FACT-100' },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Extracto');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generateSampleBankStatementWithoutNit(): Blob {
  const data = [
    { Fecha: '01/03/2024', Concepto: 'TRANSFERENCIA PSE NIT 791234567 JUAN PEREZ', Valor: '350.000', Referencia: 'REF-001' },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ExtractoBancario');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generateSampleClientLedger(): Blob {
  const data = [
    { Fecha: '2024-03-01', Comprobante: 'RC-001', Cliente: 'JUAN PEREZ', NIT: '79123456-7', Valor: 350000, Referencia: 'REF-001' },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Agenda');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
