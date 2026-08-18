export type DateFormatOption =
  | 'YYYY-MM-DD HH:mm:ss'
  | 'DD/MM/YYYY HH:mm:ss'
  | 'MM/DD/YYYY hh:mm:ss A'
  | 'ISO8601'
  | 'TIMESTAMP'

export function formatDateTime(
  dateValue: string | number | Date | null | undefined,
  format: DateFormatOption = 'YYYY-MM-DD HH:mm:ss',
): string {
  if (dateValue === null || dateValue === undefined || dateValue === '') {
    return 'NULL'
  }

  const d = new Date(dateValue)
  if (isNaN(d.getTime())) {
    return String(dateValue)
  }

  if (format === 'ISO8601') {
    return d.toISOString()
  }

  if (format === 'TIMESTAMP') {
    return Math.floor(d.getTime() / 1000).toString()
  }

  const pad = (n: number) => n.toString().padStart(2, '0')
  const YYYY = d.getFullYear()
  const MM = pad(d.getMonth() + 1)
  const DD = pad(d.getDate())
  const HH = pad(d.getHours())
  const mm = pad(d.getMinutes())
  const ss = pad(d.getSeconds())

  if (format === 'DD/MM/YYYY HH:mm:ss') {
    return `${DD}/${MM}/${YYYY} ${HH}:${mm}:${ss}`
  }

  if (format === 'MM/DD/YYYY hh:mm:ss A') {
    const hours12 = d.getHours() % 12 || 12
    const ampm = d.getHours() >= 12 ? 'PM' : 'AM'
    return `${MM}/${DD}/${YYYY} ${pad(hours12)}:${mm}:${ss} ${ampm}`
  }

  // Default: YYYY-MM-DD HH:mm:ss
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`
}
