export function exportToCSV(filename, columns, data) {
  if (!Array.isArray(columns) || columns.length === 0) {
    return false;
  }

  const safeData = Array.isArray(data) ? data : [];

  const headers = columns.map((col) => {
    const label = col.label || col.key || '';
    return escapeCSV(label);
  }).join(',');

  const rows = safeData.map((item) => {
    return columns.map((col) => {
      let val;
      if (typeof col.accessor === 'function') {
        val = col.accessor(item);
      } else if (col.key) {
        val = item[col.key];
      } else {
        val = '';
      }
      return escapeCSV(val);
    }).join(',');
  });

  const csvContent = [headers, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}

function escapeCSV(val) {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
