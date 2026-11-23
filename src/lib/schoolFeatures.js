// Módulos que solo existen en ciertas escuelas (por slug de la tabla `schools`).
// Un módulo que no aparece aquí está disponible en todas las escuelas.
const SCHOOL_FEATURES = {
  vigilancias: ['high_school'],
  counseling:  ['high_school'],
  screenTime:  ['early_childhood', 'primary_school'],   // límite semanal de pantallas en el lesson plan
}

// Límite de pantallas por grado y semana (2 h diarias × 5 días). Debe coincidir con
// public.screen_limit_for_school() en Supabase.
export const SCREEN_LIMIT_MIN = 600

export const hasFeature = (schoolSlug, feature) => {
  const allowed = SCHOOL_FEATURES[feature]
  return !allowed || allowed.includes(schoolSlug)
}
