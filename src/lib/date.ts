export function formatDateAU(date?: string | Date | null) {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShortAU(date?: string | Date | null) {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
