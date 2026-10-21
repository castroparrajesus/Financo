import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { MatchRow, Reconciliation, GroupMatch, ReconciliationStatement, ReconciliationMetadata } from './types';
import { formatCOP, formatDate, formatDateTime } from './format';

const exceptionLabels: Record<string, string> = {
  banco_sin_libro: 'Banco sin libro',
  libro_sin_banco: 'Libro sin banco',
  diferencia_monto: 'Diferencia de monto',
  fecha_fuera_ventana: 'Fecha fuera de ventana',
  posible_duplicado: 'Posible duplicado',
  grupo_con_diferencia: 'Grupo con diferencia',
  no_client: 'Sin cliente',
  no_match: 'Sin pago',
  duplicate: 'Duplicado',
  value_diff: 'Diferencia de valor',
  empty_id: 'ID vacío',
};

export function exportToExcel(
  matches: MatchRow[],
  recon: Reconciliation,
  companyName: string,
  groups: GroupMatch[] = [],
  statement?: ReconciliationStatement,
) {
  const wb = XLSX.utils.book_new();

  const reconciledMatches = matches.filter((m) => m.status === 'reconciled' || m.human_status === 'approved');
  const suggestionMatches = matches.filter((m) => m.status === 'suggestion' && m.human_status === 'pending');
  const exceptionMatches = matches.filter((m) => m.status === 'exception' && m.human_status === 'pending');

  const stmt = statement || recon.statement;
  const meta: ReconciliationMetadata = recon.metadata || {};

  const realCompanyName = meta.companyName || companyName;
  const nit = meta.companyNit || '901883418-1';
  const period = meta.period || 'Enero 2026';
  const account = meta.ledgerAccount || '11100501 Bancolombia';

  const bankEffectiveness = recon.total_bank_rows > 0
    ? Number((((reconciledMatches.length + groups.filter((g) => g.status === 'reconciled').reduce((s, g) => s + g.bankRows.length, 0)) / recon.total_bank_rows) * 100).toFixed(1))
    : recon.auto_percentage;

  const ledgerEffectiveness = recon.total_ledger_rows > 0
    ? Number((((reconciledMatches.length + groups.filter((g) => g.status === 'reconciled').reduce((s, g) => s + g.ledgerRows.length, 0)) / recon.total_ledger_rows) * 100).toFixed(1))
    : 0;

  // 1. HOJA: RESUMEN
  const summaryRows = [
    { 'Concepto': 'Razón Social', 'Valor': realCompanyName },
    { 'Concepto': 'NIT', 'Valor': nit },
    { 'Concepto': 'Cuenta Contable', 'Valor': account },
    { 'Concepto': 'Periodo', 'Valor': period },
    { 'Concepto': 'Fecha de generación', 'Valor': formatDateTime(recon.created_at) },
    { 'Concepto': 'Total movimientos en extracto', 'Valor': recon.total_bank_rows },
    { 'Concepto': 'Total movimientos en libros', 'Valor': recon.total_ledger_rows },
    { 'Concepto': 'Movimientos 1:1 Conciliados', 'Valor': reconciledMatches.length },
    { 'Concepto': 'Grupos n:1 Conciliados', 'Valor': groups.filter((g) => g.status === 'reconciled').length },
    { 'Concepto': 'Sugerencias para revisión humana', 'Valor': suggestionMatches.length },
    { 'Concepto': 'Excepciones pendientes', 'Valor': exceptionMatches.length },
    { 'Concepto': 'Efectividad bancaria', 'Valor': `${bankEffectiveness}%` },
    { 'Concepto': 'Efectividad de libros', 'Valor': `${ledgerEffectiveness}%` },
    { 'Concepto': 'Monto total conciliado', 'Valor': formatCOP(Number(recon.total_amount_reconciled), 2) },
    { 'Concepto': 'Diferencia de apertura (Saldo inicial libros − Saldo anterior banco)', 'Valor': formatCOP(stmt?.openingDifference || 0, 2) },
    { 'Concepto': 'Diferencia final sin explicar (debe ser 0,00)', 'Valor': formatCOP(stmt?.finalDifference || 0, 2) },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  // 2. HOJA: CÉDULA CONTABLE
  const stmtRows = [
    { 'Sección': 'SALDO SEGÚN EXTRACTO BANCARIO', 'Monto': formatCOP(stmt?.bankStatementBalance || 0, 2) },
    { 'Sección': '(+) Depósitos en tránsito (Libro sin banco, ingresos)', 'Monto': formatCOP(stmt?.depositsInTransit || 0, 2) },
    { 'Sección': '(−) Pagos en tránsito (Libro sin banco, egresos)', 'Monto': formatCOP(-(stmt?.paymentsInTransit || 0), 2) },
    { 'Sección': '(=) SALDO EXTRACTO AJUSTADO', 'Monto': formatCOP(stmt?.adjustedBankBalance || 0, 2) },
    { 'Sección': '', 'Monto': '' },
    { 'Sección': 'SALDO SEGÚN LIBROS CONTABLES', 'Monto': formatCOP(stmt?.ledgerBalance || 0, 2) },
    { 'Sección': '(+) Notas crédito no contabilizadas (Banco sin libro, ingresos)', 'Monto': formatCOP(stmt?.unrecordedCreditNotes || 0, 2) },
    { 'Sección': '(−) Notas débito no contabilizadas (Banco sin libro, egresos)', 'Monto': formatCOP(-(stmt?.unrecordedDebitNotes || 0), 2) },
    { 'Sección': '(=) SALDO LIBROS AJUSTADO', 'Monto': formatCOP(stmt?.adjustedLedgerBalance || 0, 2) },
    { 'Sección': '', 'Monto': '' },
    { 'Sección': '(±) DIFERENCIA DE APERTURA (Saldo inicial libros − Saldo anterior banco)', 'Monto': formatCOP(stmt?.openingDifference || 0, 2) },
    { 'Sección': '(=) DIFERENCIA FINAL SIN EXPLICAR (DEBE SER 0,00)', 'Monto': formatCOP(stmt?.finalDifference || 0, 2) },
    { 'Sección': '', 'Monto': '' },
    { 'Sección': 'Movimiento neto del extracto en el periodo', 'Monto': formatCOP(stmt?.statementNetMovement || 0, 2) },
  ];
  const wsStmt = XLSX.utils.json_to_sheet(stmtRows);
  XLSX.utils.book_append_sheet(wb, wsStmt, 'Estado de conciliación');

  // 3. HOJA: CONCILIADOS
  const reconciledRows = reconciledMatches.map((m) => ({
    'ID Fila Banco': m.row_id_bank || '—',
    'ID Fila Agenda': m.row_id_ledger || '—',
    'Comprobante': m.voucher || '—',
    'Tercero': m.ledger_name || m.bank_name || '—',
    'NIT / Cédula': m.ledger_id || m.bank_id || '—',
    'Fecha Banco': m.bank_date ? formatDate(m.bank_date) : '—',
    'Monto Banco': formatCOP(m.bank_amount || 0, 2),
    'Fecha Agenda': m.ledger_date ? formatDate(m.ledger_date) : '—',
    'Monto Agenda': formatCOP(m.ledger_amount || 0, 2),
    'Dif. Monto': formatCOP(m.amount_diff || 0, 2),
    'Dif. Días': m.days_diff ?? 0,
    'Regla Aplicada': m.match_rule || '—',
    'Confianza': `${m.confidence}%`,
  }));
  const wsReconciled = XLSX.utils.json_to_sheet(reconciledRows);
  XLSX.utils.book_append_sheet(wb, wsReconciled, 'Conciliados');

  // 4. HOJA: GRUPOS N:1
  const groupRows: Record<string, unknown>[] = [];
  groups.forEach((g) => {
    g.bankRows.forEach((bRow, idx) => {
      groupRows.push({
        'ID Grupo': g.id,
        'Concepto': g.concept,
        'Tipo Fila': 'Línea Extracto Banco',
        'ID Fila': bRow.rowId,
        'Fecha': formatDate(bRow.date),
        'Descripción': bRow.name,
        'Monto Individual': formatCOP(bRow.amount, 2),
        'Total Grupo Banco': idx === 0 ? formatCOP(g.totalBankAmount, 2) : '',
        'Total Asiento Libro': idx === 0 ? formatCOP(g.totalLedgerAmount, 2) : '',
        'Diferencia': idx === 0 ? formatCOP(g.difference, 2) : '',
      });
    });
    g.ledgerRows.forEach((lRow) => {
      groupRows.push({
        'ID Grupo': g.id,
        'Concepto': g.concept,
        'Tipo Fila': 'Asiento Libro Contable',
        'ID Fila': lRow.rowId,
        'Fecha': formatDate(lRow.date),
        'Descripción': `${lRow.voucher ? lRow.voucher + ' - ' : ''}${lRow.name}`,
        'Monto Individual': formatCOP(lRow.amount, 2),
        'Total Grupo Banco': '',
        'Total Asiento Libro': '',
        'Diferencia': '',
      });
    });
  });
  const wsGroups = XLSX.utils.json_to_sheet(groupRows);
  XLSX.utils.book_append_sheet(wb, wsGroups, 'Grupos');

  // 5. HOJA: PARTIDAS DE INVESTIGACIÓN
  const invItems = stmt?.investigationItems || [];
  const wsInv = XLSX.utils.json_to_sheet(
    invItems.map((inv) => ({
      'ID': inv.id,
      'Origen': inv.source === 'bank' ? 'Extracto Bancario' : 'Libro Contable',
      'Fecha': formatDate(inv.date),
      'Monto': formatCOP(inv.amount, 2),
      'Descripción': inv.description,
      'Referencia / Comprobante': inv.reference || '—',
      'Motivo de Alerta': inv.reason,
      'Criterio': inv.ruleTriggered,
    }))
  );
  XLSX.utils.book_append_sheet(wb, wsInv, 'Partidas Investigación');

  // 6. HOJA: EXCEPCIONES
  const exceptionRows = exceptionMatches.map((m) => ({
    'ID Fila': m.row_id_bank || m.row_id_ledger || '—',
    'Origen': m.bank_amount !== null ? 'Extracto Bancario' : 'Libro Contable',
    'Tipo de Excepción': exceptionLabels[m.exception_type || ''] || m.exception_type || 'Excepción',
    'Tratamiento Sugerido': m.treatment || 'Requiere registro contable',
    'Comprobante': m.voucher || '—',
    'Fecha': formatDate(m.bank_date || m.ledger_date),
    'Monto': formatCOP(m.bank_amount ?? m.ledger_amount ?? 0, 2),
    'Tercero / Concepto': m.bank_name || m.ledger_name || '—',
    'Identificador (NIT)': m.bank_id || m.ledger_id || '—',
    'Referencia': m.bank_reference || m.ledger_reference || '—',
  }));
  const wsExceptions = XLSX.utils.json_to_sheet(exceptionRows);
  XLSX.utils.book_append_sheet(wb, wsExceptions, 'Excepciones');

  const cleanName = realCompanyName.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_');
  XLSX.writeFile(wb, `conciliacion_${cleanName}_${formatDate(recon.created_at.split('T')[0])}.xlsx`);
}

export function exportToPDF(
  matches: MatchRow[],
  recon: Reconciliation,
  companyName: string,
  statement?: ReconciliationStatement,
  groups: GroupMatch[] = []
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const stmt = statement || recon.statement;
  const activeGroups = groups.length > 0 ? groups : (recon.groups || []);
  const meta: ReconciliationMetadata = recon.metadata || {};

  const realCompanyName = meta.companyName || companyName || 'INGENIEROS CONSULTORES Y CONSTRUCTORES ICC SAS';
  const nit = meta.companyNit || '901883418-1';
  const period = meta.period || 'Enero 2026';
  const account = meta.ledgerAccount || '11100501 Bancolombia';
  const validation = stmt?.validationReport;

  // Header Banner
  doc.setFillColor(15, 44, 89);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CÉDULA DE CONCILIACIÓN BANCARIA', 14, 12);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${realCompanyName}  •  NIT: ${nit}`, 14, 19);
  doc.text(`Cuenta: ${account}  •  Periodo: ${period}  •  Generado: ${formatDateTime(recon.created_at)}`, 14, 26);

  let y = 38;

  // VALIDATION WARNING BANNER IF FAILED (Problem #7)
  if (validation && !validation.isValid) {
    doc.setFillColor(254, 226, 226);
    doc.rect(14, y, pageWidth - 28, 18, 'F');
    doc.setDrawColor(220, 38, 38);
    doc.rect(14, y, pageWidth - 28, 18, 'S');
    doc.setTextColor(185, 28, 28);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORME NO CUADRADO — ERRORES BLOQUEANTES DETECTADOS:', 18, y + 5);
    doc.setFont('helvetica', 'normal');
    validation.errors.slice(0, 2).forEach((err, idx) => {
      doc.text(`• ${err}`, 18, y + 10 + idx * 4);
    });
    y += 24;
  }

  // 1. CÉDULA CONTABLE (Problem #4)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Estado de Conciliación Bancaria', 14, y);
  y += 5;

  const cedulaLines: Array<{ label: string; amount: string; isBold?: boolean; isHighlight?: boolean }> = [
    { label: 'Saldo según extracto bancario', amount: formatCOP(stmt?.bankStatementBalance || 0, 2) },
    { label: '(+) Depósitos en tránsito (ingresos en libros no en banco)', amount: formatCOP(stmt?.depositsInTransit || 0, 2) },
    { label: '(−) Pagos en tránsito (egresos en libros no en banco)', amount: `(${formatCOP(stmt?.paymentsInTransit || 0, 2).replace(/[$\s]/g, '')})` },
    { label: '(=) Saldo extracto ajustado', amount: formatCOP(stmt?.adjustedBankBalance || 0, 2), isBold: true, isHighlight: true },
    { label: 'Saldo según libros contables (Auxiliar 1110)', amount: formatCOP(stmt?.ledgerBalance || 0, 2) },
    { label: '(+) Notas crédito no contabilizadas (ingresos banco no en libros)', amount: formatCOP(stmt?.unrecordedCreditNotes || 0, 2) },
    { label: '(−) Notas débito no contabilizadas (egresos banco no en libros)', amount: `(${formatCOP(stmt?.unrecordedDebitNotes || 0, 2).replace(/[$\s]/g, '')})` },
    { label: '(=) Saldo libros ajustado', amount: formatCOP(stmt?.adjustedLedgerBalance || 0, 2), isBold: true, isHighlight: true },
    { label: '(±) Diferencia de apertura (Saldo inicial libros − Saldo anterior banco)', amount: formatCOP(stmt?.openingDifference || 0, 2), isBold: true },
    { label: 'DIFERENCIA FINAL SIN EXPLICAR (DEBE SER 0,00)', amount: formatCOP(stmt?.finalDifference || 0, 2), isBold: true, isHighlight: true },
  ];

  doc.setFontSize(8);
  cedulaLines.forEach((item) => {
    if (item.isHighlight) {
      doc.setFillColor(243, 244, 246);
      doc.rect(14, y - 3.5, pageWidth - 28, 5, 'F');
    }
    doc.setFont('helvetica', item.isBold ? 'bold' : 'normal');
    doc.text(item.label, 16, y);
    doc.text(item.amount, pageWidth - 16, y, { align: 'right' });
    y += 5;
  });

  y += 3;

  // 2. MÉTRICAS Y EFECTIVIDAD (Problem #10)
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Métricas de Efectividad y Resultados de Cruce', 14, y);
  y += 5;

  const recCount = matches.filter((m) => m.row_id_bank && m.row_id_ledger && (m.status === 'reconciled' || m.human_status === 'approved')).length;
  const groupBankRows = activeGroups.filter((g) => g.status === 'reconciled').reduce((s, g) => s + g.bankRows.length, 0);
  const totalBankReconciled = recCount + groupBankRows;
  const bankEffectiveness = recon.total_bank_rows > 0 ? ((totalBankReconciled / recon.total_bank_rows) * 100).toFixed(1) : '0';
  const totalLedgerReconciled = recCount + activeGroups.filter((g) => g.status === 'reconciled').reduce((s, g) => s + g.ledgerRows.length, 0);
  const ledgerEffectiveness = recon.total_ledger_rows > 0 ? ((totalLedgerReconciled / recon.total_ledger_rows) * 100).toFixed(1) : '0';

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`• Pareos 1:1 automáticos: ${recCount} movimientos conciliados`, 16, y);
  y += 4.5;
  doc.text(`• Grupos n:1 consolidados: ${activeGroups.length} grupos (${groupBankRows} líneas del banco: 4x1000 e Intereses)`, 16, y);
  y += 4.5;
  doc.text(`• Efectividad del Extracto Bancario: ${bankEffectiveness}% (${totalBankReconciled} de ${recon.total_bank_rows} movimientos)`, 16, y);
  y += 4.5;
  doc.text(`• Efectividad de Libros Contables: ${ledgerEffectiveness}% (${totalLedgerReconciled} de ${recon.total_ledger_rows} registros)`, 16, y);
  y += 6;

  // 3. PARTIDAS DE INVESTIGACIÓN (Problem #5)
  const invItems = stmt?.investigationItems || [];
  if (invItems.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text(`3. Partidas de Investigación y Alertas de Auditoría (${invItems.length} partidas)`, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 5;

    doc.setFontSize(7.5);
    invItems.slice(0, 5).forEach((inv) => {
      doc.setFillColor(254, 243, 199);
      doc.rect(14, y - 3, pageWidth - 28, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text(`[${inv.source.toUpperCase()}] ${inv.description} — ${formatCOP(inv.amount, 2)}`, 16, y);
      doc.setFont('helvetica', 'normal');
      doc.text(inv.reason, 16, y + 3.8);
      y += 11;
    });
  }

  // 4. PARTIDAS EN TRÁNSITO
  const unassignedLedger = matches.filter((m) => m.exception_type === 'libro_sin_banco');
  if (unassignedLedger.length > 0 && y < 240) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`4. Partidas del Libro en Tránsito (${unassignedLedger.length} registros)`, 14, y);
    y += 5;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    unassignedLedger.slice(0, 5).forEach((l) => {
      const desc = `${formatDate(l.ledger_date)} | ${l.voucher || ''} | ${l.ledger_name || ''} | ${formatCOP(l.ledger_amount || 0, 2)}`;
      doc.text(`• ${desc}`, 16, y);
      y += 4.5;
    });
  }

  // Footer Signatures
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(180, 180, 180);
  doc.line(20, 275, 75, 275);
  doc.line(125, 275, 180, 275);
  doc.text('Elaboró: Contador Público', 30, 280);
  doc.text('Revisó: Revisor Fiscal / Auditor', 133, 280);

  const cleanName = realCompanyName.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_');
  doc.save(`cedula_conciliacion_${cleanName}_${formatDate(recon.created_at.split('T')[0])}.pdf`);
}

/**
 * Genera la plantilla de asientos contables de ajuste para importar en Siigo / World Office / Helisa
 * a partir de las excepciones bancarias pendientes de registro (GMF 4x1000, comisiones, compras tarjeta, retiros).
 */
export function exportAccountingVouchers(
  matches: MatchRow[],
  recon: Reconciliation,
  companyName: string
) {
  const wb = XLSX.utils.book_new();
  const meta: ReconciliationMetadata = recon.metadata || {};
  const realCompanyName = meta.companyName || companyName;
  const nit = meta.companyNit || '901883418-1';
  const period = meta.period || 'Enero 2026';
  const bankAccount = meta.ledgerAccount?.split(' ')[0] || '11100501';
  const bankAccountName = meta.ledgerAccount || 'Bancolombia Cuenta Corriente';

  // Filtrar partidas bancarias que no están en el libro contable
  const bankExceptions = matches.filter(
    (m) =>
      (m.exception_type === 'banco_sin_libro' || (m.status === 'exception' && m.bank_amount !== null && m.ledger_amount === null)) &&
      m.bank_amount !== null
  );

  const getPucClassification = (concept: string, amount: number) => {
    const upper = (concept || '').toUpperCase();
    const isIncome = amount > 0;

    if (upper.includes('4X1000') || upper.includes('GMF') || upper.includes('GRAVAMEN')) {
      return {
        expenseCode: '511595',
        expenseName: 'Gravamen a los Movimientos Financieros (4x1000)',
        terceroNit: '800197268', // DIAN
        terceroNombre: 'DIAN DIRECCION DE IMPUESTOS Y ADUANAS NACIONALES',
        docType: 'NC', // Nota de Contabilidad
      };
    }
    if (upper.includes('INTERES') || upper.includes('RENDIMIENTO') || isIncome) {
      return {
        expenseCode: '421005',
        expenseName: 'Rendimientos Financieros de Depósitos Bancarios',
        terceroNit: '890903938', // Bancolombia / Banco
        terceroNombre: 'ENTIDAD BANCARIA',
        docType: 'NC',
      };
    }
    if (upper.includes('CUOTA DE MANEJO') || upper.includes('COMISION') || upper.includes('IVA COMISION')) {
      return {
        expenseCode: '530515',
        expenseName: 'Gastos y Comisiones Bancarias',
        terceroNit: '890903938',
        terceroNombre: 'ENTIDAD BANCARIA',
        docType: 'NC',
      };
    }
    if (upper.includes('EDS') || upper.includes('TERPEL') || upper.includes('TEXACO') || upper.includes('BIOMAX') || upper.includes('PRIMAX') || upper.includes('GASOLINA')) {
      return {
        expenseCode: '513535',
        expenseName: 'Servicios - Combustibles y Lubricantes',
        terceroNit: '900000000',
        terceroNombre: concept,
        docType: 'CE', // Comprobante de Egreso
      };
    }
    if (upper.includes('RETIRO CAJERO') || upper.includes('RETIRO EFECTIVO')) {
      return {
        expenseCode: '136505',
        expenseName: 'Cuentas por Cobrar a Socios / Anticipos para Gastos',
        terceroNit: nit,
        terceroNombre: 'RETIRO CAJERO POR LEGALIZAR',
        docType: 'CE',
      };
    }
    if (upper.includes('GOOGLE') || upper.includes('POPPO') || upper.includes('MICO') || upper.includes('FACEBOOK') || upper.includes('SOFTWARE')) {
      return {
        expenseCode: '513550',
        expenseName: 'Servicios Informáticos y Licencias Digitales',
        terceroNit: '900000000',
        terceroNombre: concept,
        docType: 'CE',
      };
    }
    if (upper.includes('SUPERTIEND') || upper.includes('EXITO') || upper.includes('OLIMPICA') || upper.includes('JUMBO') || upper.includes('HOMECENTER') || upper.includes('MAKRO')) {
      return {
        expenseCode: '519525',
        expenseName: 'Elementos de Aseo, Cafetería y Suministros',
        terceroNit: '900000000',
        terceroNombre: concept,
        docType: 'CE',
      };
    }

    return {
      expenseCode: '519595',
      expenseName: 'Otros Gastos Operacionales Diversos',
      terceroNit: '900000000',
      terceroNombre: concept,
      docType: 'CE',
    };
  };

  // 1. Hoja Detallada de Asientos de Partida Doble
  const doubleEntryRows: Record<string, unknown>[] = [];
  let consecutivo = 1;

  bankExceptions.forEach((m) => {
    const rawVal = m.bank_amount ?? 0;
    const absVal = Math.abs(rawVal);
    const isIncome = rawVal > 0;
    const classification = getPucClassification(m.bank_name || '', rawVal);
    const dateFormatted = m.bank_date ? formatDate(m.bank_date) : '';

    if (isIncome) {
      // Rendimiento: Débito a Banco, Crédito a Ingresos 421005
      doubleEntryRows.push({
        'Comprobante': `NC-${String(consecutivo).padStart(3, '0')}`,
        'Fecha': dateFormatted,
        'Cuenta Contable': bankAccount,
        'Nombre Cuenta': bankAccountName,
        'NIT Tercero': classification.terceroNit,
        'Nombre Tercero': classification.terceroNombre,
        'Concepto': m.bank_name || 'Rendimiento bancario',
        'Débito': absVal,
        'Crédito': 0,
        'Referencia Banco': m.bank_reference || m.bank_id || '',
      });
      doubleEntryRows.push({
        'Comprobante': `NC-${String(consecutivo).padStart(3, '0')}`,
        'Fecha': dateFormatted,
        'Cuenta Contable': classification.expenseCode,
        'Nombre Cuenta': classification.expenseName,
        'NIT Tercero': classification.terceroNit,
        'Nombre Tercero': classification.terceroNombre,
        'Concepto': m.bank_name || 'Rendimiento bancario',
        'Débito': 0,
        'Crédito': absVal,
        'Referencia Banco': m.bank_reference || m.bank_id || '',
      });
    } else {
      // Egreso / Gasto: Débito a Cuenta de Gasto, Crédito a Banco
      doubleEntryRows.push({
        'Comprobante': `${classification.docType}-${String(consecutivo).padStart(3, '0')}`,
        'Fecha': dateFormatted,
        'Cuenta Contable': classification.expenseCode,
        'Nombre Cuenta': classification.expenseName,
        'NIT Tercero': classification.terceroNit,
        'Nombre Tercero': classification.terceroNombre,
        'Concepto': m.bank_name || 'Gasto o pago bancario',
        'Débito': absVal,
        'Crédito': 0,
        'Referencia Banco': m.bank_reference || m.bank_id || '',
      });
      doubleEntryRows.push({
        'Comprobante': `${classification.docType}-${String(consecutivo).padStart(3, '0')}`,
        'Fecha': dateFormatted,
        'Cuenta Contable': bankAccount,
        'Nombre Cuenta': bankAccountName,
        'NIT Tercero': classification.terceroNit,
        'Nombre Tercero': classification.terceroNombre,
        'Concepto': m.bank_name || 'Gasto o pago bancario',
        'Débito': 0,
        'Crédito': absVal,
        'Referencia Banco': m.bank_reference || m.bank_id || '',
      });
    }
    consecutivo++;
  });

  const wsDouble = XLSX.utils.json_to_sheet(doubleEntryRows);
  XLSX.utils.book_append_sheet(wb, wsDouble, 'Asientos_Partida_Doble');

  // 2. Hoja Formato Plano Siigo / World Office / ERP
  const siigoRows = doubleEntryRows.map((r, idx) => ({
    'Tipo_Comprobante': (r['Comprobante'] as string).split('-')[0],
    'Consecutivo': (r['Comprobante'] as string).split('-')[1],
    'Secuencia': idx + 1,
    'Fecha': r['Fecha'],
    'Cuenta_Contable': r['Cuenta Contable'],
    'Identificacion_Tercero': r['NIT Tercero'],
    'Descripcion_Movimiento': r['Concepto'],
    'Valor_Debito': r['Débito'],
    'Valor_Credito': r['Crédito'],
    'Documento_Referencia': r['Referencia Banco'],
    'Base_Retencion': 0,
  }));

  const wsSiigo = XLSX.utils.json_to_sheet(siigoRows);
  XLSX.utils.book_append_sheet(wb, wsSiigo, 'Formato_Plano_Siigo_ERP');

  const cleanName = realCompanyName.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_');
  XLSX.writeFile(wb, `asientos_ajuste_contable_${cleanName}_${period}.xlsx`);
}
