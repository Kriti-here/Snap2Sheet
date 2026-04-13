
import * as XLSX from 'xlsx';
import { TableData, TableStyles, CellStyle } from '../types';

export const downloadAsExcel = (data: TableData, fileName: string = 'Snap2Sheet_Export') => {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const downloadAsCSV = (data: TableData, fileName: string = 'Snap2Sheet_Export') => {
  const csvContent = data.map(row => 
    row.map(cell => {
      const escaped = cell.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',')
  ).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const copyToClipboard = async (data: TableData) => {
  const csvContent = data.map(row => row.join('\t')).join('\n');
  try {
    await navigator.clipboard.writeText(csvContent);
    return true;
  } catch (err) {
    console.error('Failed to copy: ', err);
    return false;
  }
};

/**
 * Copies the table data and styles to clipboard as HTML.
 * Excel and Google Sheets can parse this to preserve formatting.
 */
export const copyTableToClipboard = async (data: TableData, styles: TableStyles = {}) => {
  const colCount = Math.max(...data.map(row => row.length));
  
  // Track hidden cells due to spans
  const hidden = new Set<string>();
  Object.entries(styles).forEach(([key, style]) => {
    if (style.rowSpan || style.colSpan) {
      const [r, c] = key.split('-').map(Number);
      const rs = style.rowSpan || 1;
      const cs = style.colSpan || 1;
      for (let dr = 0; dr < rs; dr++) {
        for (let dc = 0; dc < cs; dc++) {
          if (dr === 0 && dc === 0) continue;
          hidden.add(`${r + dr}-${c + dc}`);
        }
      }
    }
  });

  let html = '<table border="1" style="border-collapse: collapse; font-family: sans-serif;">';
  
  data.forEach((row, r) => {
    html += '<tr>';
    for (let c = 0; c < colCount; c++) {
      const key = `${r}-${c}`;
      if (hidden.has(key)) continue;

      const style = styles[key] || {};
      const value = row[c] || '';
      
      let css = '';
      if (style.bold) css += 'font-weight: bold; ';
      if (style.italic) css += 'font-style: italic; ';
      if (style.align) css += `text-align: ${style.align}; `;
      if (style.backgroundColor) css += `background-color: ${style.backgroundColor}; `;
      if (style.color) css += `color: ${style.color}; `;
      if (style.fontSize) css += `font-size: ${style.fontSize}; `;
      if (style.fontFamily) css += `font-family: ${style.fontFamily}; `;
      if (style.wrapText) css += 'white-space: normal; ';
      
      const rs = style.rowSpan ? ` rowspan="${style.rowSpan}"` : '';
      const cs = style.colSpan ? ` colspan="${style.colSpan}"` : '';
      
      html += `<td${rs}${cs} style="${css}">${value}</td>`;
    }
    html += '</tr>';
  });
  html += '</table>';

  const plainText = data.map(row => row.join('\t')).join('\n');

  try {
    const blobHtml = new Blob([html], { type: 'text/html' });
    const blobText = new Blob([plainText], { type: 'text/plain' });
    const dataObj = [new ClipboardItem({
      'text/html': blobHtml,
      'text/plain': blobText
    })];
    
    await navigator.clipboard.write(dataObj);
    return true;
  } catch (err) {
    console.error('Rich copy failed', err);
    return false;
  }
};

export const shareData = async (data: TableData) => {
  const csvContent = data.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const file = new File([blob], 'Snap2Sheet_Export.csv', { type: 'text/csv' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Snap2Sheet Data Export',
        text: 'Here is the data converted from my image.',
      });
    } catch (err) {
      console.error('Share failed', err);
    }
  } else {
    alert('Sharing not supported on this browser.');
  }
};
