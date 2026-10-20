import { NormalizedRow, ReconciliationResult, ValidationCheck, ValidationReport } from '../types';

/**
 * Función independiente y reutilizable de validación contable previa a la emisión de la Cédula Contable.
 * Aplica criterios NIIF / PCGA Colombia:
 * 1. Conciliación de movimiento bancario: saldo_anterior + Σ(movimientos) = saldo_final (tolerancia 0,01)
 * 2. Conciliación de movimiento de libros: saldo_inicial + Σ(débitos − créditos) = saldo_final (tolerancia 0,01)
 * 3. Identidad de cuadre: diferencia final sin explicar = 0,00 tras considerar apertura
 * 4. Conservación de estados: cada fila queda exactamente en un estado (1:1, n:1 o excepción) sin duplicados ni huérfanos
 */
export function validar_conciliacion(
  result: Pick<ReconciliationResult, 'matches' | 'groups' | 'statement' | 'metadata'>,
  bankRows: NormalizedRow[],
  ledgerRows: NormalizedRow[]
): ValidationReport {
  const checks: ValidationCheck[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const meta = result.metadata || {};
  const stmt = result.statement;

  // 1. Conciliación de movimiento del banco
  const bankPrev = meta.bankPreviousBalance ?? 0;
  const bankFinal = stmt?.bankStatementBalance ?? meta.bankCurrentBalance ?? 0;
  const bankSumMovements = Number(bankRows.reduce((acc, r) => acc + (r.amount || 0), 0).toFixed(2));
  const bankObtainedFinal = Number((bankPrev + bankSumMovements).toFixed(2));
  const bankOk = Math.abs(bankFinal - bankObtainedFinal) <= 0.01;

  checks.push({
    name: 'conciliacion_movimiento_banco',
    description: 'Movimiento del extracto bancario: saldo anterior + Σ(movimientos) = saldo final',
    expected: Number(bankFinal.toFixed(2)),
    obtained: bankObtainedFinal,
    ok: bankOk,
    message: bankOk
      ? `Extracto bancario verificado: Saldo anterior ($${bankPrev}) + Movimientos ($${bankSumMovements}) = Saldo final ($${bankFinal})`
      : `Inconsistencia en extracto: Saldo anterior ($${bankPrev}) + Movimientos ($${bankSumMovements}) da $${bankObtainedFinal}, pero el saldo final del extracto reporta $${bankFinal} (diferencia: $${Number((bankFinal - bankObtainedFinal).toFixed(2))})`,
  });

  if (!bankOk) {
    errors.push(`Fallo en extracto bancario: Saldo esperado $${bankFinal} vs obtenido $${bankObtainedFinal}`);
  }

  // 2. Conciliación de movimiento del libro auxiliar
  const ledgerInit = meta.ledgerInitialBalance ?? 0;
  const ledgerFinal = stmt?.ledgerBalance ?? meta.ledgerFinalBalance ?? 0;
  const ledgerSumMovements = Number(
    ledgerRows.reduce((acc, r) => {
      if (r.debit !== undefined && r.credit !== undefined) {
        return acc + (r.debit - r.credit);
      }
      return acc + (r.amount || 0);
    }, 0).toFixed(2)
  );
  const ledgerObtainedFinal = Number((ledgerInit + ledgerSumMovements).toFixed(2));
  const ledgerOk = Math.abs(ledgerFinal - ledgerObtainedFinal) <= 0.01;

  checks.push({
    name: 'conciliacion_movimiento_libro',
    description: 'Movimiento de libros contables: saldo inicial + Σ(débitos − créditos) = saldo final',
    expected: Number(ledgerFinal.toFixed(2)),
    obtained: ledgerObtainedFinal,
    ok: ledgerOk,
    message: ledgerOk
      ? `Libro contable verificado: Saldo inicial ($${ledgerInit}) + Movimientos netos ($${ledgerSumMovements}) = Saldo final ($${ledgerFinal})`
      : `Inconsistencia en libros: Saldo inicial ($${ledgerInit}) + Movimientos ($${ledgerSumMovements}) da $${ledgerObtainedFinal}, pero el saldo final en libros reporta $${ledgerFinal} (diferencia: $${Number((ledgerFinal - ledgerObtainedFinal).toFixed(2))})`,
  });

  if (!ledgerOk) {
    errors.push(`Fallo en libro auxiliar: Saldo esperado $${ledgerFinal} vs obtenido $${ledgerObtainedFinal}`);
  }

  // 3. Identidad de cuadre: diferencia final = 0 tras considerar la apertura
  const finalDiff = Number((stmt?.finalDifference ?? 0).toFixed(2));
  const cuadreOk = Math.abs(finalDiff) <= 0.01;

  checks.push({
    name: 'identidad_cuadre',
    description: 'Identidad contable de cuadre: diferencia final sin explicar debe ser 0,00',
    expected: 0.0,
    obtained: finalDiff,
    ok: cuadreOk,
    message: cuadreOk
      ? 'Conciliación cuadrada al centavo ($0,00 de diferencia sin explicar)'
      : `Conciliación descuadrada: existe una diferencia final sin explicar de $${finalDiff}`,
  });

  if (!cuadreOk) {
    errors.push(`Identidad de cuadre no satisfecha: diferencia final sin explicar es $${finalDiff} (debe ser $0,00)`);
  }

  // 4. Conservación de estados de cada movimiento (sin duplicados ni huérfanos)
  const bankRowIds = new Set(bankRows.map((r) => r.rowId));
  const ledgerRowIds = new Set(ledgerRows.map((r) => r.rowId));

  const accountedBank = new Map<string, number>();
  const accountedLedger = new Map<string, number>();

  // 1:1 matches
  for (const m of result.matches) {
    if (m.rowIdBank) {
      accountedBank.set(m.rowIdBank, (accountedBank.get(m.rowIdBank) || 0) + 1);
    }
    if (m.rowIdLedger) {
      accountedLedger.set(m.rowIdLedger, (accountedLedger.get(m.rowIdLedger) || 0) + 1);
    }
  }

  // n:1 groups
  for (const g of result.groups) {
    for (const b of g.bankRows) {
      accountedBank.set(b.rowId, (accountedBank.get(b.rowId) || 0) + 1);
    }
    for (const l of g.ledgerRows) {
      accountedLedger.set(l.rowId, (accountedLedger.get(l.rowId) || 0) + 1);
    }
  }

  const bankDuplicates = Array.from(accountedBank.entries()).filter(([, c]) => c > 1).map(([id]) => id);
  const ledgerDuplicates = Array.from(accountedLedger.entries()).filter(([, c]) => c > 1).map(([id]) => id);

  const bankMissing = Array.from(bankRowIds).filter((id) => !accountedBank.has(id));
  const ledgerMissing = Array.from(ledgerRowIds).filter((id) => !accountedLedger.has(id));

  const conservationOk =
    bankDuplicates.length === 0 &&
    ledgerDuplicates.length === 0 &&
    bankMissing.length === 0 &&
    ledgerMissing.length === 0 &&
    accountedBank.size === bankRows.length &&
    accountedLedger.size === ledgerRows.length;

  checks.push({
    name: 'conservacion_movimientos',
    description: 'Conservación biyectiva: cada movimiento queda en exactamente un estado sin duplicados ni huérfanos',
    expected: `${bankRows.length} banco / ${ledgerRows.length} libro`,
    obtained: `${accountedBank.size} banco / ${accountedLedger.size} libro`,
    ok: conservationOk,
    message: conservationOk
      ? `Totalidad de movimientos conservada (${bankRows.length} banco, ${ledgerRows.length} libros)`
      : `Fallo de conservación: ${bankMissing.length} banco faltantes, ${ledgerMissing.length} libro faltantes, ${bankDuplicates.length + ledgerDuplicates.length} duplicados`,
  });

  if (!conservationOk) {
    errors.push(
      `Fallo de conservación de filas: Banco faltantes [${bankMissing.join(', ')}], Libro faltantes [${ledgerMissing.join(', ')}]`
    );
  }

  return {
    isValid: errors.length === 0,
    checks,
    errors,
    warnings,
  };
}
