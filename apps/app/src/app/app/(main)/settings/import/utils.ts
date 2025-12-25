import { CsvPreviewData } from "./types";

// CSV file validation
export function validateCsvFile(file: File): { valid: boolean; error?: string } {
    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
        return { valid: false, error: "ファイルサイズは5MB以下にしてください" };
    }

    // Check extension
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "csv") {
        return { valid: false, error: "CSVファイルを選択してください" };
    }

    return { valid: true };
}

// Parse CSV line handling quoted fields
function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++;
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

// Parse CSV headers from file
export async function parseCsvHeaders(file: File): Promise<string[]> {
    const text = await file.text();
    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, "");
    const lines = cleanText.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length === 0) {
        throw new Error("CSVファイルが空です");
    }

    return parseCsvLine(lines[0]);
}

// Parse CSV preview (headers + first N rows)
export async function parseCsvPreview(
    file: File,
    limit: number = 3
): Promise<CsvPreviewData> {
    const text = await file.text();
    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, "");
    const lines = cleanText.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length === 0) {
        throw new Error("CSVファイルが空です");
    }

    const headers = parseCsvLine(lines[0]);
    const rows: string[][] = [];

    for (let i = 1; i < Math.min(lines.length, limit + 1); i++) {
        rows.push(parseCsvLine(lines[i]));
    }

    return { headers, rows };
}

// Auto-detect column mapping based on similar names
export function autoDetectMapping(
    csvHeaders: string[],
    fieldKey: string,
    fieldLabel: string
): string | null {
    const normalizedFieldKey = fieldKey.toLowerCase().replace(/_/g, "");
    const normalizedFieldLabel = fieldLabel.toLowerCase();

    for (const header of csvHeaders) {
        const normalizedHeader = header.toLowerCase().replace(/[\s_-]/g, "");

        // Exact match
        if (
            normalizedHeader === normalizedFieldKey ||
            normalizedHeader === normalizedFieldLabel
        ) {
            return header;
        }

        // Partial match
        if (
            normalizedHeader.includes(normalizedFieldKey) ||
            normalizedFieldKey.includes(normalizedHeader) ||
            normalizedHeader.includes(normalizedFieldLabel) ||
            normalizedFieldLabel.includes(normalizedHeader)
        ) {
            return header;
        }

        // Common Japanese variations
        const variations: Record<string, string[]> = {
            display_name: ["表示名", "ディスプレイ", "名前", "name", "氏名"],
            display_name_kana: ["表示名かな", "ふりがな", "kana"],
            real_name: ["本名", "実名", "realname"],
            real_name_kana: ["本名かな", "本名ふりがな"],
            date: ["日付", "日時", "date"],
            status: ["ステータス", "状態", "status"],
            start_time: ["開始", "出勤", "start"],
            end_time: ["終了", "退勤", "end"],
            name: ["名前", "メニュー名", "商品名", "name"],
            price: ["価格", "金額", "値段", "price"],
        };

        const fieldVariations = variations[fieldKey] || [];
        for (const variation of fieldVariations) {
            if (normalizedHeader.includes(variation.toLowerCase())) {
                return header;
            }
        }
    }

    return null;
}
