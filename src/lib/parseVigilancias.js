import * as XLSX from 'xlsx'

const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
}

function pad(n) { return String(n).padStart(2, '0') }

// Año escolar: agosto–diciembre = 2026, enero–julio = 2027
const yearFor = (mes) => (mes >= 8 ? 2026 : 2027)

/**
 * Parsea un rango de fechas en español:
 *   "25 al 28 de agosto"
 *   "28 de septiembre - 02 de octubre"
 *   "28 de septiembre al 02 de octubre"
 */
export function parseRange(label) {
  if (!label || typeof label !== 'string') return null
  const l = label.trim().toLowerCase()

  const m1 = l.match(/^(\d{1,2})\s+al\s+(\d{1,2})\s+de\s+([a-záéíóú]+)/)
  if (m1) {
    const mes = MESES[m1[3]]
    if (!mes) return null
    const y = yearFor(mes)
    return { start: `${y}-${pad(mes)}-${pad(m1[1])}`, end: `${y}-${pad(mes)}-${pad(m1[2])}` }
  }

  const m2 = l.match(/^(\d{1,2})\s+de\s+([a-záéíóú]+)\s*(?:[-–]|al)\s*(\d{1,2})\s+de\s+([a-záéíóú]+)/)
  if (m2) {
    const mes1 = MESES[m2[2]], mes2 = MESES[m2[4]]
    if (!mes1 || !mes2) return null
    return {
      start: `${yearFor(mes1)}-${pad(mes1)}-${pad(m2[1])}`,
      end: `${yearFor(mes2)}-${pad(mes2)}-${pad(m2[3])}`,
    }
  }

  return null
}

const cell = (v) => String(v ?? '').trim()

const isSectionHeader = (label) =>
  label.includes('🚗') || label.includes('🚌') || label.startsWith('ACOMPAÑAMIENTOS')

function parseSectionRows(data, startIdx) {
  const result = []
  if (startIdx < 0) return result
  for (let i = startIdx; i < data.length; i++) {
    const row = data[i]
    if (!row || !row.some(c => c !== '')) continue
    const label = cell(row[0])
    if (!label || label === 'SEMANA' || label === 'FECHA POR SEMANAS') continue
    if (isSectionHeader(label)) break
    const range = parseRange(label)
    if (!range) continue
    const entry = { label, ...range }
    DAYS.forEach((d, idx) => { entry[d] = cell(row[idx + 1]) })
    result.push(entry)
  }
  return result
}

function parseVigilanciasRows(data) {
  const vigilancias = []
  let currentSection = ''
  let lastEntry = null

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row || !row.some(c => c !== '')) continue
    const [hora, ...rest] = row
    const horaClean = cell(hora)

    if (isSectionHeader(horaClean)) break

    if (horaClean === 'DESCANSO' || horaClean === 'ALMUERZO') {
      currentSection = horaClean
      lastEntry = null
      continue
    }
    if (!currentSection) continue // títulos y encabezados antes de la primera sección

    // Fila de continuación (hora vacía pero con valores en los días)
    if (!horaClean && lastEntry) {
      DAYS.forEach((d, idx) => {
        const val = cell(rest[idx])
        if (val && !lastEntry[d]) lastEntry[d] = val
      })
      continue
    }
    if (!horaClean) continue

    const parts = horaClean.split('\n')
    const entry = { section: currentSection, slot: parts[0].trim(), spot: parts.slice(1).join(' ').trim() }
    DAYS.forEach((d, idx) => { entry[d] = cell(rest[idx]) })
    vigilancias.push(entry)
    lastEntry = entry
  }
  return vigilancias
}

function findCarrosRutas(rows, acc) {
  for (let i = 0; i < rows.length; i++) {
    const c = cell(rows[i][0])
    if (c.startsWith('ACOMPAÑAMIENTOS ESTUDIANTES DE CARROS') && acc.carrosEarly.length === 0) acc.carrosEarly = parseSectionRows(rows, i + 2)
    if (c.startsWith('ACOMPAÑAMIENTOS ESTUDIANTES DE RUTA') && acc.rutasEarly.length === 0) acc.rutasEarly = parseSectionRows(rows, i + 2)
    if (c.includes('🚗') && acc.carrosMain.length === 0) acc.carrosMain = parseSectionRows(rows, i + 2)
    if (c.includes('🚌') && acc.rutasMain.length === 0) acc.rutasMain = parseSectionRows(rows, i + 2)
  }
}

/**
 * Unifica nombres escritos de forma distinta ("Angelica Rodriguez" /
 * "Angélica Rodríguez", "Juan Diego Merchan" / "Merchán"). Agrupa por la forma
 * sin tildes ni mayúsculas y elige la variante con más tildes (en empate, la
 * más frecuente).
 */
const NON_NAMES = new Set(['FESTIVO', 'SEMANA DE RECESO'])
const nameKey = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
const accentCount = (s) => (s.normalize('NFD').match(/[\u0300-\u036f]/g) || []).length

function unifyNames({ vigilancias, carros, rutas }) {
  const rows = [...vigilancias, ...carros, ...rutas]
  const variants = new Map() // key -> Map(variant -> count)
  for (const r of rows) for (const d of DAYS) {
    const v = r[d]?.replace(/\s+/g, ' ').trim()
    if (!v || NON_NAMES.has(v)) continue
    const k = nameKey(v)
    if (!variants.has(k)) variants.set(k, new Map())
    const m = variants.get(k)
    m.set(v, (m.get(v) || 0) + 1)
  }
  const canonical = new Map()
  for (const [k, m] of variants) {
    const best = [...m.entries()].sort((a, b) => accentCount(b[0]) - accentCount(a[0]) || b[1] - a[1])[0][0]
    canonical.set(k, best)
  }
  for (const r of rows) for (const d of DAYS) {
    const v = r[d]
    if (!v || NON_NAMES.has(v.trim())) continue
    r[d] = canonical.get(nameKey(v)) ?? v
  }
}

function mergeAndSort(a, b) {
  const seen = new Set()
  return [...a, ...b]
    .filter(e => { if (seen.has(e.start)) return false; seen.add(e.start); return true })
    .sort((x, y) => x.start.localeCompare(y.start))
}

/**
 * Lee el Excel de vigilancias. Las hojas se identifican por su contenido, no por
 * su nombre, así que funciona tanto con el formato original (todo en
 * " VIGILANCIAS HIGH 26-27") como con hojas separadas ("Vigilancias",
 * "Carros y Rutas").
 */
export function parseVigilanciaWorkbook(wb) {
  let vigilancias = []
  const acc = { carrosEarly: [], carrosMain: [], rutasEarly: [], rutasMain: [] }

  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' })
    if (vigilancias.length === 0) {
      const v = parseVigilanciasRows(rows)
      if (v.length) vigilancias = v
    }
    findCarrosRutas(rows, acc)
  }

  if (vigilancias.length === 0) throw new Error('No se encontraron vigilancias (filas DESCANSO / ALMUERZO). Verifica el formato.')

  const carros = mergeAndSort(acc.carrosEarly, acc.carrosMain)
  const rutas = mergeAndSort(acc.rutasEarly, acc.rutasMain)
  if (carros.length === 0 && rutas.length === 0) throw new Error('No se encontraron las tablas de carros (🚗) ni rutas (🚌).')

  const result = { vigilancias, carros, rutas }
  unifyNames(result)
  return result
}

export function parseVigilanciaExcel(arrayBuffer) {
  return parseVigilanciaWorkbook(XLSX.read(arrayBuffer, { type: 'array' }))
}
