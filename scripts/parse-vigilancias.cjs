/**
 * Genera src/data/vigilancias.json desde el Excel de vigilancias.
 * Usa el mismo parser que el Admin Panel (src/lib/parseVigilancias.js).
 *
 * Ejecutar: node scripts/parse-vigilancias.cjs [ruta-al-excel.xlsx]
 * Sin argumento, usa el .xlsx de vigilancias más reciente en la carpeta superior.
 */
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

const OUT_PATH = path.resolve(__dirname, '../src/data/vigilancias.json')

function findExcel() {
  if (process.argv[2]) return path.resolve(process.argv[2])
  const dir = path.resolve(__dirname, '../..')
  const files = fs.readdirSync(dir)
    .filter(f => /vigilancias/i.test(f) && f.endsWith('.xlsx') && !f.startsWith('~$'))
    .map(f => path.join(dir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  if (!files.length) throw new Error(`No se encontró un Excel de vigilancias en ${dir}`)
  return files[0]
}

;(async () => {
  const { parseVigilanciaWorkbook } = await import('../src/lib/parseVigilancias.js')
  const excelPath = findExcel()
  const output = parseVigilanciaWorkbook(XLSX.readFile(excelPath))
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8')
  console.log(`✓ vigilancias.json generado desde ${path.basename(excelPath)}`)
  console.log(`  - ${output.vigilancias.length} slots de vigilancia semanal`)
  console.log(`  - ${output.carros.length} semanas de carros`)
  console.log(`  - ${output.rutas.length} semanas de rutas`)
})()
