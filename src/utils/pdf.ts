import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface HeadTotal {
  head: string
  kind: string
  amount: number
  count: number
}

/** Shared CSV download (Excel-compatible). Pass already-filtered rows. */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const esc = (v: string | number): string => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  };
  const lines = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

const fmt = (v: unknown): string => (Number(v) || 0).toLocaleString('en-IN')

function addLetterhead(
  doc: jsPDF,
  schoolName: string,
  title: string,
  meta: string,
): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(schoolName, 105, 14, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.text(title, 105, 21, { align: 'center' })
  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.text(meta, 105, 26, { align: 'center' })
  doc.setTextColor(0)
  return 30
}

function addSignatures(doc: jsPDF, y: number): void {
  const next = Math.max(y + 18, (doc.internal.pageSize.getHeight() as number) - 30)
  doc.setFontSize(9)
  doc.text('Prepared by & Date', 20, next)
  doc.text('Checked by & Date', 85, next)
  doc.text('Approved by & Date', 150, next)
  doc.line(14, next - 5, 70, next - 5)
  doc.line(79, next - 5, 135, next - 5)
  doc.line(144, next - 5, 196, next - 5)
}

function addFooters(doc: jsPDF): void {
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`Page ${i} of ${pages}`, 196, 290, { align: 'right' })
    doc.setTextColor(0)
  }
}

// ---------- 1. Accounts report (weekly / monthly / yearly / full) ----------
export function accountsReportPdf(opts: {
  schoolName: string
  period: string
  printedOn: string
  opening: number
  totalIn: number
  totalOut: number
  closing: number
  count: number
  incomeHeads: HeadTotal[]
  expenseHeads: HeadTotal[]
}): void {
  const doc = new jsPDF()
  const startY = addLetterhead(
    doc,
    opts.schoolName,
    'Income & Expense Statement',
    `Period: ${opts.period}  |  Printed: ${opts.printedOn}  |  Entries: ${opts.count}`,
  )
  autoTable(doc, {
    startY,
    head: [['SL', 'Particulars', 'Amount (Tk)']],
    body: [
      ['1', 'Opening Balance (carry-forward)', fmt(opts.opening)],
      ['2', 'Total Income (period)', fmt(opts.totalIn)],
      ['3', 'Total Expense (period)', fmt(opts.totalOut)],
      ['4', 'Closing Balance (1 + 2 - 3)', fmt(opts.closing)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175] },
    columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 2: { halign: 'right' } },
  })
  autoTable(doc, {
    head: [['SL', 'Income Head', 'Entries', 'Amount (Tk)']],
    body: [
      ...opts.incomeHeads.map((r, i) => [String(i + 1), r.head, String(r.count), fmt(r.amount)]),
      [{ content: 'Total Income', colSpan: 3, styles: { fontStyle: 'bold' } }, { content: fmt(opts.totalIn), styles: { halign: 'right', fontStyle: 'bold' } }],
    ],
    theme: 'grid',
    headStyles: { fillColor: [22, 101, 52] },
    columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 2: { halign: 'right' }, 3: { halign: 'right' } },
  })
  autoTable(doc, {
    head: [['SL', 'Expense Head', 'Entries', 'Amount (Tk)']],
    body: [
      ...opts.expenseHeads.map((r, i) => [String(i + 1), r.head, String(r.count), fmt(r.amount)]),
      [{ content: 'Total Expense', colSpan: 3, styles: { fontStyle: 'bold' } }, { content: fmt(opts.totalOut), styles: { halign: 'right', fontStyle: 'bold' } }],
    ],
    theme: 'grid',
    headStyles: { fillColor: [153, 27, 27] },
    columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 2: { halign: 'right' }, 3: { halign: 'right' } },
  })
  addSignatures(doc, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY)
  addFooters(doc)
  doc.save(`accounts-report-${opts.period.replaceAll(' ', '').replaceAll('/', '-')}.pdf`)
}

// ---------- 2. Salary sheet ----------
export interface SalaryPdfRow {
  teacherName: string
  basic: number
  allowance: number
  bonus: number
  deduction: number
  gross: number
  net: number
  status: string
  paymentDate: string
}
export function salarySheetPdf(opts: {
  schoolName: string
  periodLabel: string
  rows: SalaryPdfRow[]
  totals: { basic: number; allowance: number; bonus: number; deduction: number; gross: number; net: number }
}): void {
  const doc = new jsPDF({ orientation: 'landscape' })
  const startY = addLetterhead(doc, opts.schoolName, `Salary Sheet — ${opts.periodLabel}`, `Staff: ${opts.rows.length}`)
  autoTable(doc, {
    startY,
    head: [['#', 'Teacher', 'Basic', 'Allowance', 'Bonus', 'Deduction', 'Gross', 'Net', 'Status', 'Paid Date']],
    body: [
      ...opts.rows.map((r, i) => [
        String(i + 1), r.teacherName, fmt(r.basic), fmt(r.allowance), fmt(r.bonus),
        fmt(r.deduction), fmt(r.gross), fmt(r.net), r.status, r.paymentDate || '—',
      ]),
      [
        { content: 'Total', colSpan: 2, styles: { fontStyle: 'bold' } },
        { content: fmt(opts.totals.basic), styles: { fontStyle: 'bold' } },
        { content: fmt(opts.totals.allowance), styles: { fontStyle: 'bold' } },
        { content: fmt(opts.totals.bonus), styles: { fontStyle: 'bold' } },
        { content: fmt(opts.totals.deduction), styles: { fontStyle: 'bold' } },
        { content: fmt(opts.totals.gross), styles: { fontStyle: 'bold' } },
        { content: fmt(opts.totals.net), styles: { fontStyle: 'bold' } },
        '', '',
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175] },
    styles: { fontSize: 8 },
  })
  addSignatures(doc, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY)
  addFooters(doc)
  doc.save(`salary-sheet-${opts.periodLabel.replaceAll(' ', '-')}.pdf`)
}

// ---------- 3. Fee receipt ----------
export function receiptPdf(opts: {
  schoolName: string
  address: string
  phone: string
  receiptNumber: string
  studentName: string
  date: string
  status: string
  amount: number
  discount: number
  paid: number
  due: number
  lines: { name: string; amount: number; paid: number }[]
}): void {
  const doc = new jsPDF()
  const startY = addLetterhead(
    doc,
    opts.schoolName,
    `Fee Receipt — ${opts.receiptNumber}`,
    `${opts.address} ${opts.phone}`.trim(),
  )
  autoTable(doc, {
    startY,
    body: [
      ['Student', opts.studentName],
      ['Date', opts.date],
      ['Status', opts.status],
      ['Amount', `Tk ${fmt(opts.amount)}`],
      ...(opts.discount > 0 ? [[ 'Discount', `Tk ${fmt(opts.discount)}` ]] : []),
      ['Paid', `Tk ${fmt(opts.paid)}`],
      ['Due on receipt', `Tk ${fmt(opts.due)}`],
    ],
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
  })
  if (opts.lines.length) {
    autoTable(doc, {
      head: [['Fee name', 'Amount (Tk)', 'Paid (Tk)']],
      body: opts.lines.map((l) => [l.name, fmt(l.amount), fmt(l.paid)]),
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    })
  }
  addSignatures(doc, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY)
  addFooters(doc)
  doc.save(`receipt-${opts.receiptNumber}.pdf`)
}

// ---------- 10. Class / exam routine ----------
export function routinePdf(opts: {
  schoolName: string
  title: string
  rows: { day: string; time: string; subject: string; teacher: string; room: string; classLabel: string }[]
}): void {
  const doc = new jsPDF({ orientation: 'landscape' })
  const startY = addLetterhead(doc, opts.schoolName, opts.title, `Periods: ${opts.rows.length}`)
  autoTable(doc, {
    startY,
    head: [['SL', 'Day / Date', 'Time', 'Subject', 'Teacher', 'Room', 'Class']],
    body: opts.rows.map((r, i) => [String(i + 1), r.day, r.time, r.subject, r.teacher, r.room, r.classLabel]),
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175] },
    styles: { fontSize: 8 },
    columnStyles: { 0: { halign: 'center' } },
  })
  addSignatures(doc, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY)
  addFooters(doc)
  doc.save(`routine-${opts.title.replaceAll(' ', '-').replaceAll('/', '-')}.pdf`)
}

// ---------- 9. Day attendance sheet (who was present/absent/...) ----------
export function attendanceDayPdf(opts: {
  schoolName: string
  date: string
  status: string
  rows: { name: string; roll: string; classLabel: string; entry: string; exit: string }[]
}): void {
  const doc = new jsPDF()
  const startY = addLetterhead(doc, opts.schoolName, `Attendance — ${opts.date} (${opts.status})`, `Students: ${opts.rows.length}`)
  autoTable(doc, {
    startY,
    head: [['SL', 'Student', 'Roll', 'Class', 'Entry', 'Exit']],
    body: opts.rows.map((r, i) => [String(i + 1), r.name, r.roll, r.classLabel, r.entry || '—', r.exit || '—']),
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175] },
    styles: { fontSize: 8 },
    columnStyles: { 0: { halign: 'center' } },
  })
  addSignatures(doc, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY)
  addFooters(doc)
  doc.save(`attendance-${opts.date}-${opts.status}.pdf`)
}

// ---------- 5. Dues list (who owes what — collection sheet) ----------
export function duesListPdf(opts: {
  schoolName: string
  printedOn: string
  rows: { name: string; roll: string; due: number }[]
}): void {
  const doc = new jsPDF()
  const startY = addLetterhead(doc, opts.schoolName, 'Dues List — Outstanding Fees', `Printed: ${opts.printedOn}  |  Students: ${opts.rows.length}`)
  const total = opts.rows.reduce((s, r) => s + r.due, 0)
  autoTable(doc, {
    startY,
    head: [['SL', 'Student', 'Roll', 'Due (Tk)']],
    body: [
      ...opts.rows.map((r, i) => [String(i + 1), r.name, r.roll, fmt(r.due)]),
      [{ content: 'Total Due', colSpan: 3, styles: { fontStyle: 'bold' } }, { content: fmt(total), styles: { halign: 'right', fontStyle: 'bold' } }],
    ],
    theme: 'grid',
    headStyles: { fillColor: [153, 27, 27] },
    columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 3: { halign: 'right' } },
  })
  addSignatures(doc, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY)
  addFooters(doc)
  doc.save(`dues-list-${opts.printedOn}.pdf`)
}

// ---------- 6. Payment history ----------
export function paymentsPdf(opts: {
  schoolName: string
  period: string
  rows: { receipt: string; student: string; fee: string; amount: number; paid: number; method: string; date: string }[]
}): void {
  const doc = new jsPDF({ orientation: 'landscape' })
  const startY = addLetterhead(doc, opts.schoolName, 'Payment History', `${opts.period}  |  Receipts: ${opts.rows.length}`)
  const totalPaid = opts.rows.reduce((s, r) => s + r.paid, 0)
  autoTable(doc, {
    startY,
    head: [['SL', 'Receipt', 'Student', 'Fee', 'Amount (Tk)', 'Paid (Tk)', 'Method', 'Date']],
    body: [
      ...opts.rows.map((r, i) => [String(i + 1), r.receipt, r.student, r.fee, fmt(r.amount), fmt(r.paid), r.method, r.date]),
      [{ content: 'Total Paid', colSpan: 5, styles: { fontStyle: 'bold' } }, { content: fmt(totalPaid), styles: { halign: 'right', fontStyle: 'bold' } }, '', ''],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175] },
    styles: { fontSize: 8 },
    columnStyles: { 0: { halign: 'center' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
  })
  addSignatures(doc, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY)
  addFooters(doc)
  doc.save(`payments-${opts.period.replaceAll(' ', '').replaceAll('/', '-')}.pdf`)
}

// ---------- 7. Students list ----------
export function studentsPdf(opts: {
  schoolName: string
  filterNote: string
  rows: { name: string; roll: string; classLabel: string; dept: string; due: number; status: string }[]
}): void {
  const doc = new jsPDF()
  const startY = addLetterhead(doc, opts.schoolName, 'Students List', `${opts.filterNote}  |  Students: ${opts.rows.length}`)
  autoTable(doc, {
    startY,
    head: [['SL', 'Name', 'Roll', 'Class', 'Dept', 'Due (Tk)', 'Status']],
    body: opts.rows.map((r, i) => [String(i + 1), r.name, r.roll, r.classLabel, r.dept, fmt(r.due), r.status]),
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175] },
    styles: { fontSize: 8 },
    columnStyles: { 0: { halign: 'center' }, 5: { halign: 'right' } },
  })
  addSignatures(doc, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY)
  addFooters(doc)
  doc.save(`students-${opts.filterNote.replaceAll(' ', '').replaceAll('/', '-') || 'all'}.pdf`)
}

// ---------- 8. Attendance report ----------
export function attendanceReportPdf(opts: {
  schoolName: string
  period: string
  classLabel: string
  rows: { name: string; roll: string; present: number; late: number; absent: number; total: number; percentage: number }[]
}): void {
  const doc = new jsPDF()
  const startY = addLetterhead(doc, opts.schoolName, 'Attendance Report', `${opts.classLabel}  |  ${opts.period}  |  Students: ${opts.rows.length}`)
  autoTable(doc, {
    startY,
    head: [['SL', 'Student', 'Roll', 'Present', 'Late', 'Absent', 'Days', 'Rate']],
    body: opts.rows.map((r, i) => [String(i + 1), r.name, r.roll, String(r.present), String(r.late), String(r.absent), String(r.total), `${r.percentage}%`]),
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175] },
    styles: { fontSize: 8 },
    columnStyles: { 0: { halign: 'center' } },
  })
  addSignatures(doc, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY)
  addFooters(doc)
  doc.save(`attendance-report-${opts.period.replaceAll(' ', '').replaceAll('/', '-')}.pdf`)
}
export function reportCardPdf(opts: {
  schoolName: string
  address: string
  phone: string
  examName: string
  studentName: string
  roll: string
  classLabel: string
  examDate: string
  fullMarks: number
  obtained: number
  grade: string
  rank: string
  status: string
  lines?: { name: string; total: number; full: number; grade: string }[]
}): void {
  const doc = new jsPDF()
  const startY = addLetterhead(doc, opts.schoolName, `Report Card — ${opts.examName}`, `${opts.address} ${opts.phone}`.trim())
  autoTable(doc, {
    startY,
    body: [
      ['Student', opts.studentName],
      ['Roll', opts.roll],
      ['Class', opts.classLabel],
      ['Exam Date', opts.examDate],
    ],
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
  })
  if (opts.lines?.length) {
    autoTable(doc, {
      head: [['Subject', 'Obtained', 'Full', 'Grade']],
      body: opts.lines.map((l) => [l.name, String(l.total), String(l.full), l.grade]),
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175] },
    })
  }
  autoTable(doc, {
    head: [['Exam', 'Full Marks', 'Obtained', 'Grade', 'Rank', 'Status']],
    body: [[opts.examName, String(opts.fullMarks), String(opts.obtained), opts.grade, opts.rank, opts.status]],
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175] },
  })
  addSignatures(doc, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY)
  addFooters(doc)
  doc.save(`report-card-${opts.studentName.replaceAll(' ', '-')}-${opts.examName.replaceAll(' ', '-')}.pdf`)
}
