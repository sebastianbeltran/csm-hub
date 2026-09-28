/**
 * Genera src/data/vigilancias.json desde el Excel de vigilancias.
 * Ejecutar: node scripts/parse-vigilancias.js
 */
const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const EXCEL_PATH = path.resolve(__dirname, '../../VIGILANCIAS Y ACOMPAÑAMIENTOS CARROS HIGH SCHOOL 26-27.xlsx')
const OUT_PATH = path.resolve(__dirname, '../src/data/vigilancias.json')

const wb = XLSX.readFile(EXCEL_PATH)

const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
}

function pad(n) { return String(n).padStart(2, '0') }

/**
 * Parsea un rango de fechas en español.
 * Formatos soportados:
 *   "25 al 28 de agosto"
 *   "1 al 4 de septiembre"
 *   "28 de septiembre - 02 de octubre"
 *   "31 al 31 de agosto"
 * Devuelve { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } o null si no parseable.
 */
function parseRange(label) {
  if (!label || typeof label !== 'string') return null
  const l = label.trim().toLowerCase()

  // Patrón: "D al D de mes" o "D al D de mes" (mismo mes)
  const m1 = l.match(/^(\d{1,2})\s+al\s+(\d{1,2})\s+de\s+(\w+)/)
  if (m1) {
    const mes = MESES[m1[3]]
    if (!mes) return null
    const year = mes >= 8 ? 2026 : 2027
    return {
      start: `${year}-${pad(mes)}-${pad(m1[1])}`,
      end: `${year}-${pad(mes)}-${pad(m1[2])}`,
    }
  }

  // Patrón: "D de mes - D de mes" (meses distintos)
  const m2 = l.match(/^(\d{1,2})\s+de\s+(\w+)\s*[-–]\s*(\d{1,2})\s+de\s+(\w+)/)
  if (m2) {
    const mes1 = MESES[m2[2]]
    const mes2 = MESES[m2[4]]
    if (!mes1 || !mes2) return null
    const year1 = mes1 >= 8 ? 2026 : 2027
    const year2 = mes2 >= 8 ? 2026 : 2027
    return {
      start: `${year1}-${pad(mes1)}-${pad(m2[1])}`,
      end: `${year2}-${pad(mes2)}-${pad(m2[3])}`,
    }
  }

  return null
}

// ─── 1. Vigilancias semanales ─────────────────────────────────────
// Sheet: "VIGILANCIAS HIGH 26-27" (sin espacio)
const wsVig = wb.Sheets['VIGILANCIAS HIGH 26-27']
const vigData = XLSX.utils.sheet_to_json(wsVig, { header: 1, defval: '' })

const vigilancias = []
let currentSection = ''
let lastEntry = null

for (let i = 3; i < vigData.length; i++) {
  const row = vigData[i]
  if (!row || !row.some(c => c !== '')) continue

  const [hora, ...rest] = row
  const horaClean = String(hora).trim()

  if (horaClean === 'DESCANSO' || horaClean === 'ALMUERZO') {
    currentSection = horaClean
    lastEntry = null
    continue
  }

  // Fila de continuación (hora vacía pero tiene valores de días)
  if (!horaClean && lastEntry) {
    DAYS.forEach((d, idx) => {
      const val = String(rest[idx] || '').trim()
      if (val && !lastEntry[d]) lastEntry[d] = val
    })
    continue
  }

  if (!horaClean) continue

  // Fila normal con hora
  const parts = horaClean.split('\n')
  const slot = parts[0].trim()
  const spot = parts[1] ? parts[1].trim() : ''

  const entry = { section: currentSection, slot, spot }
  DAYS.forEach((d, idx) => { entry[d] = String(rest[idx] || '').trim() })

  vigilancias.push(entry)
  lastEntry = entry
}

// ─── 2. Carros y Rutas (por fecha) ───────────────────────────────
// Sheet: " VIGILANCIAS HIGH 26-27" (con espacio) — tiene ambas secciones
const wsAll = wb.Sheets[' VIGILANCIAS HIGH 26-27']
const allData = XLSX.utils.sheet_to_json(wsAll, { header: 1, defval: '' })

function parseSection(rows, startIdx) {
  const result = []
  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row.some(c => c !== '')) continue
    const label = String(row[0] || '').trim()
    if (!label) continue
    // Stop if we hit another section header
    if (label.includes('🚗') || label.includes('🚌') ||
        label.includes('ACOMPAÑAMIENTOS') || label === 'SEMANA') continue
    const range = parseRange(label)
    if (!range) continue
    const entry = { label: String(rows[i][0]).trim(), ...range }
    DAYS.forEach((d, idx) => {
      const val = String(row[idx + 1] || '').trim()
      entry[d] = (val === 'SEMANA DE RECESO' || val === 'FESTIVO') ? val : val
    })
    result.push(entry)
  }
  return result
}

// Encontrar índices de cada sección en allData
let carrosEarlyStart = -1, carrosMainStart = -1
let rutasEarlyStart = -1, rutasMainStart = -1

for (let i = 0; i < allData.length; i++) {
  const cell = String(allData[i][0] || '').trim()
  if (cell.startsWith('ACOMPAÑAMIENTOS ESTUDIANTES DE CARROS') && carrosEarlyStart === -1) {
    carrosEarlyStart = i + 2 // skip header row
  }
  if (cell.startsWith('ACOMPAÑAMIENTOS ESTUDIANTES DE RUTA') && rutasEarlyStart === -1) {
    rutasEarlyStart = i + 2
  }
  if (cell.includes('🚗') && carrosMainStart === -1) {
    carrosMainStart = i + 2
  }
  if (cell.includes('🚌') && rutasMainStart === -1) {
    rutasMainStart = i + 2
  }
}

// Parsear filas de cada sección
function parseSectionRows(startIdx, endIdx) {
  const result = []
  for (let i = startIdx; i < Math.min(endIdx, allData.length); i++) {
    const row = allData[i]
    if (!row || !row.some(c => c !== '')) continue
    const label = String(row[0] || '').trim()
    if (!label || label === 'SEMANA' || label === 'FECHA POR SEMANAS') continue
    if (label.includes('🚗') || label.includes('🚌') || label.startsWith('ACOMPAÑAMIENTOS')) break
    const range = parseRange(label)
    if (!range) continue
    const entry = { label, ...range }
    DAYS.forEach((d, idx) => {
      entry[d] = String(row[idx + 1] || '').trim()
    })
    result.push(entry)
  }
  return result
}

const carrosEarly = parseSectionRows(carrosEarlyStart, rutasEarlyStart)
const carrosMain = parseSectionRows(carrosMainStart, rutasMainStart)
const rutasEarly = parseSectionRows(rutasEarlyStart, carrosMainStart)
const rutasMain = parseSectionRows(rutasMainStart, allData.length)

// Merge early + main, dedup por start date
function mergeAndSort(early, main) {
  const seen = new Set()
  const combined = [...early, ...main].filter(e => {
    if (seen.has(e.start)) return false
    seen.add(e.start)
    return true
  })
  return combined.sort((a, b) => a.start.localeCompare(b.start))
}

const carros = mergeAndSort(carrosEarly, carrosMain)
const rutas = mergeAndSort(rutasEarly, rutasMain)

const output = { vigilancias, carros, rutas }

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8')
console.log(`✓ vigilancias.json generado`)
console.log(`  - ${vigilancias.length} slots de vigilancia semanal`)
console.log(`  - ${carros.length} semanas de carros`)
console.log(`  - ${rutas.length} semanas de rutas`)
