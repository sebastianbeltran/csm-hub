import { useState, useEffect } from 'react'
import { format, addDays, isWeekend, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Eye, Car, Bus, Coffee, Utensils, ChevronLeft, ChevronRight } from 'lucide-react'
import staticData from '../data/vigilancias.json'
import { supabase, missingConfig } from '../lib/supabase'

const DAY_KEYS = [null, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', null]

function findWeekEntry(list, todayStr) {
  return list.find(w => w.start <= todayStr && todayStr <= w.end) || null
}

function useViglanciasData() {
  const [data, setData] = useState(staticData)
  useEffect(() => {
    if (missingConfig) return
    supabase.from('vigilancias_config').select('data').eq('id', 'main').single()
      .then(({ data: row }) => { if (row?.data) setData(row.data) })
  }, [])
  return data
}

function SpotRow({ label, name }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1.5 border-b border-slate-100/80 last:border-0">
      <span className="text-xs text-slate-500 flex-shrink-0 truncate max-w-[45%]">{label}</span>
      <span className={`text-xs font-semibold text-right ${name ? 'text-slate-800' : 'text-slate-300'}`}>
        {name || ''}
      </span>
    </div>
  )
}

// Avanza o retrocede al siguiente día hábil (salta sábados y domingos)
function shiftWeekday(date, dir) {
  let d = addDays(date, dir)
  while (isWeekend(d)) d = addDays(d, dir)
  return d
}

export default function ViglanciasHoy() {
  const viglanciasData = useViglanciasData()
  const [selected, setSelected] = useState(() => new Date())
  const isToday = isSameDay(selected, new Date())
  const today = selected
  const dow = today.getDay()
  const dayKey = DAY_KEYS[dow]
  const isWeekday = dayKey !== null
  const todayStr = format(today, 'yyyy-MM-dd')

  const dateLabel = format(today, "EEEE d 'de' MMMM", { locale: es })
    .replace(/^\w/, c => c.toUpperCase())

  const { vigilancias, carros, rutas } = viglanciasData
  const descanso = vigilancias.filter(v => v.section === 'DESCANSO')
  const almuerzo = vigilancias.filter(v => v.section === 'ALMUERZO')

  const carrosWeek = findWeekEntry(carros, todayStr)
  const rutasWeek = findWeekEntry(rutas, todayStr)

  const carrosHoy = carrosWeek && dayKey ? carrosWeek[dayKey] : null
  const rutasHoy = rutasWeek && dayKey ? rutasWeek[dayKey] : null

  // "SEMANA DE RECESO" viene solo en la columna del lunes, pero aplica a toda la semana
  const weekIsReceso = (w) => !!w && Object.values(w).includes('SEMANA DE RECESO')
  const isReceso = weekIsReceso(carrosWeek) || weekIsReceso(rutasWeek)
  const isFestivo = carrosHoy === 'FESTIVO' || rutasHoy === 'FESTIVO'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Eye size={15} className="text-green-700 flex-shrink-0" />
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-800 text-sm">Vigilancias del día</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {dateLabel}
            {!isToday && <span className="ml-1.5 text-green-700 font-medium">· no es hoy</span>}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          {!isWeekday && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">
              Fin de semana
            </span>
          )}
          {isReceso && (
            <span className="text-xs bg-amber-100 text-amber-600 px-2.5 py-1 rounded-full font-medium">
              Semana de receso
            </span>
          )}
          {isFestivo && !isReceso && (
            <span className="text-xs bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full font-medium">
              Festivo
            </span>
          )}
          <div className="flex items-center gap-1">
            {!isToday && (
              <button onClick={() => setSelected(new Date())}
                className="px-2.5 py-1 text-xs font-semibold text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors">
                Hoy
              </button>
            )}
            <button onClick={() => setSelected(d => shiftWeekday(d, -1))} title="Día anterior" aria-label="Día anterior"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setSelected(d => shiftWeekday(d, 1))} title="Día siguiente" aria-label="Día siguiente"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {!isWeekday && !carrosWeek && !rutasWeek ? (
        <p className="text-sm text-slate-400 text-center py-8">Sin vigilancias ni acompañamientos {isToday ? "hoy" : "este día"}</p>
      ) : (
        <div className="p-4 space-y-4">

          {/* Vigilancias semanales */}
          {isWeekday && !isReceso && !isFestivo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Descanso */}
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-2">
                  <Coffee size={12} />Descanso · 9:35 – 10:05
                </p>
                {descanso.map((v, i) => (
                  <SpotRow
                    key={i}
                    label={v.spot || v.slot}
                    name={v[dayKey]}
                  />
                ))}
              </div>

              {/* Almuerzo */}
              <div className="bg-green-50 rounded-xl p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-green-700 uppercase tracking-wider mb-2">
                  <Utensils size={12} />Almuerzo · 1:05 – 2:05
                </p>
                {almuerzo.map((v, i) => {
                  const label = v.spot || v.slot.replace(/^1:\d+ - \d+:\d+\s*/, '').trim() || v.slot
                  const name = v[dayKey]
                  if (!name && !v.spot && !v.slot) return null
                  return <SpotRow key={i} label={label || v.slot} name={name} />
                })}
              </div>
            </div>
          )}

          {/* Carros y Rutas */}
          {(carrosWeek || rutasWeek) && !isReceso && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Carros */}
              {carrosWeek && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Car size={12} className="text-slate-500" />
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Carros</p>
                  </div>
                  {(['lunes','martes','miercoles','jueves','viernes']).map((d) => {
                    const name = carrosWeek[d]
                    const isToday = d === dayKey
                    const shortLabel = { lunes:'Lun', martes:'Mar', miercoles:'Mié', jueves:'Jue', viernes:'Vie' }[d]
                    return (
                      <div
                        key={d}
                        className={`flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0 rounded ${
                          isToday ? 'bg-green-700/10 -mx-1 px-1 rounded-lg border-0' : ''
                        }`}
                      >
                        <span className={`text-xs font-bold w-6 flex-shrink-0 ${isToday ? 'text-green-700' : 'text-slate-400'}`}>
                          {shortLabel}
                        </span>
                        <span className={`text-xs font-semibold text-right flex-1 ${
                          name === 'FESTIVO' ? 'text-blue-500 italic'
                          : name === 'SEMANA DE RECESO' ? 'text-amber-500 italic'
                          : name ? (isToday ? 'text-green-800' : 'text-slate-700')
                          : 'text-slate-300'
                        }`}>
                          {name === 'SEMANA DE RECESO' ? 'Receso'
                           : name === 'FESTIVO' ? 'Festivo'
                           : name || ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Rutas */}
              {rutasWeek && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Bus size={12} className="text-slate-500" />
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rutas</p>
                  </div>
                  {(['lunes','martes','miercoles','jueves','viernes']).map((d) => {
                    const name = rutasWeek[d]
                    const isToday = d === dayKey
                    const shortLabel = { lunes:'Lun', martes:'Mar', miercoles:'Mié', jueves:'Jue', viernes:'Vie' }[d]
                    return (
                      <div
                        key={d}
                        className={`flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0 rounded ${
                          isToday ? 'bg-green-700/10 -mx-1 px-1 rounded-lg border-0' : ''
                        }`}
                      >
                        <span className={`text-xs font-bold w-6 flex-shrink-0 ${isToday ? 'text-green-700' : 'text-slate-400'}`}>
                          {shortLabel}
                        </span>
                        <span className={`text-xs font-semibold text-right flex-1 ${
                          name === 'FESTIVO' ? 'text-blue-500 italic'
                          : name === 'SEMANA DE RECESO' ? 'text-amber-500 italic'
                          : name ? (isToday ? 'text-green-800' : 'text-slate-700')
                          : 'text-slate-300'
                        }`}>
                          {name === 'SEMANA DE RECESO' ? 'Receso'
                           : name === 'FESTIVO' ? 'Festivo'
                           : name || ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Semana de receso - mensaje */}
          {isReceso && (
            <div className="text-center py-4 text-amber-600 text-sm font-medium">
              Semana de receso — sin acompañamientos
            </div>
          )}

        </div>
      )}
    </div>
  )
}
