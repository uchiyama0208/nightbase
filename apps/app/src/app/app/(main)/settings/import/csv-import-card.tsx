"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Loader2, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast";
import { ImportResultModal } from "./import-result-modal";
import { validateCsvFile, parseCsvPreview, autoDetectMapping } from "./utils";
import type { FieldDefinition, ImportResult, ImportStep, ColumnMapping, CsvPreviewData } from "./types";

interface CsvImportCardProps {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    description: string;
    fields: FieldDefinition[];
    importAction: (formData: FormData) => Promise<ImportResult>;
    additionalFields?: React.ReactNode;
    onImportComplete?: () => void;
}

export function CsvImportCard({
    icon,
    iconBg,
    title,
    description,
    fields,
    importAction,
    additionalFields,
    onImportComplete,
}: CsvImportCardProps) {
    const [step, setStep] = useState<ImportStep>("select");
    const [file, setFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<CsvPreviewData | null>(null);
    const [mappings, setMappings] = useState<ColumnMapping>({});
    const [isImporting, setIsImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const requiredFields = fields.filter(f => f.required);
    const optionalFields = fields.filter(f => !f.required);

    const reset = useCallback(() => {
        setStep("select");
        setFile(null);
        setCsvData(null);
        setMappings({});
        setResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validate file
        const validation = validateCsvFile(selectedFile);
        if (!validation.valid) {
            showToast.error(validation.error || "ファイルの検証に失敗しました");
            return;
        }

        try {
            // Parse CSV preview
            const preview = await parseCsvPreview(selectedFile, 3);
            setFile(selectedFile);
            setCsvData(preview);

            // Auto-detect mappings
            const autoMappings: ColumnMapping = {};
            for (const field of fields) {
                const detected = autoDetectMapping(preview.headers, field.key, field.label);
                if (detected) {
                    autoMappings[field.key] = detected;
                }
            }
            setMappings(autoMappings);
            setStep("mapping");
        } catch (err) {
            showToast.error(err instanceof Error ? err.message : "CSVの読み込みに失敗しました");
        }
    };

    const handleMappingChange = (fieldKey: string, csvColumn: string) => {
        setMappings(prev => {
            const next = { ...prev };
            if (csvColumn === "") {
                delete next[fieldKey];
            } else {
                next[fieldKey] = csvColumn;
            }
            return next;
        });
    };

    const canProceed = requiredFields.every(f => mappings[f.key]);

    const handleImport = async () => {
        if (!file || !formRef.current) return;

        // Check required mappings
        const missingFields = requiredFields.filter(f => !mappings[f.key]);
        if (missingFields.length > 0) {
            showToast.error(`必須項目をマッピングしてください: ${missingFields.map(f => f.label).join(", ")}`);
            return;
        }

        setIsImporting(true);
        setStep("importing");

        try {
            const formData = new FormData(formRef.current);
            formData.set("file", file);
            formData.set("mappings", JSON.stringify(mappings));

            const importResult = await importAction(formData);
            setResult(importResult);
            setStep("result");

            if (importResult.success) {
                if (importResult.imported > 0) {
                    showToast.success(`${importResult.imported}件をインポートしました`);
                } else if (importResult.duplicates > 0) {
                    showToast.info("全て重複のためスキップされました");
                } else {
                    showToast.info("インポートするデータがありませんでした");
                }
                onImportComplete?.();
            } else {
                showToast.error("インポートに失敗しました");
            }

            setShowResultModal(true);
        } catch (err) {
            showToast.error(err instanceof Error ? err.message : "インポートに失敗しました");
            setStep("mapping");
        } finally {
            setIsImporting(false);
        }
    };

    const getMappedValue = (row: string[], fieldKey: string): string => {
        const csvColumn = mappings[fieldKey];
        if (!csvColumn || !csvData) return "-";
        const colIndex = csvData.headers.indexOf(csvColumn);
        if (colIndex === -1) return "-";
        return row[colIndex] || "-";
    };

    return (
        <>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${iconBg}`}>
                            {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                {title}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {description}
                            </p>
                        </div>
                        {step !== "select" && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={reset}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    <form ref={formRef} className="space-y-4">
                        {/* Additional fields (like role selector, category selector) */}
                        {additionalFields}

                        {/* Step: Select File */}
                        {step === "select" && (
                            <label className="block relative cursor-pointer">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    name="file"
                                    accept=".csv,text/csv"
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                                    <Upload className="h-6 w-6" />
                                    <span className="text-sm">CSVファイルを選択</span>
                                </div>
                            </label>
                        )}

                        {/* Step: Column Mapping */}
                        {step === "mapping" && csvData && (
                            <div className="space-y-4">
                                {/* File info */}
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                                    <span className="truncate">{file?.name}</span>
                                    <span className="text-gray-400">|</span>
                                    <span>{csvData.headers.length}列</span>
                                </div>

                                {/* Required Fields */}
                                {requiredFields.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                            必須項目
                                        </div>
                                        {requiredFields.map(field => (
                                            <div key={field.key} className="flex items-center gap-3">
                                                <label className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
                                                    {field.label} <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative flex-1">
                                                    <select
                                                        value={mappings[field.key] || ""}
                                                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                                        className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                                    >
                                                        <option value="">-- 選択してください --</option>
                                                        {csvData.headers.map((header, idx) => (
                                                            <option key={idx} value={header}>
                                                                {header}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Optional Fields */}
                                {optionalFields.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                            オプション
                                        </div>
                                        {optionalFields.map(field => (
                                            <div key={field.key} className="flex items-center gap-3">
                                                <label className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
                                                    {field.label}
                                                </label>
                                                <div className="relative flex-1">
                                                    <select
                                                        value={mappings[field.key] || ""}
                                                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                                        className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                                    >
                                                        <option value="">-- 選択しない --</option>
                                                        {csvData.headers.map((header, idx) => (
                                                            <option key={idx} value={header}>
                                                                {header}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Preview */}
                                {csvData.rows.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                            プレビュー (最初の{csvData.rows.length}行)
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                                        <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">
                                                            #
                                                        </th>
                                                        {fields.filter(f => mappings[f.key]).map(field => (
                                                            <th key={field.key} className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">
                                                                {field.label}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {csvData.rows.map((row, rowIdx) => (
                                                        <tr key={rowIdx} className="border-b border-gray-100 dark:border-gray-800">
                                                            <td className="py-2 px-2 text-gray-400">
                                                                {rowIdx + 1}
                                                            </td>
                                                            {fields.filter(f => mappings[f.key]).map(field => (
                                                                <td key={field.key} className="py-2 px-2 text-gray-900 dark:text-white">
                                                                    {getMappedValue(row, field.key)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={reset}
                                    >
                                        キャンセル
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleImport}
                                        disabled={!canProceed}
                                    >
                                        インポート開始
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step: Importing */}
                        {step === "importing" && (
                            <div className="flex flex-col items-center justify-center py-8 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    インポート中...
                                </span>
                            </div>
                        )}

                        {/* Step: Result */}
                        {step === "result" && result && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                            {result.imported}
                                        </div>
                                        <div className="text-xs text-green-600 dark:text-green-400">
                                            成功
                                        </div>
                                    </div>
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2">
                                        <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                                            {result.duplicates}
                                        </div>
                                        <div className="text-xs text-yellow-600 dark:text-yellow-400">
                                            重複
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                                        <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
                                            {result.skipped}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                            エラー
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    {result.errors.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setShowResultModal(true)}
                                        >
                                            詳細を見る
                                        </Button>
                                    )}
                                    <Button type="button" onClick={reset}>
                                        別のファイルをインポート
                                    </Button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>

            <ImportResultModal
                open={showResultModal}
                onOpenChange={setShowResultModal}
                result={result}
                title={`${title}結果`}
            />
        </>
    );
}
