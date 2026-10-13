export function gradeFromMarks(marks: number, fullMarks = 100): string {
  const pct = fullMarks > 0 ? (marks / fullMarks) * 100 : 0
  if (pct >= 80) return 'A+'
  if (pct >= 70) return 'A'
  if (pct >= 60) return 'A-'
  if (pct >= 50) return 'B'
  if (pct >= 40) return 'C'
  if (pct >= 33) return 'D'
  return 'F'
}
