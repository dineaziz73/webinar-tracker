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
  if (n === null || n === undefined || isNaN(n)) return "—";
  return new Intl.NumberFormat("fr-CH", {
    style: "currency", currency: "CHF", maximumFractionDigits: 2,
  }).format(n);
}

export function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return new Intl.NumberFormat("fr-FR").format(n);
}

export function pct(a, b) {
  if (!b || b === 0) return null;
  return ((a - b) / b) * 100;
}

export function getDaysOfWeek(switchDate) {
  const days = [];
  const start = new Date(switchDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

export function formatDateFR(dateStr) {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function formatDateShort(dateStr) {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
