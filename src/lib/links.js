export const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}
