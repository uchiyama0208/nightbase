// CSV Import Types

export interface FieldDefinition {
    key: string;
    label: string;
    type: "string" | "number" | "date" | "time";
    required: boolean;
    examples?: string[];
}

export interface ImportResult {
    success: boolean;
    imported: number;
    skipped: number;
    duplicates: number;
    errors: ImportError[];
}

export interface ImportError {
    row: number;
    field: string;
    message: string;
}

export interface ColumnMapping {
    [fieldKey: string]: string; // fieldKey -> csvColumnName
}

export interface CsvPreviewData {
    headers: string[];
    rows: string[][];
}

export type ImportStep = "select" | "mapping" | "importing" | "result";
