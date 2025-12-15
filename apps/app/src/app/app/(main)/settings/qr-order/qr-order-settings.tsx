"use client";

import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, QrCode, Printer, ExternalLink } from "lucide-react";
import { TableForQR } from "./actions";

interface QROrderSettingsProps {
    tables: TableForQR[];
    storeId: string;
}

export function QROrderSettings({ tables, storeId }: QROrderSettingsProps) {
    const [selectedTableId, setSelectedTableId] = useState<string>(tables[0]?.id || "");
    const [includeStoreName, setIncludeStoreName] = useState(true);
    const [includeTableName, setIncludeTableName] = useState(true);
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const selectedTable = tables.find(t => t.id === selectedTableId);
    const orderUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/order/${storeId}/${selectedTableId}`;

    // QRコードを生成
    useEffect(() => {
        if (!selectedTableId) return;

        const generateQR = async () => {
            try {
                const url = await QRCode.toDataURL(orderUrl, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: "#000000",
                        light: "#ffffff",
                    },
                });
                setQrDataUrl(url);
            } catch (err) {
                console.error("QR generation error:", err);
            }
        };

        generateQR();
    }, [selectedTableId, orderUrl]);

    // PDFダウンロード（シンプルな画像ダウンロードとして実装）
    const downloadQR = () => {
        if (!qrDataUrl || !selectedTable) return;

        // Canvas に描画してダウンロード
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const padding = 40;
        const qrSize = 300;
        const textHeight = includeStoreName || includeTableName ? 60 : 0;

        canvas.width = qrSize + padding * 2;
        canvas.height = qrSize + padding * 2 + textHeight;

        // 背景
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // QRコード画像を描画
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, padding, padding, qrSize, qrSize);

            // テキストを追加
            if (includeStoreName || includeTableName) {
                ctx.fillStyle = "#000000";
                ctx.textAlign = "center";
                ctx.font = "bold 20px sans-serif";

                let textY = padding + qrSize + 30;

                if (includeTableName && selectedTable) {
                    ctx.fillText(selectedTable.name, canvas.width / 2, textY);
                }
            }

            // ダウンロード
            const link = document.createElement("a");
            link.download = `qr-${selectedTable?.name || "table"}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        };
        img.src = qrDataUrl;
    };

    // 印刷
    const printQR = () => {
        if (!qrDataUrl || !selectedTable) return;

        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QRコード - ${selectedTable.name}</title>
                <style>
                    body {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        margin: 0;
                        font-family: sans-serif;
                    }
                    img {
                        width: 300px;
                        height: 300px;
                    }
                    .table-name {
                        margin-top: 20px;
                        font-size: 24px;
                        font-weight: bold;
                    }
                    @media print {
                        body { -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <img src="${qrDataUrl}" alt="QR Code" />
                ${includeTableName ? `<div class="table-name">${selectedTable.name}</div>` : ""}
                <script>
                    window.onload = function() {
                        window.print();
                        window.close();
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // URLをコピー
    const [copied, setCopied] = useState(false);
    const copyUrl = async () => {
        try {
            await navigator.clipboard.writeText(orderUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // フォールバック
        }
    };

    return (
        <div className="container mx-auto py-6 px-4 max-w-2xl space-y-6">
            {/* 卓選択 */}
            <Card className="rounded-3xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white">QRコード注文設定</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                        卓ごとのQRコードを発行して、お客様がスマートフォンから注文できるようにします
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            卓を選択
                        </label>
                        <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                            <SelectTrigger className="rounded-lg">
                                <SelectValue placeholder="卓を選択" />
                            </SelectTrigger>
                            <SelectContent>
                                {tables.map(table => (
                                    <SelectItem key={table.id} value={table.id}>
                                        {table.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {tables.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            卓が登録されていません。席エディターから卓を追加してください。
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* QRコードプレビュー */}
            {selectedTableId && qrDataUrl && (
                <Card className="rounded-3xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                            <QrCode className="h-5 w-5" />
                            {selectedTable?.name} のQRコード
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* QRコードプレビュー */}
                        <div className="flex flex-col items-center p-6 bg-white rounded-2xl border border-gray-200">
                            <img
                                src={qrDataUrl}
                                alt="QR Code"
                                className="w-48 h-48"
                            />
                            {includeTableName && selectedTable && (
                                <p className="mt-4 text-lg font-bold text-gray-900">
                                    {selectedTable.name}
                                </p>
                            )}
                        </div>

                        {/* 印刷オプション */}
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                印刷オプション
                            </p>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="includeTableName"
                                    checked={includeTableName}
                                    onCheckedChange={(checked) => setIncludeTableName(!!checked)}
                                />
                                <label htmlFor="includeTableName" className="text-sm text-gray-700 dark:text-gray-300">
                                    卓名を印字する
                                </label>
                            </div>
                        </div>

                        {/* URL */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                注文ページURL
                            </p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={orderUrl}
                                    readOnly
                                    className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`rounded-lg shrink-0 min-w-[80px] transition-colors ${copied ? "bg-green-50 border-green-500 text-green-600 dark:bg-green-900/20 dark:border-green-600 dark:text-green-400" : ""}`}
                                    onClick={copyUrl}
                                >
                                    {copied ? "コピー済" : "コピー"}
                                </Button>
                            </div>
                        </div>

                        {/* アクションボタン */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                                className="flex-1 rounded-lg"
                                onClick={downloadQR}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                画像をダウンロード
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 rounded-lg"
                                onClick={printQR}
                            >
                                <Printer className="h-4 w-4 mr-2" />
                                印刷
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 rounded-lg"
                                onClick={() => window.open(orderUrl, "_blank")}
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                プレビュー
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 全卓一括ダウンロード */}
            {tables.length > 1 && (
                <Card className="rounded-3xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-white">一括ダウンロード</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            全ての卓のQRコードをまとめてダウンロードします
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            className="w-full rounded-lg"
                            onClick={async () => {
                                for (const table of tables) {
                                    const url = `${window.location.origin}/order/${storeId}/${table.id}`;
                                    const qrUrl = await QRCode.toDataURL(url, {
                                        width: 300,
                                        margin: 2,
                                    });

                                    const canvas = document.createElement("canvas");
                                    const ctx = canvas.getContext("2d");
                                    if (!ctx) continue;

                                    const padding = 40;
                                    const qrSize = 300;
                                    const textHeight = 60;

                                    canvas.width = qrSize + padding * 2;
                                    canvas.height = qrSize + padding * 2 + textHeight;

                                    ctx.fillStyle = "#ffffff";
                                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                                    const img = new Image();
                                    await new Promise<void>((resolve) => {
                                        img.onload = () => {
                                            ctx.drawImage(img, padding, padding, qrSize, qrSize);
                                            ctx.fillStyle = "#000000";
                                            ctx.textAlign = "center";
                                            ctx.font = "bold 20px sans-serif";
                                            ctx.fillText(table.name, canvas.width / 2, padding + qrSize + 30);

                                            const link = document.createElement("a");
                                            link.download = `qr-${table.name}.png`;
                                            link.href = canvas.toDataURL("image/png");
                                            link.click();
                                            resolve();
                                        };
                                        img.src = qrUrl;
                                    });

                                    // 少し待機（ブラウザの制限対策）
                                    await new Promise(r => setTimeout(r, 300));
                                }
                            }}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            全{tables.length}卓のQRコードをダウンロード
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
