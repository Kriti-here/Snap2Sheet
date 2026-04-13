
export type TableData = string[][];

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  rowSpan?: number;
  colSpan?: number;
  backgroundColor?: string;
  color?: string; // Text color
  wrapText?: boolean;
  fontSize?: string; // e.g., "12px", "14px"
  fontFamily?: string; // e.g., "Inter", "Monospace"
}

export type ConditionalOperator = 
  | 'greater_than' 
  | 'less_than' 
  | 'equals' 
  | 'contains' 
  | 'not_contains' 
  | 'starts_with' 
  | 'ends_with' 
  | 'is_empty' 
  | 'is_not_empty';

export interface ConditionalRule {
  id: string;
  operator: ConditionalOperator;
  value: string;
  style: Partial<CellStyle>;
  enabled: boolean;
}

export type TableStyles = Record<string, CellStyle>; // key is "rowIndex-colIndex"

export interface ConversionState {
  isProcessing: boolean;
  error: string | null;
  data: TableData | null;
  fileName: string | null;
  styles?: TableStyles;
  conditionalRules?: ConditionalRule[];
}
