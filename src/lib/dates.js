const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-06-11" → "Thu Jun 11" */
export function fmtDate(d) {
  const [y, m, dd] = d.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, dd))
  return `${DAYS[dt.getUTCDay()]} ${MONTHS[m - 1]} ${dd}`
}
