// Módulos que solo existen en ciertas escuelas (por slug de la tabla `schools`).
// Un módulo que no aparece aquí está disponible en todas las escuelas.
const SCHOOL_FEATURES = {
  vigilancias: ['high_school'],
  counseling:  ['high_school'],
}

export const hasFeature = (schoolSlug, feature) => {
  const allowed = SCHOOL_FEATURES[feature]
  return !allowed || allowed.includes(schoolSlug)
}
