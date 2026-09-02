// Hand-rolled CSV helpers (no dependencies).

const quote = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// rows: array of arrays. Returns CSV text with CRLF line endings.
export const toCsv = (rows) => rows.map((r) => r.map(quote).join(',')).join('\r\n') + '\r\n'

// Trigger a browser download of the given rows as <filename>.csv.
export function downloadCsv(filename, rows) {
  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Parse CSV text into an array of rows (arrays of strings). Handles quoted
// fields, escaped quotes, CRLF/LF, and skips blank lines.
export function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some((f) => f.trim() !== '')) rows.push(row)
  return rows.map((r) => r.map((f) => f.trim()))
}

// Turn a parsed CSV (with a header row) into student import objects.
// Accepts header names name / email / roll_no (case-insensitive; "roll" and "roll no" also work).
export function rowsToStudents(rows) {
  if (rows.length === 0) return []
  const header = rows[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ''))
  const idx = (names) => header.findIndex((h) => names.includes(h))
  const iName = idx(['name', 'fullname', 'studentname'])
  const iEmail = idx(['email', 'emailaddress'])
  const iRoll = idx(['rollno', 'roll', 'rollnumber'])
  const hasHeader = iName >= 0 || iEmail >= 0
  const body = hasHeader ? rows.slice(1) : rows
  return body.map((r) => ({
    name: r[hasHeader ? iName : 0] ?? '',
    email: r[hasHeader ? iEmail : 1] ?? '',
    roll_no: r[hasHeader ? iRoll : 2] ?? '',
  }))
}
