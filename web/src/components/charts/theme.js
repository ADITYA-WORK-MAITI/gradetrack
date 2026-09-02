// Shared chart tokens. Red is only ever used for at-risk / absent semantics.
export const CHART = {
  accent: '#1a73e8',
  accentSoft: '#8ab4f8',
  danger: '#d93025',
  success: '#188038',
  ink2: '#5f6368',
  ink3: '#80868b',
  grid: '#e8eaed',
  // Fixed categorical order (validated for CVD separation): overall/avg, attendance, then categories.
  series: ['#1a73e8', '#e37400', '#8430ce', '#00a3a3'],
  category: { assignment: '#e37400', quiz: '#8430ce', exam: '#00a3a3' },
  font: 'Inter, "Segoe UI", Roboto, system-ui, sans-serif',
}

export const axisStyle = { fontSize: 12, fill: CHART.ink2, fontFamily: CHART.font }
export const axisLine = { stroke: '#dadce0' }
export const tickLine = false
export const labelStyle = { fontSize: 12, fill: CHART.ink2, fontFamily: CHART.font }
