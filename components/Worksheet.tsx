
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { TableData, CellStyle, TableStyles, ConditionalRule, ConditionalOperator } from '../types';

interface WorksheetProps {
  data: TableData;
  styles: TableStyles;
  conditionalRules: ConditionalRule[];
  onChange: (newData: TableData) => void;
  onStylesChange: (newStyles: TableStyles) => void;
  onRulesChange: (newRules: ConditionalRule[]) => void;
}

interface Selection {
  start: { r: number; c: number };
  end: { r: number; c: number };
}

const FONT_SIZES = ['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
const FONT_FAMILIES = ['Inter', 'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Monospace', 'Georgia'];

export const Worksheet: React.FC<WorksheetProps> = ({ 
  data, 
  styles, 
  conditionalRules,
  onChange, 
  onStylesChange,
  onRulesChange 
}) => {
  const [focusedCell, setFocusedCell] = useState<{ r: number; c: number } | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showConditionalDrawer, setShowConditionalDrawer] = useState(false);
  
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [searchResult, setSearchResult] = useState<{ r: number, c: number }[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);

  const bgColorInputRef = useRef<HTMLInputElement>(null);
  const textColorInputRef = useRef<HTMLInputElement>(null);

  if (!data || data.length === 0) return null;

  const colCount = useMemo(() => Math.max(...data.map(row => row.length)), [data]);
  const rowCount = data.length;

  const columnTypes = useMemo(() => {
    const types: boolean[] = [];
    for (let c = 0; c < colCount; c++) {
      let numericCount = 0;
      let totalCount = 0;
      for (let r = 1; r < rowCount; r++) {
        const val = data[r][c]?.trim();
        if (val) {
          totalCount++;
          const cleanVal = val.replace(/[$,€,£,%]/g, '');
          if (!isNaN(Number(cleanVal)) && cleanVal !== '') {
            numericCount++;
          }
        }
      }
      types[c] = totalCount > 0 && (numericCount / totalCount) > 0.6;
    }
    return types;
  }, [data, colCount, rowCount]);

  const hiddenCells = useMemo(() => {
    const hidden = new Set<string>();
    (Object.entries(styles) as [string, CellStyle][]).forEach(([key, style]) => {
      if ((style.rowSpan && style.rowSpan > 1) || (style.colSpan && style.colSpan > 1)) {
        const [r, c] = key.split('-').map(Number);
        const rowSpan = style.rowSpan || 1;
        const colSpan = style.colSpan || 1;
        for (let dr = 0; dr < rowSpan; dr++) {
          for (let dc = 0; dc < colSpan; dc++) {
            if (dr === 0 && dc === 0) continue;
            hidden.add(`${r + dr}-${c + dc}`);
          }
        }
      }
    });
    return hidden;
  }, [styles]);

  /**
   * Evaluates if a cell matches a conditional rule
   */
  const evaluateRule = (value: string, rule: ConditionalRule) => {
    if (!rule.enabled) return false;
    const v = value.trim();
    const rv = rule.value.trim();
    const numV = parseFloat(v.replace(/[$,€,£,%]/g, ''));
    const numRV = parseFloat(rv.replace(/[$,€,£,%]/g, ''));

    switch (rule.operator) {
      case 'greater_than': return !isNaN(numV) && !isNaN(numRV) && numV > numRV;
      case 'less_than': return !isNaN(numV) && !isNaN(numRV) && numV < numRV;
      case 'equals': return v === rv;
      case 'contains': return v.toLowerCase().includes(rv.toLowerCase());
      case 'not_contains': return !v.toLowerCase().includes(rv.toLowerCase());
      case 'starts_with': return v.toLowerCase().startsWith(rv.toLowerCase());
      case 'ends_with': return v.toLowerCase().endsWith(rv.toLowerCase());
      case 'is_empty': return v === '';
      case 'is_not_empty': return v !== '';
      default: return false;
    }
  };

  /**
   * Gets the combined style for a cell (Manual + Conditional)
   */
  const getCellStyles = (r: number, c: number, value: string): CellStyle => {
    const base = styles[`${r}-${c}`] || {};
    let conditional: Partial<CellStyle> = {};
    
    // Last matching rule wins or merge them? Usually Excel applies them in order.
    // We'll apply all matching rules, merging styles.
    conditionalRules.forEach(rule => {
      if (evaluateRule(value, rule)) {
        conditional = { ...conditional, ...rule.style };
      }
    });

    return { ...base, ...conditional };
  };

  const handleCellEdit = (rowIndex: number, colIndex: number, value: string) => {
    const newData = data.map((row, r) => {
      if (r === rowIndex) {
        const newRow = [...row];
        while (newRow.length < colCount) newRow.push('');
        newRow[colIndex] = value;
        return newRow;
      }
      return row;
    });
    onChange(newData);
  };

  const updateStyle = (stylePatch: Partial<CellStyle>) => {
    if (!focusedCell && !selection) return;
    const next = { ...styles };
    if (selection) {
      const rStart = Math.min(selection.start.r, selection.end.r);
      const rEnd = Math.max(selection.start.r, selection.end.r);
      const cStart = Math.min(selection.start.c, selection.end.c);
      const cEnd = Math.max(selection.start.c, selection.end.c);
      for (let r = rStart; r <= rEnd; r++) {
        for (let c = cStart; c <= cEnd; c++) {
          const key = `${r}-${c}`;
          if (!hiddenCells.has(key)) {
            next[key] = { ...next[key], ...stylePatch };
          }
        }
      }
    } else if (focusedCell) {
      const key = `${focusedCell.r}-${focusedCell.c}`;
      next[key] = { ...next[key], ...stylePatch };
    }
    onStylesChange(next);
  };

  const addRule = () => {
    const newRule: ConditionalRule = {
      id: crypto.randomUUID(),
      operator: 'contains',
      value: '',
      style: { backgroundColor: '#fef3c7', color: '#92400e' },
      enabled: true
    };
    onRulesChange([...conditionalRules, newRule]);
  };

  const updateRule = (id: string, patch: Partial<ConditionalRule>) => {
    onRulesChange(conditionalRules.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const removeRule = (id: string) => {
    onRulesChange(conditionalRules.filter(r => r.id !== id));
  };

  const handleSelectAll = () => {
    setSelection({
      start: { r: 0, c: 0 },
      end: { r: rowCount - 1, c: colCount - 1 }
    });
    setFocusedCell({ r: 0, c: 0 });
  };

  const handleSelectRow = (rowIndex: number) => {
    setSelection({
      start: { r: rowIndex, c: 0 },
      end: { r: rowIndex, c: colCount - 1 }
    });
    setFocusedCell({ r: rowIndex, c: 0 });
  };

  const handleSelectColumn = (colIndex: number) => {
    setSelection({
      start: { r: 0, c: colIndex },
      end: { r: rowCount - 1, c: colIndex }
    });
    setFocusedCell({ r: 0, c: colIndex });
  };

  const insertRow = (index: number) => {
    const newRow = Array(colCount).fill('');
    const newData = [...data];
    newData.splice(index, 0, newRow);
    const nextStyles: TableStyles = {};
    Object.entries(styles).forEach(([key, style]) => {
      const [r, c] = key.split('-').map(Number);
      if (r >= index) nextStyles[`${r + 1}-${c}`] = style;
      else nextStyles[key] = style;
    });
    onChange(newData);
    onStylesChange(nextStyles);
    setFocusedCell(null);
    setSelection(null);
  };

  const deleteRow = (index: number) => {
    if (rowCount <= 1) return;
    const newData = data.filter((_, i) => i !== index);
    const nextStyles: TableStyles = {};
    Object.entries(styles).forEach(([key, style]) => {
      const [r, c] = key.split('-').map(Number);
      if (r === index) return;
      if (r > index) nextStyles[`${r - 1}-${c}`] = style;
      else nextStyles[key] = style;
    });
    onChange(newData);
    onStylesChange(nextStyles);
    setFocusedCell(null);
    setSelection(null);
  };

  const insertColumn = (index: number) => {
    const newData = data.map(row => {
      const newRow = [...row];
      newRow.splice(index, 0, '');
      return newRow;
    });
    const nextStyles: TableStyles = {};
    Object.entries(styles).forEach(([key, style]) => {
      const [r, c] = key.split('-').map(Number);
      if (c >= index) nextStyles[`${r}-${c + 1}`] = style;
      else nextStyles[key] = style;
    });
    onChange(newData);
    onStylesChange(nextStyles);
    setFocusedCell(null);
    setSelection(null);
  };

  const deleteColumn = (index: number) => {
    if (colCount <= 1) return;
    const newData = data.map(row => row.filter((_, i) => i !== index));
    const nextStyles: TableStyles = {};
    Object.entries(styles).forEach(([key, style]) => {
      const [r, c] = key.split('-').map(Number);
      if (c === index) return;
      if (c > index) nextStyles[`${r}-${c - 1}`] = style;
      else nextStyles[key] = style;
    });
    onChange(newData);
    onStylesChange(nextStyles);
    setFocusedCell(null);
    setSelection(null);
  };

  const handleMerge = () => {
    if (!selection) return;
    const rStart = Math.min(selection.start.r, selection.end.r);
    const rEnd = Math.max(selection.start.r, selection.end.r);
    const cStart = Math.min(selection.start.c, selection.end.c);
    const cEnd = Math.max(selection.start.c, selection.end.c);
    if (rStart === rEnd && cStart === cEnd) return;
    const rowSpan = rEnd - rStart + 1;
    const colSpan = cEnd - cStart + 1;
    const next = { ...styles };
    for (let r = rStart; r <= rEnd; r++) {
      for (let c = cStart; c <= cEnd; c++) {
        if (r === rStart && c === cStart) continue;
        delete next[`${r}-${c}`];
      }
    }
    next[`${rStart}-${cStart}`] = { ...next[`${rStart}-${cStart}`], rowSpan, colSpan };
    onStylesChange(next);
    setSelection(null);
    setFocusedCell({ r: rStart, c: cStart });
  };

  const handleUnmerge = () => {
    if (!focusedCell) return;
    const key = `${focusedCell.r}-${focusedCell.c}`;
    if (styles[key]?.rowSpan || styles[key]?.colSpan) {
      const next = { ...styles };
      const { rowSpan, colSpan, ...rest } = next[key];
      next[key] = rest;
      onStylesChange(next);
    }
  };

  const isInvalid = (rowIndex: number, colIndex: number, value: string) => {
    if (rowIndex === 0) return false;
    if (!columnTypes[colIndex]) return false;
    if (!value.trim()) return false;
    const cleanVal = value.replace(/[$,€,£,%]/g, '').trim();
    return isNaN(Number(cleanVal));
  };

  const getColLabel = (index: number) => {
    let label = '';
    let i = index;
    while (i >= 0) {
      label = String.fromCharCode((i % 26) + 65) + label;
      i = Math.floor(i / 26) - 1;
    }
    return label;
  };

  const handleFind = () => {
    if (!findText) { setSearchResult([]); setCurrentSearchIndex(-1); return; }
    const results: { r: number, c: number }[] = [];
    data.forEach((row, r) => {
      row.forEach((cell, c) => {
        let content = cell || '';
        let search = findText;
        if (!matchCase) { content = content.toLowerCase(); search = search.toLowerCase(); }
        if (wholeWord) { if (content === search) results.push({ r, c }); }
        else if (content.includes(search)) { results.push({ r, c }); }
      });
    });
    setSearchResult(results);
    if (results.length > 0) {
      const nextIndex = (currentSearchIndex + 1) % results.length;
      setCurrentSearchIndex(nextIndex);
      setFocusedCell(results[nextIndex]);
      setSelection(null);
    } else {
      setCurrentSearchIndex(-1);
      alert('No matches found.');
    }
  };

  const handleReplace = () => {
    if (currentSearchIndex === -1 || searchResult.length === 0) { handleFind(); return; }
    const current = searchResult[currentSearchIndex];
    const newData = data.map((row, r) => {
      if (r === current.r) {
        const newRow = [...row];
        const oldVal = newRow[current.c];
        let flags = matchCase ? '' : 'i';
        let regex = new RegExp(wholeWord ? `^${findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$` : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
        newRow[current.c] = oldVal.replace(regex, replaceText);
        return newRow;
      }
      return row;
    });
    onChange(newData);
    handleFind();
  };

  const handleReplaceAll = () => {
    if (!findText) return;
    let count = 0;
    let regex = new RegExp(wholeWord ? `\\b${findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b` : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
    const newData = data.map(row => row.map(cell => {
      const newVal = cell.replace(regex, replaceText);
      if (newVal !== cell) count++;
      return newVal;
    }));
    onChange(newData);
    alert(`Replaced ${count} occurrences.`);
    setSearchResult([]);
    setCurrentSearchIndex(-1);
  };

  const handleMouseDown = (r: number, c: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsSelecting(true);
    setSelection({ start: { r, c }, end: { r, c } });
    setFocusedCell({ r, c });
    window.addEventListener('mouseup', handleGlobalMouseUp);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (isSelecting && selection) {
      setSelection({ ...selection, end: { r, c } });
    }
  };

  const handleGlobalMouseUp = () => {
    setIsSelecting(false);
    window.removeEventListener('mouseup', handleGlobalMouseUp);
  };

  const isSelected = (r: number, c: number) => {
    if (!selection) return false;
    const rStart = Math.min(selection.start.r, selection.end.r);
    const rEnd = Math.max(selection.start.r, selection.end.r);
    const cStart = Math.min(selection.start.c, selection.end.c);
    const cEnd = Math.max(selection.start.c, selection.end.c);
    return r >= rStart && r <= rEnd && c >= cStart && c <= cEnd;
  };

  const isRowSelected = (r: number) => {
    if (!selection) return false;
    const rStart = Math.min(selection.start.r, selection.end.r);
    const rEnd = Math.max(selection.start.r, selection.end.r);
    const cStart = Math.min(selection.start.c, selection.end.c);
    const cEnd = Math.max(selection.start.c, selection.end.c);
    return r >= rStart && r <= rEnd && cStart === 0 && cEnd === colCount - 1;
  };

  const isColSelected = (c: number) => {
    if (!selection) return false;
    const rStart = Math.min(selection.start.r, selection.end.r);
    const rEnd = Math.max(selection.start.r, selection.end.r);
    const cStart = Math.min(selection.start.c, selection.end.c);
    const cEnd = Math.max(selection.start.c, selection.end.c);
    return c >= cStart && c <= cEnd && rStart === 0 && rEnd === rowCount - 1;
  };

  const isSelectedRange = selection && (selection.start.r !== selection.end.r || selection.start.c !== selection.end.c);
  const currentCellStyle = focusedCell ? styles[`${focusedCell.r}-${focusedCell.c}`] || {} : {};

  return (
    <div className="w-full space-y-4 relative flex flex-col">
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-gray-200 rounded-xl shadow-sm z-30 overflow-x-auto no-scrollbar">
        {/* Font Family */}
        <select 
          value={currentCellStyle.fontFamily || 'Inter'}
          onChange={(e) => updateStyle({ fontFamily: e.target.value })}
          className="text-sm border-gray-200 rounded-lg px-2 py-1 outline-none bg-gray-50 hover:bg-white transition-colors min-w-[120px]"
        >
          {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        {/* Font Size */}
        <select 
          value={currentCellStyle.fontSize || '14px'}
          onChange={(e) => updateStyle({ fontSize: e.target.value })}
          className="text-sm border-gray-200 rounded-lg px-2 py-1 outline-none bg-gray-50 hover:bg-white transition-colors min-w-[70px]"
        >
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="w-px h-6 bg-gray-200 mx-1"></div>

        <div className="flex items-center space-x-1">
          <button onClick={() => updateStyle({ bold: !currentCellStyle.bold })} className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${currentCellStyle.bold ? 'bg-green-100 text-green-700' : 'text-gray-600'}`} title="Bold"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" /></svg></button>
          <button onClick={() => updateStyle({ italic: !currentCellStyle.italic })} className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${currentCellStyle.italic ? 'bg-green-100 text-green-700' : 'text-gray-600'}`} title="Italic"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 20l4-16m-4 0h4m-4 16h4" /></svg></button>
          <button onClick={() => updateStyle({ wrapText: !currentCellStyle.wrapText })} className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${currentCellStyle.wrapText ? 'bg-green-100 text-green-700' : 'text-gray-600'}`} title="Wrap Text"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10l-4 4m0 0l-4-4m4 4V8a4 4 0 014-4h4" /></svg></button>
        </div>

        <div className="w-px h-6 bg-gray-200 mx-1"></div>

        <div className="flex items-center space-x-1">
          <button onClick={() => updateStyle({ align: 'left' })} className={`p-1.5 rounded-lg ${currentCellStyle.align === 'left' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" /></svg></button>
          <button onClick={() => updateStyle({ align: 'center' })} className={`p-1.5 rounded-lg ${currentCellStyle.align === 'center' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" /></svg></button>
          <button onClick={() => updateStyle({ align: 'right' })} className={`p-1.5 rounded-lg ${currentCellStyle.align === 'right' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" /></svg></button>
        </div>

        <div className="w-px h-6 bg-gray-200 mx-1"></div>

        {/* Text Color Picker */}
        <div className="relative flex items-center group">
          <input type="color" ref={textColorInputRef} onChange={(e) => updateStyle({ color: e.target.value })} value={currentCellStyle.color || '#000000'} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
          <button className={`p-1.5 rounded-lg flex flex-col items-center justify-center ${currentCellStyle.color ? 'text-blue-600' : 'text-gray-600'}`} title="Text Color">
            <span className="text-[10px] font-bold leading-none">A</span>
            <div className="w-3 h-0.5 mt-0.5" style={{ backgroundColor: currentCellStyle.color || '#000000' }}></div>
          </button>
          {currentCellStyle.color && <button onClick={(e) => { e.stopPropagation(); updateStyle({ color: undefined }); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 text-[8px] flex items-center justify-center">×</button>}
        </div>

        {/* Background Color Picker */}
        <div className="relative flex items-center">
          <input type="color" ref={bgColorInputRef} onChange={(e) => updateStyle({ backgroundColor: e.target.value })} value={currentCellStyle.backgroundColor || '#ffffff'} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
          <button className={`p-1.5 rounded-lg ${currentCellStyle.backgroundColor ? 'text-green-600' : 'text-gray-600'}`} title="Fill Color"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg></button>
          {currentCellStyle.backgroundColor && <button onClick={(e) => { e.stopPropagation(); updateStyle({ backgroundColor: undefined }); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 text-[8px] flex items-center justify-center">×</button>}
        </div>

        <div className="w-px h-6 bg-gray-200 mx-1"></div>

        <div className="flex items-center space-x-1">
          <button onClick={handleMerge} disabled={!isSelectedRange} className={`p-1.5 rounded-lg ${!isSelectedRange ? 'opacity-30' : 'text-gray-600'}`} title="Merge"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V6a2 2 0 012-2h4M4 16v2a2 2 0 002 2h4M20 8V6a2 2 0 00-2-2h-4M20 16v2a2 2 0 01-2 2h-4M8 12h8" /></svg></button>
          <button onClick={handleUnmerge} disabled={!focusedCell || !(styles[`${focusedCell.r}-${focusedCell.c}`]?.rowSpan || styles[`${focusedCell.r}-${focusedCell.c}`]?.colSpan)} className={`p-1.5 rounded-lg ${(!focusedCell || !(styles[`${focusedCell.r}-${focusedCell.c}`]?.rowSpan || styles[`${focusedCell.r}-${focusedCell.c}`]?.colSpan)) ? 'opacity-30' : 'text-gray-600'}`} title="Unmerge"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6M4 4h16v16H4V4z" /></svg></button>
        </div>

        <div className="w-px h-6 bg-gray-200 mx-1"></div>

        <div className="flex items-center space-x-1">
          <button onClick={() => focusedCell && insertRow(focusedCell.r)} disabled={!focusedCell} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30" title="Insert Row Above"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4M4 4h16v4H4V4z" /></svg></button>
          <button onClick={() => focusedCell && deleteRow(focusedCell.r)} disabled={!focusedCell} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30" title="Delete Row"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4M4 4h16v4H4V4z" /></svg></button>
          <button onClick={() => focusedCell && insertColumn(focusedCell.c)} disabled={!focusedCell} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30" title="Insert Column Left"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12v8m8-8V4m8 8H4M12 4v16M4 4h4v16H4V4z" /></svg></button>
          <button onClick={() => focusedCell && deleteColumn(focusedCell.c)} disabled={!focusedCell} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30" title="Delete Column"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4M4 4h4v16H4V4z" /></svg></button>
        </div>

        <div className="w-px h-6 bg-gray-200 mx-1"></div>

        <button 
          onClick={() => setShowConditionalDrawer(!showConditionalDrawer)} 
          className={`inline-flex items-center px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors ${showConditionalDrawer ? 'bg-purple-600 text-white border-purple-600 shadow-purple-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          title="Conditional Formatting"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Rules {conditionalRules.length > 0 && <span className="ml-1 px-1.5 bg-white/20 rounded-md text-[10px]">{conditionalRules.length}</span>}
        </button>

        <button onClick={() => setShowFindReplace(!showFindReplace)} className={`ml-auto inline-flex items-center px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors ${showFindReplace ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
      </div>

      {showFindReplace && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input type="text" value={findText} onChange={(e) => setFindText(e.target.value)} placeholder="Find..." className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
            <input type="text" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="Replace with..." className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500/20" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer"><input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} className="w-4 h-4 rounded text-blue-600" /><span>Case</span></label>
              <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer"><input type="checkbox" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} className="w-4 h-4 rounded text-blue-600" /><span>Word</span></label>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={handleFind} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Next</button>
              <button onClick={handleReplace} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50">Replace</button>
              <button onClick={handleReplaceAll} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50">All</button>
            </div>
          </div>
        </div>
      )}

      {showConditionalDrawer && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-purple-900 uppercase tracking-wider flex items-center">
              Conditional Formatting Rules
              <span className="ml-2 px-2 py-0.5 bg-purple-200 text-purple-700 text-[10px] rounded-full">{conditionalRules.length}</span>
            </h4>
            <button onClick={addRule} className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center px-2 py-1 bg-white rounded-lg shadow-sm">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Rule
            </button>
          </div>
          
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {conditionalRules.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-purple-200 rounded-xl bg-white/50">
                <p className="text-xs text-purple-400 font-medium">No rules defined. Add a rule to automatically style cells.</p>
              </div>
            )}
            {conditionalRules.map((rule) => (
              <div key={rule.id} className="flex flex-wrap items-center gap-2 p-3 bg-white border border-purple-100 rounded-xl shadow-sm transition-all hover:border-purple-300">
                <input 
                  type="checkbox" 
                  checked={rule.enabled} 
                  onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600"
                />
                
                <span className="text-xs font-semibold text-gray-500">If cell</span>
                
                <select 
                  value={rule.operator}
                  onChange={(e) => updateRule(rule.id, { operator: e.target.value as ConditionalOperator })}
                  className="text-xs border-gray-200 rounded-lg px-2 py-1 outline-none bg-gray-50 font-medium"
                >
                  <option value="greater_than">is greater than</option>
                  <option value="less_than">is less than</option>
                  <option value="equals">is equal to</option>
                  <option value="contains">contains</option>
                  <option value="not_contains">does not contain</option>
                  <option value="starts_with">starts with</option>
                  <option value="ends_with">ends with</option>
                  <option value="is_empty">is empty</option>
                  <option value="is_not_empty">is not empty</option>
                </select>

                {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
                  <input 
                    type="text" 
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                    placeholder="value..."
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-24 outline-none focus:ring-1 focus:ring-purple-500"
                  />
                )}

                <span className="text-xs font-semibold text-gray-500">then set</span>

                <div className="flex items-center gap-1 border border-gray-100 p-1 rounded-lg bg-gray-50">
                  <input 
                    type="color" 
                    value={rule.style.backgroundColor || '#ffffff'} 
                    onChange={(e) => updateRule(rule.id, { style: { ...rule.style, backgroundColor: e.target.value } })}
                    className="w-5 h-5 border-0 p-0 bg-transparent cursor-pointer rounded overflow-hidden"
                    title="Background Color"
                  />
                  <input 
                    type="color" 
                    value={rule.style.color || '#000000'} 
                    onChange={(e) => updateRule(rule.id, { style: { ...rule.style, color: e.target.value } })}
                    className="w-5 h-5 border-0 p-0 bg-transparent cursor-pointer rounded overflow-hidden"
                    title="Text Color"
                  />
                </div>

                <button 
                  onClick={() => removeRule(rule.id)}
                  className="ml-auto p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Remove Rule"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full overflow-auto border border-gray-200 rounded-xl shadow-sm bg-white max-h-[600px] scrollbar-thin select-none">
        <table ref={tableRef} className="w-full text-sm text-left border-collapse table-fixed select-none">
          <thead className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
            <tr>
              <th 
                onClick={handleSelectAll}
                className="w-12 border-r border-gray-200 bg-gray-100 px-2 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-tighter cursor-pointer hover:bg-gray-200 hover:text-gray-600 transition-colors"
              >
                ◩
              </th>
              {Array.from({ length: colCount }).map((_, i) => {
                const active = isColSelected(i);
                return (
                  <th 
                    key={i} 
                    onClick={() => handleSelectColumn(i)}
                    className={`min-w-[150px] border-r border-gray-200 px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${active ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                    {getColLabel(i)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="group transition-colors">
                <td 
                  onClick={() => handleSelectRow(rowIndex)}
                  className={`w-12 border-r border-gray-200 px-2 py-2 text-center text-xs font-medium cursor-pointer transition-colors ${isRowSelected(rowIndex) ? 'bg-blue-100 text-blue-700' : 'bg-gray-50/50 text-gray-400 hover:bg-gray-200'}`}
                >
                  {rowIndex + 1}
                </td>
                {Array.from({ length: colCount }).map((_, colIndex) => {
                  const key = `${rowIndex}-${colIndex}`;
                  if (hiddenCells.has(key)) return null;
                  const val = row[colIndex] || '';
                  const invalid = isInvalid(rowIndex, colIndex, val);
                  const isFocused = focusedCell?.r === rowIndex && focusedCell?.c === colIndex;
                  const selected = isSelected(rowIndex, colIndex);
                  
                  // Combined logic: Manual + Conditional
                  const cellStyle = getCellStyles(rowIndex, colIndex, val);
                  
                  let borderClasses = '';
                  if (selection) {
                    const rS = Math.min(selection.start.r, selection.end.r);
                    const rE = Math.max(selection.start.r, selection.end.r);
                    const cS = Math.min(selection.start.c, selection.end.c);
                    const cE = Math.max(selection.start.c, selection.end.c);
                    if (selected) {
                      if (rowIndex === rS) borderClasses += ' border-t-2 border-t-blue-500';
                      if (rowIndex === rE) borderClasses += ' border-b-2 border-b-blue-500';
                      if (colIndex === cS) borderClasses += ' border-l-2 border-l-blue-500';
                      if (colIndex === cE) borderClasses += ' border-r-2 border-r-blue-500';
                    }
                  }

                  return (
                    <td 
                      key={colIndex} 
                      rowSpan={cellStyle.rowSpan || 1}
                      colSpan={cellStyle.colSpan || 1}
                      onMouseDown={(e) => handleMouseDown(rowIndex, colIndex, e)}
                      onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                      style={{ 
                        backgroundColor: cellStyle.backgroundColor || (invalid ? 'rgb(254 242 242)' : isFocused ? 'rgb(240 253 244 / 0.4)' : selected ? 'rgb(239 246 255 / 0.5)' : 'transparent'),
                        verticalAlign: 'top'
                      }}
                      className={`relative border-r border-gray-100 p-0 transition-all duration-75 ${borderClasses} ${selected ? 'z-10' : ''}`}
                    >
                      <textarea
                        value={val}
                        rows={1}
                        onFocus={() => {
                          setFocusedCell({ r: rowIndex, c: colIndex });
                          if (!isSelecting) setSelection(null);
                        }}
                        onChange={(e) => handleCellEdit(rowIndex, colIndex, e.target.value)}
                        onMouseDown={(e) => { if (!isFocused) e.preventDefault(); }}
                        style={{
                          fontWeight: cellStyle.bold ? 'bold' : 'normal',
                          fontStyle: cellStyle.italic ? 'italic' : 'normal',
                          textAlign: cellStyle.align || 'left',
                          fontSize: cellStyle.fontSize || '14px',
                          fontFamily: cellStyle.fontFamily || 'Inter',
                          color: cellStyle.color || (invalid ? 'rgb(185 28 28)' : 'inherit'),
                          backgroundColor: 'transparent',
                          whiteSpace: cellStyle.wrapText ? 'pre-wrap' : 'nowrap',
                          overflow: 'hidden',
                          resize: 'none',
                          minHeight: '2.5rem',
                          height: 'auto',
                          cursor: isFocused ? 'text' : 'cell'
                        }}
                        className={`w-full px-3 py-2 outline-none transition-all block scrollbar-none select-none pointer-events-auto ${invalid ? 'font-medium' : ''}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
