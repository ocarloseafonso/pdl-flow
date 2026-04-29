export function daysBetween(iso: string, ref = new Date()): number {
  const d = new Date(iso);
  return Math.floor((ref.getTime() - d.getTime()) / 86400000);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isOverdue(startedAt: string, expectedDays: number): "ok" | "warn" | "late" {
  const days = daysBetween(startedAt);
  if (days < expectedDays) return "ok";
  if (days < expectedDays * 1.5) return "warn";
  return "late";
}
