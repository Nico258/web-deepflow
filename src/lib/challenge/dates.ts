// Fechas como "YYYY-MM-DD" en hora de Bogotá. Con la API real, «hoy» lo decide
// el servidor; esto solo lo usa la implementación local.

export const DEV_TODAY_KEY = "deepflow:dev-hoy";

const bogota = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function bogotaToday() {
  if (process.env.NODE_ENV === "development") {
    try {
      const forced = localStorage.getItem(DEV_TODAY_KEY);
      if (forced && /^\d{4}-\d{2}-\d{2}$/.test(forced)) return forced;
    } catch {}
  }
  return bogota.format(new Date());
}

const toUtc = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
};

export function daysBetween(from: string, to: string) {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

export function addDays(date: string, n: number) {
  return new Date(toUtc(date) + n * 86_400_000).toISOString().slice(0, 10);
}

const longFormat = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export function formatLong(date: string) {
  return longFormat.format(new Date(toUtc(date)));
}
