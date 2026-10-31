export type BankSlug = 'bancolombia' | 'davivienda' | 'bogota' | 'generico';

export interface BankTokenRule {
  dateTokens: string[];
  descriptionTokens: string[];
  amountTokens: string[];
  referenceTokens: string[];
  balanceTokens: string[];
  bankNits?: string[];
  bankAliases?: string[];
}

export interface HeaderDetectionResult {
  headerRowIndex: number;
  detectedBank: BankSlug;
  bankName: string;
  detectedNit?: string;
  confidenceScore: number;
  mappedColumns: {
    dateColumnIndex: number;
    descriptionColumnIndex: number;
    amountColumnIndex: number;
    referenceColumnIndex: number;
    balanceColumnIndex?: number;
  };
  headers: string[];
}

export const BANK_OFFICIAL_DATA: Record<Exclude<BankSlug, 'generico'>, { name: string; nit: string }> = {
  bancolombia: {
    name: 'Bancolombia S.A.',
    nit: '890.903.938-8',
  },
  davivienda: {
    name: 'Banco Davivienda S.A.',
    nit: '860.034.313-7',
  },
  bogota: {
    name: 'Banco de Bogotá S.A.',
    nit: '860.002.964-4',
  },
};

export const NORMALIZED_RULES: Record<BankSlug, BankTokenRule> = {
  bancolombia: {
    bankNits: ['890903938', '8909039388'],
    bankAliases: ['bancolombia', 'sucursal virtual empresas', 'bancolombia s a'],
    dateTokens: ['fecha', 'fec', 'fecha transaccion', 'fecha operacion', 'fec operacion'],
    descriptionTokens: ['descripcion operacion', 'descripcion', 'concepto', 'movimiento', 'detalle'],
    amountTokens: ['valor movimiento', 'vr movimiento', 'valor', 'monto', 'importe'],
    referenceTokens: ['documento', 'doc', 'referencia', 'ref', 'num documento', 'no documento'],
    balanceTokens: ['saldo'],
  },
  davivienda: {
    bankNits: ['860034313', '8600343137'],
    bankAliases: ['davivienda', 'banco davivienda', 'portal empresarial davivienda'],
    dateTokens: ['fec transaccion', 'fec. transaccion', 'fecha transaccion', 'fecha operacion', 'fecha'],
    descriptionTokens: ['concepto / detalle', 'concepto / detalle', 'concepto', 'detalle', 'descripcion'],
    amountTokens: ['monto', 'valor', 'importe', 'debito', 'credito'],
    referenceTokens: ['no. comprobante', 'no comprobante', 'num comprobante', 'comprobante', 'referencia', 'ref', 'documento'],
    balanceTokens: ['saldo final', 'saldo disponible', 'saldo'],
  },
  bogota: {
    bankNits: ['860002964', '8600029644'],
    bankAliases: ['banco de bogota', 'banco de bogota s a', 'grupo aval', 'banco de bogota grupo aval'],
    dateTokens: ['fecha operacion', 'fecha movimiento', 'fec operacion', 'fecha'],
    descriptionTokens: ['detalle de la transaccion', 'detalle de la transaccion', 'detalle', 'descripcion', 'concepto'],
    amountTokens: ['valor', 'monto', 'importe', 'valor movimiento'],
    referenceTokens: ['referencia', 'ref', 'documento', 'no. documento', 'no documento', 'comprobante'],
    balanceTokens: ['saldo disponible', 'saldo'],
  },
  generico: {
    dateTokens: ['fecha', 'fec', 'date', 'fecha operacion', 'fecha transaccion'],
    descriptionTokens: ['descripcion', 'concepto', 'detalle', 'movimiento', 'beneficiario', 'tercero'],
    amountTokens: ['valor', 'monto', 'importe', 'debito', 'credito', 'total'],
    referenceTokens: ['documento', 'referencia', 'ref', 'doc', 'comprobante', 'num comprobante'],
    balanceTokens: ['saldo', 'saldo final'],
  },
};

/**
 * Normaliza un texto removiendo acentos, puntuación y espacios extras
 */
export function normalizeToken(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae sólo los dígitos de un texto (para comparación de NIT)
 */
export function extractDigits(value: unknown): string {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
}

/**
 * Escanea las primeras filas (membrete) buscando el NIT o nombre del banco emisor
 */
export function detectBankFromMembrete(
  matrix: unknown[][],
  maxHeaderScan: number = 20
): { bank: BankSlug; detectedNit?: string; rawName?: string } {
  const scanLimit = Math.min(matrix.length, maxHeaderScan);

  for (let r = 0; r < scanLimit; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;

    const rowText = row.map((c) => String(c ?? '')).join(' ');
    const rowNormalized = normalizeToken(rowText);
    const rowDigits = extractDigits(rowText);

    // 1. Detección por NIT específico de la entidad bancaria en membrete
    if (rowDigits.includes('890903938')) {
      return { bank: 'bancolombia', detectedNit: '890.903.938-8', rawName: 'Bancolombia S.A.' };
    }
    if (rowDigits.includes('860034313')) {
      return { bank: 'davivienda', detectedNit: '860.034.313-7', rawName: 'Banco Davivienda S.A.' };
    }
    if (rowDigits.includes('860002964')) {
      return { bank: 'bogota', detectedNit: '860.002.964-3', rawName: 'Banco de Bogotá S.A.' };
    }

    // 2. Detección por alias o razón social en membrete
    if (NORMALIZED_RULES.bancolombia.bankAliases?.some((alias) => rowNormalized.includes(alias))) {
      return { bank: 'bancolombia', detectedNit: '890.903.938-8', rawName: 'Bancolombia S.A.' };
    }
    if (NORMALIZED_RULES.davivienda.bankAliases?.some((alias) => rowNormalized.includes(alias))) {
      return { bank: 'davivienda', detectedNit: '860.034.313-7', rawName: 'Banco Davivienda S.A.' };
    }
    if (NORMALIZED_RULES.bogota.bankAliases?.some((alias) => rowNormalized.includes(alias))) {
      return { bank: 'bogota', detectedNit: '860.002.964-3', rawName: 'Banco de Bogotá S.A.' };
    }
  }

  return { bank: 'generico' };
}

/**
 * Detecta dinámicamente la fila de cabecera en una matriz de extracto bancario.
 * Utiliza concurrencia de columnas canónicas (Fecha, Descripción, Valor, Referencia)
 * y descarta filas informativas de saldos y metadatos del membrete.
 */
export function detectHeaderRow(rawMatrix: unknown[][], maxScanRows: number = 35): HeaderDetectionResult {
  if (!rawMatrix || rawMatrix.length === 0) {
    throw new Error('La matriz del archivo bancario está vacía.');
  }

  // 1. Detectar banco en membrete
  const bankInfo = detectBankFromMembrete(rawMatrix, Math.min(rawMatrix.length, 25));
  const bankSlug = bankInfo.bank;
  const specificRules = NORMALIZED_RULES[bankSlug];
  const generalRules = NORMALIZED_RULES.generico;

  // Unir tokens específicos con generales priorizando los del banco
  const dateTokens = Array.from(new Set([...specificRules.dateTokens, ...generalRules.dateTokens]));
  const descTokens = Array.from(new Set([...specificRules.descriptionTokens, ...generalRules.descriptionTokens]));
  const amountTokens = Array.from(new Set([...specificRules.amountTokens, ...generalRules.amountTokens]));
  const refTokens = Array.from(new Set([...specificRules.referenceTokens, ...generalRules.referenceTokens]));
  const balTokens = Array.from(new Set([...specificRules.balanceTokens, ...generalRules.balanceTokens]));

  const scanLimit = Math.min(rawMatrix.length, maxScanRows);
  let bestRowIndex = -1;
  let highestScore = 0;
  let bestMapping = {
    dateColumnIndex: -1,
    descriptionColumnIndex: -1,
    amountColumnIndex: -1,
    referenceColumnIndex: -1,
    balanceColumnIndex: -1,
  };
  let bestHeaders: string[] = [];

  for (let r = 0; r < scanLimit; r++) {
    const row = rawMatrix[r];
    if (!Array.isArray(row) || row.length < 3) continue;

    // Normalizar celdas
    const normalizedCells = row.map(normalizeToken);

    // Descartar si toda la fila parece ser una línea informativa simple (ej: "Cuenta Corriente: 123-456")
    const nonEmpties = normalizedCells.filter(Boolean);
    if (nonEmpties.length < 3) continue;

    let dateCol = -1;
    let descCol = -1;
    let amountCol = -1;
    let refCol = -1;
    let balCol = -1;

    normalizedCells.forEach((cellText, colIdx) => {
      if (!cellText) return;

      // Evaluar Fecha
      if (dateCol === -1 && dateTokens.some((t) => cellText === t || cellText.startsWith(t))) {
        dateCol = colIdx;
        return;
      }

      // Evaluar Descripción / Concepto
      if (descCol === -1 && descTokens.some((t) => cellText === t || cellText.includes(t))) {
        descCol = colIdx;
        return;
      }

      // Evaluar Valor / Monto / Importe
      if (amountCol === -1 && amountTokens.some((t) => cellText === t || cellText.includes(t))) {
        amountCol = colIdx;
        return;
      }

      // Evaluar Documento / Referencia
      if (refCol === -1 && refTokens.some((t) => cellText === t || cellText.startsWith(t))) {
        refCol = colIdx;
        return;
      }

      // Evaluar Saldo
      if (balCol === -1 && balTokens.some((t) => cellText === t || cellText.startsWith(t))) {
        balCol = colIdx;
      }
    });

    // Puntuación de concurrencia:
    // Fecha (25) + Descripción (25) + Valor (25) + Referencia (25) + Saldo (15)
    let score = 0;
    if (dateCol !== -1) score += 25;
    if (descCol !== -1) score += 25;
    if (amountCol !== -1) score += 25;
    if (refCol !== -1) score += 25;
    if (balCol !== -1) score += 15;

    // Bono si las columnas están bien distribuidas (al menos 3 columnas distintas)
    const distinctCols = new Set([dateCol, descCol, amountCol, refCol].filter((idx) => idx !== -1));
    if (distinctCols.size >= 3) {
      score += 10;
    }

    // Condición sine qua non: Fecha y Valor deben estar presentes, y al menos Descripción o Referencia
    const hasCoreRequirements = dateCol !== -1 && amountCol !== -1 && (descCol !== -1 || refCol !== -1);

    if (hasCoreRequirements && score > highestScore) {
      highestScore = score;
      bestRowIndex = r;
      bestMapping = {
        dateColumnIndex: dateCol,
        descriptionColumnIndex: descCol,
        amountColumnIndex: amountCol,
        referenceColumnIndex: refCol,
        balanceColumnIndex: balCol,
      };
      bestHeaders = row.map((cell, idx) => {
        const val = cell !== null && cell !== undefined ? String(cell).trim() : '';
        return val || `Columna ${idx + 1}`;
      });
    }
  }

  if (bestRowIndex === -1 || highestScore < 60) {
    throw new Error(
      `No se pudo identificar la fila de cabecera bancaria en las primeras ${scanLimit} filas del archivo. Asegúrese de que el extracto contenga encabezados para Fecha, Descripción y Valor.`
    );
  }

  const bankName =
    bankSlug !== 'generico'
      ? BANK_OFFICIAL_DATA[bankSlug].name
      : bankInfo.rawName || 'Extracto Bancario General';

  return {
    headerRowIndex: bestRowIndex,
    detectedBank: bankSlug,
    bankName,
    detectedNit: bankInfo.detectedNit,
    confidenceScore: highestScore,
    mappedColumns: bestMapping,
    headers: bestHeaders,
  };
}
