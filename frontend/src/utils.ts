export function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function formatDate(dateLike: string | null | undefined): string {
  if (!dateLike) return '—';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 10);
}

export function toDateInputValue(dateLike: string | null | undefined): string {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${String(x)}`);
}
