import { examService, smsService } from '@/services'
import { buildResultVariables } from '@/utils/resultSms'

export interface ResultSmsReport {
  sent: number
  failed: { recipientId: string; message: string }[]
}

/** Publish-time result SMS: rank + total + failed subjects to each guardian's primary number. */
export async function sendResultSmsForExam(examId: string): Promise<ResultSmsReport> {
  const [resultsRes, tplRes, examRes] = await Promise.all([
    examService.results(examId),
    smsService.templates(),
    examService.get(examId),
  ])
  const template = (tplRes.data ?? []).find((t) => t.type === 'result')
  if (!template) {
    throw new Error('No result template found — ask a super admin to create one on the SMS Control page.')
  }
  const rows = resultsRes.data.rows ?? []
  const fullMarks = resultsRes.data.fullMarks ?? 0
  const examName = examRes.data?.name ?? ''
  const examDate = examRes.data?.examDate ?? ''
  const res = await smsService.sendBulk({
    templateId: template.id,
    examId,
    recipients: rows.map((row) => ({
      recipientId: row.studentId,
      recipientType: 'guardian',
      variables: {
        studentName: row.studentName,
        examName,
        examDate,
        ...buildResultVariables(row, fullMarks),
      },
    })),
  })
  return { sent: res.data.sent, failed: res.data.failed ?? [] }
}
