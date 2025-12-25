"use client";

import { useState, useEffect, useTransition } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, QrCode, Printer, ExternalLink, Copy, Check, ChevronRight, Tablet } from "lucide-react";
import { VercelTabs } from "@/components/ui/vercel-tabs";
import { TableForQR, updateStoreOrderSettings } from "./actions";

interface TableOrderSettingsProps {
    tables: TableForQR[];
    storeId: string;
    initialTabletOrderEnabled: boolean;
    initialQrOrderEnabled: boolean;
}

type ActiveTab = "tablet" | "qr";
type DetailView = { type: "table-qr"; tableId: string } | null;

export function TableOrderSettings({
    tables,
    storeId,
    initialTabletOrderEnabled,
    initialQrOrderEnabled,
}: TableOrderSettingsProps) {
    const [isPending, startTransition] = useTransition();
    const [activeTab, setActiveTab] = useState<ActiveTab>("tablet");
    const [tabletOrderEnabled, setTabletOrderEnabled] = useState(initialTabletOrderEnabled);
    const [qrOrderEnabled, setQrOrderEnabled] = useState(initialQrOrderEnabled);
    const [includeTableName, setIncludeTableName] = useState(true);
    const [copied, setCopied] = useState(false);
    const [activeDetail, setActiveDetail] = useState<DetailView>(null);

    const tabs = [
        { key: "tablet", label: "タブレット注文" },
        { key: "qr", label: "QRコード注文" },
    ];

    // タブレット用QRコード
    const [tabletQrDataUrl, setTabletQrDataUrl] = useState<string>("");

    // テーブルごとのQRコード
    const [tableQrUrls, setTableQrUrls] = useState<Record<string, string>>({});

    const [origin, setOrigin] = useState("");

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    // タブレット注文URL（共通）
    const tabletOrderUrl = `${origin}/tablet/order/${storeId}`;

    // タブレット用QRコード生成
    useEffect(() => {
        if (!origin || !storeId) return;

        const generateQR = async () => {
            try {
                const url = await QRCode.toDataURL(tabletOrderUrl, {
                    width: 300,
                    margin: 2,
                    color: { dark: "#000000", light: "#ffffff" },
                });
                setTabletQrDataUrl(url);
            } catch (err) {
                console.error("QR generation error:", err);
            }
        };

        generateQR();
    }, [origin, storeId, tabletOrderUrl]);

    // テーブルごとのQRコード生成
    useEffect(() => {
        if (!origin || !storeId || tables.length === 0) return;

        const generateAllQR = async () => {
            const urls: Record<string, string> = {};
            for (const table of tables) {
                const orderUrl = `${origin}/order/${storeId}/${table.id}`;
                try {
                    const url = await QRCode.toDataURL(orderUrl, {
                        width: 300,
                        margin: 2,
                        color: { dark: "#000000", light: "#ffffff" },
                    });
                    urls[table.id] = url;
                } catch (err) {
                    console.error("QR generation error:", err);
                }
            }
            setTableQrUrls(urls);
        };

        generateAllQR();
    }, [origin, storeId, tables]);

    // 設定保存
    const handleToggleTabletOrder = (checked: boolean) => {
        setTabletOrderEnabled(checked);
        startTransition(async () => {
            await updateStoreOrderSettings({ tablet_order_enabled: checked });
        });
    };

    const handleToggleQrOrder = (checked: boolean) => {
        setQrOrderEnabled(checked);
        startTransition(async () => {
            await updateStoreOrderSettings({ qr_order_enabled: checked });
        });
    };

    // URLをコピー
    const copyUrl = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // フォールバック
        }
    };

    // 画像ダウンロード
    const downloadQR = (qrDataUrl: string, filename: string, tableName?: string) => {
        if (!qrDataUrl) return;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const padding = 40;
        const qrSize = 300;
        const textHeight = tableName && includeTableName ? 60 : 0;

        canvas.width = qrSize + padding * 2;
        canvas.height = qrSize + padding * 2 + textHeight;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, padding, padding, qrSize, qrSize);

            if (tableName && includeTableName) {
                ctx.fillStyle = "#000000";
                ctx.textAlign = "center";
                ctx.font = "bold 20px sans-serif";
                ctx.fillText(tableName, canvas.width / 2, padding + qrSize + 30);
            }

            const link = document.createElement("a");
            link.download = filename;
            link.href = canvas.toDataURL("image/png");
            link.click();
        };
        img.src = qrDataUrl;
    };

    // 印刷
    const printQR = (qrDataUrl: string, title: string, tableName?: string) => {
        if (!qrDataUrl) return;

        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
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
                    img { width: 300px; height: 300px; }
                    .table-name { margin-top: 20px; font-size: 24px; font-weight: bold; }
                    @media print { body { -webkit-print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                <img src="${qrDataUrl}" alt="QR Code" />
                ${tableName && includeTableName ? `<div class="table-name">${tableName}</div>` : ""}
                <script>window.onload = function() { window.print(); window.close(); };</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // 一括ダウンロード
    const downloadAllQR = async () => {
        for (const table of tables) {
            const qrUrl = tableQrUrls[table.id];
            if (!qrUrl) continue;

            downloadQR(qrUrl, `qr-${table.name}.png`, table.name);
            await new Promise(r => setTimeout(r, 300));
        }
    };

    // テーブルQR詳細画面
    if (activeDetail && typeof activeDetail === "object" && activeDetail.type === "table-qr") {
        const table = tables.find(t => t.id === activeDetail.tableId);
        const qrDataUrl = tableQrUrls[activeDetail.tableId];
        const orderUrl = `${origin}/order/${storeId}/${activeDetail.tableId}`;

        if (!table || !qrDataUrl) {
            return (
                <div className="space-y-4">
                    <Button variant="outline" onClick={() => setActiveDetail(null)} className="w-full">
                        戻る
                    </Button>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {table.name} のQRコード
                        </h2>
                    </div>

                    {/* QRコードプレビュー */}
                    <div className="flex flex-col items-center p-6 bg-white rounded-2xl border border-gray-200 dark:border-gray-300">
                        <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                        {includeTableName && (
                            <p className="mt-4 text-lg font-bold text-gray-900">{table.name}</p>
                        )}
                    </div>

                    {/* 印刷オプション */}
                    <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">印刷オプション</p>
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
                    <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">注文ページURL</p>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={orderUrl}
                                readOnly
                                className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-mono text-xs"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyUrl(orderUrl)}
                                className="shrink-0"
                            >
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex flex-col gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button className="w-full" onClick={() => downloadQR(qrDataUrl, `qr-${table.name}.png`, table.name)}>
                            <Download className="h-5 w-5 mr-2" />
                            画像をダウンロード
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => printQR(qrDataUrl, `QRコード - ${table.name}`, table.name)}>
                            <Printer className="h-4 w-4 mr-2" />
                            印刷
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.open(orderUrl, "_blank")}
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            プレビュー
                        </Button>
                    </div>
                </div>

                <Button variant="outline" onClick={() => setActiveDetail(null)} className="w-full bg-white dark:bg-gray-900">
                    戻る
                </Button>
            </div>
        );
    }

    // メイン画面
    return (
        <div className="space-y-4">
            {/* Vercel-style Tab Navigation */}
            <VercelTabs
                tabs={tabs}
                value={activeTab}
                onChange={(val) => setActiveTab(val as ActiveTab)}
                className="mb-4"
            />

            {/* タブレット注文セクション */}
            {activeTab === "tablet" && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
                    {/* ON/OFF切り替え */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">タブレット注文</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                店舗のタブレットでテーブルを選択して注文を受け付けます
                            </p>
                        </div>
                        <Switch
                            checked={tabletOrderEnabled}
                            onCheckedChange={handleToggleTabletOrder}
                            disabled={isPending}
                        />
                    </div>

                    {/* QRコード（ONの場合のみ表示） */}
                    {tabletOrderEnabled && tabletQrDataUrl && (
                        <>
                            {/* QRコードプレビュー */}
                            <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <img src={tabletQrDataUrl} alt="QR Code" className="w-48 h-48" />
                                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">タブレット注文画面</p>
                            </div>

                            {/* URL */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">注文ページURL</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={tabletOrderUrl}
                                        readOnly
                                        className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-mono text-xs"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => copyUrl(tabletOrderUrl)}
                                        className="shrink-0"
                                    >
                                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-5 w-5" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    このURLは店舗共通です。テーブルは注文画面で選択します。
                                </p>
                            </div>

                            {/* アクションボタン */}
                            <div className="flex flex-col gap-2 pt-2">
                                <Button className="w-full" onClick={() => downloadQR(tabletQrDataUrl, "tablet-order-qr.png")}>
                                    <Download className="h-5 w-5 mr-2" />
                                    画像をダウンロード
                                </Button>
                                <Button variant="outline" className="w-full bg-white dark:bg-gray-900" onClick={() => printQR(tabletQrDataUrl, "タブレット注文 QRコード")}>
                                    <Printer className="h-4 w-4 mr-2" />
                                    印刷
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full bg-white dark:bg-gray-900"
                                    onClick={() => window.open(tabletOrderUrl, "_blank")}
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    プレビュー
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* QRコード注文セクション */}
            {activeTab === "qr" && (
                <>
                    {/* ON/OFF切り替え */}
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">QRコード注文</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    テーブルごとのQRコードをお客様がスキャンして注文します
                                </p>
                            </div>
                            <Switch
                                checked={qrOrderEnabled}
                                onCheckedChange={handleToggleQrOrder}
                                disabled={isPending}
                            />
                        </div>
                    </div>

                    {/* テーブル一覧（ONの場合のみ表示） */}
                    {qrOrderEnabled && (
                        <>
                            {tables.length === 0 ? (
                                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
                                    <div className="text-center py-8">
                                        <QrCode className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            卓が登録されていません
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            席エディターから卓を追加してください
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* テーブルごとのQRコード一覧 */}
                                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                        {tables.map(table => (
                                            <button
                                                key={table.id}
                                                type="button"
                                                onClick={() => setActiveDetail({ type: "table-qr", tableId: table.id })}
                                                className="flex items-center justify-between p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                                        {tableQrUrls[table.id] ? (
                                                            <img src={tableQrUrls[table.id]} alt="QR" className="w-10 h-10" />
                                                        ) : (
                                                            <QrCode className="h-6 w-6 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 space-y-0.5">
                                                        <span className="text-base font-medium text-gray-900 dark:text-white">
                                                            {table.name}
                                                        </span>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            タップしてQRコードを表示
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-gray-400" />
                                            </button>
                                        ))}
                                    </div>

                                    {/* 一括ダウンロード */}
                                    {tables.length > 1 && (
                                        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
                                            <div>
                                                <h3 className="text-base font-medium text-gray-900 dark:text-white">一括ダウンロード</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    全ての卓のQRコードをまとめてダウンロードします
                                                </p>
                                            </div>
                                            <Button variant="outline" className="w-full" onClick={downloadAllQR}>
                                                <Download className="h-5 w-5 mr-2" />
                                                全{tables.length}卓のQRコードをダウンロード
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </>
            )}

            <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="w-full bg-white dark:bg-gray-900"
            >
                戻る
            </Button>
        </div>
    );
}
