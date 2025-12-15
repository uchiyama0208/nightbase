"use client";

import { OrderItem, StoreSettings, PricingSystem } from "./types";

interface SlipPrintLayoutProps {
    session: any;
    tableName: string;
    orders: OrderItem[];
    startTime: string;
    endTime: string;
    storeSettings: StoreSettings | null;
    pricingSystem: PricingSystem | null;
    calculateSubtotal: () => number;
    calculateServiceCharge: () => number;
    calculateTax: () => number;
    calculateRoundedTotal: () => number;
    calculateDifference: () => number;
}

export function SlipPrintLayout({
    session,
    tableName,
    orders,
    startTime,
    endTime,
    storeSettings,
    pricingSystem,
    calculateSubtotal,
    calculateServiceCharge,
    calculateTax,
    calculateRoundedTotal,
    calculateDifference,
}: SlipPrintLayoutProps) {
    if (!session) return null;

    const menuOrders = orders.filter(o => !o.hide_from_slip && !o.name.includes('料金') && !o.name.includes('割引'));

    return (
        <div className="hidden print:block print-slip">
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-slip, .print-slip * {
                        visibility: visible;
                    }
                    .print-slip {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 20mm;
                    }
                    @page {
                        size: A4;
                        margin: 0;
                    }
                }
            `}</style>
            <div className="max-w-[180mm] mx-auto bg-white p-8">
                {/* ヘッダー */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold mb-2" style={{ color: '#1e40af' }}>御会計表</h1>
                    <div className="text-right text-sm">No. {session.id.slice(0, 8)}</div>
                </div>

                {/* 基本情報テーブル */}
                <table className="w-full border-2 border-black mb-6" style={{ borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td className="border border-black px-2 py-1 w-16">年</td>
                            <td className="border border-black px-2 py-1 w-16">月</td>
                            <td className="border border-black px-2 py-1 w-16">日</td>
                            <td className="border border-black px-2 py-1">テーブルNo.</td>
                            <td className="border border-black px-2 py-1">係名</td>
                        </tr>
                        <tr>
                            <td className="border border-black px-2 py-2">{new Date(session.start_time).getFullYear()}</td>
                            <td className="border border-black px-2 py-2">{new Date(session.start_time).getMonth() + 1}</td>
                            <td className="border border-black px-2 py-2">{new Date(session.start_time).getDate()}</td>
                            <td className="border border-black px-2 py-2">{tableName}</td>
                            <td className="border border-black px-2 py-2"></td>
                        </tr>
                        <tr>
                            <td className="border border-black px-2 py-1" colSpan={2}>入店時間<br /><span className="text-2xl">:</span></td>
                            <td className="border border-black px-2 py-1" colSpan={2}>退店時間<br /><span className="text-2xl">:</span></td>
                            <td className="border border-black px-2 py-1 text-right" rowSpan={5}>
                                <div className="flex items-center justify-end">
                                    <span className="text-2xl font-bold mr-1">{session.guest_count}</span>
                                    <span>名様</span>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black px-2 py-2 text-center text-xl" colSpan={2}>
                                {startTime || new Date(session.start_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="border border-black px-2 py-2 text-center text-xl" colSpan={2}>
                                {endTime || (session.end_time ? new Date(session.end_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '')}
                            </td>
                        </tr>
                        {[...Array(3)].map((_, i) => {
                            const labels = ['同伴入店', '初回料金', '', ''];
                            const label = labels[i] || '';
                            return (
                                <tr key={i}>
                                    <td className="border border-black px-2 py-1" colSpan={2}>{label}（　　分）</td>
                                    <td className="border border-black px-2 py-2 text-center">×</td>
                                    <td className="border border-black px-2 py-2"></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* 指名・場内指名 */}
                <table className="w-full border-2 border-black mb-4" style={{ borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td className="border border-black px-2 py-2 w-24">指名</td>
                            <td className="border border-black px-2 py-2"></td>
                            <td className="border border-black px-2 py-2 text-right w-32">名×</td>
                        </tr>
                        <tr>
                            <td className="border border-black px-2 py-2">場内指名</td>
                            <td className="border border-black px-2 py-2"></td>
                            <td className="border border-black px-2 py-2 text-right">名×</td>
                        </tr>
                    </tbody>
                </table>

                {/* オーダー */}
                <table className="w-full border-2 border-black mb-4" style={{ borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td className="border border-black px-2 py-2 font-bold" colSpan={3}>オーダー</td>
                        </tr>
                        {menuOrders.map((order) => (
                            <tr key={order.id}>
                                <td className="border border-black px-2 py-2">{order.name}</td>
                                <td className="border border-black px-2 py-2 text-right">{order.quantity}</td>
                                <td className="border border-black px-2 py-2 text-right w-32">¥{(order.price * order.quantity).toLocaleString()}</td>
                            </tr>
                        ))}
                        {[...Array(Math.max(0, 8 - menuOrders.length))].map((_, i) => (
                            <tr key={`empty-${i}`}>
                                <td className="border border-black px-2 py-2">&nbsp;</td>
                                <td className="border border-black px-2 py-2"></td>
                                <td className="border border-black px-2 py-2"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* 合計 */}
                <table className="w-full border-2 border-black" style={{ borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td className="border border-black px-2 py-2 font-bold">小　　　計</td>
                            <td className="border border-black px-2 py-2 text-right w-40">¥{calculateSubtotal().toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td className="border border-black px-2 py-2">TAX・サービス料　＋　　　　％</td>
                            <td className="border border-black px-2 py-2 text-right">¥{(calculateServiceCharge() + calculateTax()).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td className="border border-black px-2 py-2">クレジットカード手数料　＋　　　　％</td>
                            <td className="border border-black px-2 py-2 text-right"></td>
                        </tr>
                        <tr>
                            <td className="border border-black px-2 py-3 text-xl font-bold">合計</td>
                            <td className="border border-black px-2 py-3 text-right text-xl font-bold">¥{calculateRoundedTotal().toLocaleString()}</td>
                        </tr>
                        {storeSettings?.slip_rounding_enabled && calculateDifference() !== 0 && (
                            <tr>
                                <td className="border border-black px-2 py-2 text-sm text-gray-600">金額丸め適用</td>
                                <td className="border border-black px-2 py-2 text-right text-sm text-gray-600">
                                    {calculateDifference() > 0 ? '+' : ''}¥{calculateDifference().toLocaleString()}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
