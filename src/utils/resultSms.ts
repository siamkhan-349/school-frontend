import type { ExamResultRow } from '@/services'

const fmt = (v: number | string | null | undefined): string => {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0'
  return String(parseFloat(n.toFixed(2)))
}

/** Per-student template variables for result SMS (coaching `buildResultVariables` pattern). */
export function buildResultVariables(row: ExamResultRow, fullMarks: number): Record<string, string> {
  const subs = row.subjects ?? []
  const passed = subs.filter((s) => s.passed)
  const failed = subs.filter((s) => !s.passed)
  const shortList = subs.map((s) => `${s.name} ${fmt(s.total)}/${fmt(s.full)}`).join(', ')
  const gradeText = row.grade && row.grade !== 'F' ? `Grade ${row.grade} (${row.percentage}%)` : ''
  const resultLine = `Total ${fmt(row.total)}/${fmt(fullMarks)}${gradeText ? `, ${gradeText}` : ''}`
  const vars: Record<string, string> = {
    studentName: row.studentName,
    marks: fmt(row.total),
    total: fmt(row.total),
    fullMarks: fmt(fullMarks),
    grade: row.grade || '',
    percentage: String(row.percentage ?? ''),
    rank: String(row.rank ?? ''),
    resultStatus: row.passed ? 'Pass' : 'Fail',
    passedSubjects: passed.map((s) => s.name).join(', '),
    failedSubjects: failed.map((s) => s.name).join(', '),
    subjects: shortList,
    resultLine,
    resultHeadline: shortList ? `${shortList}. ${resultLine}.` : `${resultLine}.`,
    resultNote: failed.length > 0 ? ` Failed in: ${failed.map((s) => s.name).join(', ')}.` : '',
  }
  return vars
}
