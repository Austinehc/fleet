
export function formatDate(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Format a date for CSV export (compact dd/mm/yy)
 */
export function formatDateForCSV(date: string | Date): string {
  return formatDate(date);
}
