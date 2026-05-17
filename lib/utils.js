export function getLastSwitch(customSwitch) {
  if (customSwitch) return new Date(customSwitch);
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysBack = dayOfWeek === 0 ? 0 : dayOfWeek;
  const lastSunday = new Date(now);
  lastSunday.setUTCDate(now.getUTCDate() - daysBack);
  lastSunday.setUTCHours(15, 0, 0, 0);
  if (dayOfWeek === 0 && now.getUTCHours() < 15) {
    lastSunday.setUTCDate(lastSunday.getUTCDate() - 7);
  }
  return lastSunday;
}

export function getNextSwitch(last) {
  const next = new Date(last);
  next.setUTCDate(next.getUTCDate() + 7);
  return next;
}

export function formatDuration(ms) {
  if (ms < 0) return "—";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  return `${h}h ${m}m`;
}

export function fmt(n) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 2,
  }).format(n);
}

export function fmtNum(n) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export function pct(a, b) {
  if (!b || b === 0) return null;
  return ((a - b) / b) * 100;
}
