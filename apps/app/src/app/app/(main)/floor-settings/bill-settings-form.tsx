"use client";

import { useEffect, useState } from "react";
import { BillSettings } from "@/types/floor";
import { getBillSettings, updateBillSettings } from "./bill-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export function BillSettingsForm() {
    const [settings, setSettings] = useState<BillSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await getBillSettings();
            setSettings(data);
        } catch (error) {
            toast({ title: "エラー", description: "設定の読み込みに失敗しました" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await updateBillSettings(settings);
            toast({ title: "設定を保存しました" });
        } catch (error) {
            toast({ title: "エラー", description: "保存に失敗しました" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    if (!settings) return <div>エラーが発生しました</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>料金設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>セット料金 (基本)</Label>
                        <Input
                            type="number"
                            value={settings.hourly_charge}
                            onChange={e => setSettings({ ...settings, hourly_charge: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>セット時間 (分)</Label>
                        <Input
                            type="number"
                            value={settings.set_duration_minutes}
                            onChange={e => setSettings({ ...settings, set_duration_minutes: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>延長料金 (30分)</Label>
                        <Input
                            type="number"
                            value={settings.extension_fee_30m}
                            onChange={e => setSettings({ ...settings, extension_fee_30m: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>指名料</Label>
                        <Input
                            type="number"
                            value={settings.shime_fee}
                            onChange={e => setSettings({ ...settings, shime_fee: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>場内指名料</Label>
                        <Input
                            type="number"
                            value={settings.jounai_fee}
                            onChange={e => setSettings({ ...settings, jounai_fee: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>サービス料 (0.10 = 10%)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={settings.service_rate}
                            onChange={e => setSettings({ ...settings, service_rate: parseFloat(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>消費税率 (0.10 = 10%)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={settings.tax_rate}
                            onChange={e => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) })}
                        />
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    保存
                </Button>
            </CardContent>
        </Card>
    );
}
