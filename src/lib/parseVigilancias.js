import * as XLSX from 'xlsx'

const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
}

function pad(n) { return String(n).padStart(2, '0') }

function parseRange(label) {
  if (!label || typeof label !== 'string') return null
  const l = label.trim().toLowerCase()

  const m1 = l.match(/^(\d{1,2})\s+al\s+(\d{1,2})\s+de\s+(\w+)/)
  if (m1) {
    const mes = MESES[m1[3]]
    if (!mes) return null
    const year = mes >= 8 ? 2026 : 2027
    return { start: `${year}-${pad(mes)}-${pad(m1[1])}`, end: `${year}-${pad(mes)}-${pad(m1[2])}` }
  }

  const m2 = l.match(/^(\d{1,2})\s+de\s+(\w+)\s*[-–]\s*(\d{1,2})\s+de\s+(\w+)/)
  if (m2) {
    const mes1 = MESES[m2[2]], mes2 = MESES[m2[4]]
    if (!mes1 || !mes2) return null
    const y1 = mes1 >= 8 ? 2026 : 2027, y2 = mes2 >= 8 ? 2026 : 2027
    return { start: `${y1}-${pad(mes1)}-${pad(m2[1])}`, end: `${y2}-${pad(mes2)}-${pad(m2[3])}` }
  }

  return null
}

function parseSectionRows(data, startIdx, stopFn) {
  const result = []
  for (let i = startIdx; i < data.length; i++) {
    const row = data[i]
    if (!row || !row.some(c => c !== '')) continue
    const label = String(row[0] || '').trim()
    if (!label || label === 'SEMANA' || label === 'FECHA POR SEMANAS') continue
    if (stopFn && stopFn(label, i)) break
    const range = parseRange(label)
    if (!range) continue
    const entry = { label, ...range }
    DAYS.forEach((d, idx) => { entry[d] = String(row[idx + 1] || '').trim() })
    result.push(entry)
  }
  return result
}

export function parseVigilanciaExcel(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })

  // ── Usa la hoja con espacio para todo (vigilancias + carros + rutas) ──
  const sheetName = Object.keys(wb.Sheets).find(n => n.trim() === 'VIGILANCIAS HIGH 26-27')
  if (!sheetName) throw new Error('No se encontró la hoja "VIGILANCIAS HIGH 26-27"')
  const allData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })

  const vigilancias = []
  let currentSection = ''
  let lastEntry = null

  for (let i = 3; i < allData.length; i++) {
    const row = allData[i]
    if (!row || !row.some(c => c !== '')) continue
    const [hora, ...rest] = row
    const horaClean = String(hora).trim()

    if (horaClean.startsWith('ACOMPAÑAMIENTOS') || horaClean.includes('🚗') || horaClean.includes('🚌')) break

    if (horaClean === 'DESCANSO' || horaClean === 'ALMUERZO') {
      currentSection = horaClean
      lastEntry = null
      continue
    }
    if (!horaClean && lastEntry) {
      DAYS.forEach((d, idx) => {
        const val = String(rest[idx] || '').trim()
        if (val && !lastEntry[d]) lastEntry[d] = val
      })
      continue
    }
    if (!horaClean) continue

    const parts = horaClean.split('\n')
    const entry = { section: currentSection, slot: parts[0].trim(), spot: parts[1] ? parts[1].trim() : '' }
    DAYS.forEach((d, idx) => { entry[d] = String(rest[idx] || '').trim() })
    vigilancias.push(entry)
    lastEntry = entry
  }

  let carrosEarlyStart = -1, carrosMainStart = -1
  let rutasEarlyStart = -1, rutasMainStart = -1

  for (let i = 0; i < allData.length; i++) {
    const cell = String(allData[i][0] || '').trim()
    if (cell.startsWith('ACOMPAÑAMIENTOS ESTUDIANTES DE CARROS') && carrosEarlyStart === -1) carrosEarlyStart = i + 2
    if (cell.startsWith('ACOMPAÑAMIENTOS ESTUDIANTES DE RUTA') && rutasEarlyStart === -1) rutasEarlyStart = i + 2
    if (cell.includes('🚗') && carrosMainStart === -1) carrosMainStart = i + 2
    if (cell.includes('🚌') && rutasMainStart === -1) rutasMainStart = i + 2
  }

  const isHeader = (label) =>
    label.includes('🚗') || label.includes('🚌') || label.startsWith('ACOMPAÑAMIENTOS')

  const carrosEarly = parseSectionRows(allData, carrosEarlyStart, (l) => isHeader(l))
  const carrosMain  = parseSectionRows(allData, carrosMainStart,  (l) => isHeader(l))
  const rutasEarly  = parseSectionRows(allData, rutasEarlyStart,  (l) => isHeader(l))
  const rutasMain   = parseSectionRows(allData, rutasMainStart,   null)

  function mergeAndSort(a, b) {
    const seen = new Set()
    return [...a, ...b].filter(e => { if (seen.has(e.start)) return false; seen.add(e.start); return true })
      .sort((x, y) => x.start.localeCompare(y.start))
  }

  if (vigilancias.length === 0) throw new Error('No se encontraron vigilancias en la hoja. Verifica el formato.')

  return {
    vigilancias,
    carros: mergeAndSort(carrosEarly, carrosMain),
    rutas:  mergeAndSort(rutasEarly,  rutasMain),
  }
}
