"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Trash2, Plus, GripVertical, X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
    SalarySystem,
    SalarySystemInput,
    HourlySettings,
    BackSettings,
    BackTier,
    Deduction,
    createSalarySystem,
    updateSalarySystem,
    deleteSalarySystem,
} from "./actions";

interface SalarySystemModalProps {
    isOpen: boolean;
    onClose: () => void;
    system: SalarySystem | null;
    targetType: 'cast' | 'staff';
    onSaved: (system: SalarySystem) => void;
    onDeleted: (id: string) => void;
}

const RESET_PERIODS = [
    { value: '1week', label: '1週間' },
    { value: '1month', label: '1ヶ月' },
    { value: '2months', label: '2ヶ月' },
    { value: '3months', label: '3ヶ月' },
    { value: '4months', label: '4ヶ月' },
    { value: '6months', label: '6ヶ月' },
    { value: '1year', label: '1年' },
];

const ROUNDING_UNITS = [
    { value: 10, label: '10円' },
    { value: 100, label: '100円' },
    { value: 1000, label: '1,000円' },
    { value: 10000, label: '10,000円' },
];

const SHARED_COUNT_OPTIONS = [
    { value: 'none', label: 'なし（それぞれ独立）' },
    { value: 'shimei_douhan', label: '指名と同伴のみ共通' },
    { value: 'jounai_shimei', label: '場内と指名のみ共通' },
    { value: 'jounai_douhan', label: '場内と同伴のみ共通' },
    { value: 'jounai_shimei_douhan', label: '場内・指名・同伴すべて共通' },
];

export function SalarySystemModal({
    isOpen,
    onClose,
    system,
    targetType,
    onSaved,
    onDeleted,
}: SalarySystemModalProps) {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Form state
    const [name, setName] = useState("");

    // Hourly settings
    const [enableHourly, setEnableHourly] = useState(false);
    const [isMonthly, setIsMonthly] = useState(false);
    const [hourlyAmount, setHourlyAmount] = useState(0);
    const [timeUnitMinutes, setTimeUnitMinutes] = useState(60);
    const [duringServiceOnly, setDuringServiceOnly] = useState(true);
    const [includesBreak, setIncludesBreak] = useState(false);

    // Back settings
    const [enableStoreBack, setEnableStoreBack] = useState(false);
    const [storeBackSettings, setStoreBackSettings] = useState<BackSettings>(getDefaultBackSettings());

    const [enableJounaiBack, setEnableJounaiBack] = useState(false);
    const [jounaiBackSettings, setJounaiBackSettings] = useState<BackSettings>(getDefaultBackSettings());

    const [enableShimeiBack, setEnableShimeiBack] = useState(false);
    const [shimeiBackSettings, setShimeiBackSettings] = useState<BackSettings>(getDefaultBackSettings());

    const [enableDouhanBack, setEnableDouhanBack] = useState(false);
    const [douhanBackSettings, setDouhanBackSettings] = useState<BackSettings>(getDefaultBackSettings());

    const [sharedCountType, setSharedCountType] = useState('none');

    // Deductions
    const [deductions, setDeductions] = useState<Deduction[]>([]);

    function getDefaultBackSettings(): BackSettings {
        return {
            calculation_type: 'total_percent',
            percentage: 10,
            fixed_amount: 1000,
            rounding_type: 'round',
            rounding_unit: 100,
            variable_type: 'none',
            reset_period: '1month',
            tiers: [],
        };
    }

    // Initialize form when system changes
    useEffect(() => {
        if (system) {
            setName(system.name);

            // Hourly settings
            if (system.hourly_settings) {
                setEnableHourly(true);
                setIsMonthly(system.hourly_settings.is_monthly);
                setHourlyAmount(system.hourly_settings.amount);
                setTimeUnitMinutes(system.hourly_settings.time_unit_minutes || 60);
                setDuringServiceOnly(system.hourly_settings.during_service_only ?? true);
                setIncludesBreak(system.hourly_settings.includes_break ?? false);
            } else {
                setEnableHourly(false);
                setIsMonthly(false);
                setHourlyAmount(0);
                setTimeUnitMinutes(60);
                setDuringServiceOnly(true);
                setIncludesBreak(false);
            }

            // Store back
            if (system.store_back_settings) {
                setEnableStoreBack(true);
                setStoreBackSettings(system.store_back_settings);
            } else {
                setEnableStoreBack(false);
                setStoreBackSettings(getDefaultBackSettings());
            }

            // Jounai back
            if (system.jounai_back_settings) {
                setEnableJounaiBack(true);
                setJounaiBackSettings(system.jounai_back_settings);
            } else {
                setEnableJounaiBack(false);
                setJounaiBackSettings(getDefaultBackSettings());
            }

            // Shimei back
            if (system.shimei_back_settings) {
                setEnableShimeiBack(true);
                setShimeiBackSettings(system.shimei_back_settings);
            } else {
                setEnableShimeiBack(false);
                setShimeiBackSettings(getDefaultBackSettings());
            }

            // Douhan back
            if (system.douhan_back_settings) {
                setEnableDouhanBack(true);
                setDouhanBackSettings(system.douhan_back_settings);
            } else {
                setEnableDouhanBack(false);
                setDouhanBackSettings(getDefaultBackSettings());
            }

            setSharedCountType(system.shared_count_type || 'none');
            setDeductions(system.deductions || []);
        } else {
            // Reset to defaults
            setName("");
            setEnableHourly(false);
            setIsMonthly(false);
            setHourlyAmount(0);
            setTimeUnitMinutes(60);
            setDuringServiceOnly(true);
            setIncludesBreak(false);
            setEnableStoreBack(false);
            setStoreBackSettings(getDefaultBackSettings());
            setEnableJounaiBack(false);
            setJounaiBackSettings(getDefaultBackSettings());
            setEnableShimeiBack(false);
            setShimeiBackSettings(getDefaultBackSettings());
            setEnableDouhanBack(false);
            setDouhanBackSettings(getDefaultBackSettings());
            setSharedCountType('none');
            setDeductions([]);
        }
    }, [system, isOpen]);

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ title: "システム名を入力してください" });
            return;
        }

        setSaving(true);
        try {
            const input: SalarySystemInput = {
                name: name.trim(),
                target_type: targetType,
                hourly_settings: enableHourly ? {
                    is_monthly: isMonthly,
                    amount: hourlyAmount,
                    time_unit_minutes: isMonthly ? undefined : timeUnitMinutes,
                    during_service_only: isMonthly ? undefined : duringServiceOnly,
                    includes_break: isMonthly ? undefined : includesBreak,
                } : null,
                store_back_settings: enableStoreBack ? storeBackSettings : null,
                jounai_back_settings: enableJounaiBack ? jounaiBackSettings : null,
                shimei_back_settings: enableShimeiBack ? shimeiBackSettings : null,
                douhan_back_settings: enableDouhanBack ? douhanBackSettings : null,
                shared_count_type: sharedCountType,
                deductions: deductions,
            };

            if (system) {
                const result = await updateSalarySystem(system.id, input);
                if (result.success) {
                    toast({ title: "保存しました" });
                    onSaved({ ...system, ...input, updated_at: new Date().toISOString() });
                    onClose();
                } else {
                    toast({ title: result.error || "保存に失敗しました" });
                }
            } else {
                const result = await createSalarySystem(input);
                if (result.success && result.data) {
                    toast({ title: "作成しました" });
                    onSaved(result.data);
                    onClose();
                } else {
                    toast({ title: result.error || "作成に失敗しました" });
                }
            }
        } catch (error) {
            toast({ title: "エラーが発生しました" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!system) return;

        setDeleting(true);
        try {
            const result = await deleteSalarySystem(system.id);
            if (result.success) {
                toast({ title: "削除しました" });
                onDeleted(system.id);
                onClose();
            } else {
                toast({ title: result.error || "削除に失敗しました" });
            }
        } catch (error) {
            toast({ title: "エラーが発生しました" });
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    // Add deduction
    const addDeduction = () => {
        const newDeduction: Deduction = {
            id: crypto.randomUUID(),
            name: "",
            type: 'fixed',
            amount: 0,
            order: deductions.length,
        };
        setDeductions([...deductions, newDeduction]);
    };

    // Update deduction
    const updateDeduction = (id: string, updates: Partial<Deduction>) => {
        setDeductions(deductions.map(d => d.id === id ? { ...d, ...updates } : d));
    };

    // Remove deduction
    const removeDeduction = (id: string) => {
        setDeductions(deductions.filter(d => d.id !== id).map((d, i) => ({ ...d, order: i })));
    };

    // Move deduction
    const moveDeduction = (id: string, direction: 'up' | 'down') => {
        const index = deductions.findIndex(d => d.id === id);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === deductions.length - 1) return;

        const newDeductions = [...deductions];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newDeductions[index], newDeductions[swapIndex]] = [newDeductions[swapIndex], newDeductions[index]];
        setDeductions(newDeductions.map((d, i) => ({ ...d, order: i })));
    };

    // Back settings editor component
    const BackSettingsEditor = ({
        settings,
        onChange,
        showVariable = true,
    }: {
        settings: BackSettings;
        onChange: (settings: BackSettings) => void;
        showVariable?: boolean;
    }) => {
        const variableType = settings.variable_type || 'none';

        const addTier = () => {
            const newTier: BackTier = variableType === 'count' ? {
                min_count: (settings.tiers?.length || 0) + 1,
                percentage: settings.calculation_type === 'fixed' ? undefined : 10,
                fixed_amount: settings.calculation_type === 'fixed' ? 1000 : undefined,
            } : {
                min_amount: (settings.tiers?.length || 0) * 10000 + 10000,
                percentage: settings.calculation_type === 'fixed' ? undefined : 10,
                fixed_amount: settings.calculation_type === 'fixed' ? 1000 : undefined,
            };
            onChange({ ...settings, tiers: [...(settings.tiers || []), newTier] });
        };

        const updateTier = (index: number, updates: Partial<BackTier>) => {
            const newTiers = [...(settings.tiers || [])];
            newTiers[index] = { ...newTiers[index], ...updates };
            onChange({ ...settings, tiers: newTiers });
        };

        const removeTier = (index: number) => {
            onChange({ ...settings, tiers: settings.tiers?.filter((_, i) => i !== index) || [] });
        };

        const handleVariableTypeChange = (newType: 'none' | 'count' | 'amount') => {
            // 変動タイプを変更時、tiersをクリア
            onChange({ ...settings, variable_type: newType, tiers: [] });
        };

        return (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-200">計算方法</Label>
                    <Select
                        value={settings.calculation_type}
                        onValueChange={(value: 'total_percent' | 'subtotal_percent' | 'fixed') =>
                            onChange({ ...settings, calculation_type: value })
                        }
                    >
                        <SelectTrigger className="h-11">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="total_percent">合計からパーセント</SelectItem>
                            <SelectItem value="subtotal_percent">小計からパーセント</SelectItem>
                            <SelectItem value="fixed">固定金額</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {settings.calculation_type !== 'fixed' ? (
                    <>
                        <div className="space-y-2">
                            <Label className="text-gray-700 dark:text-gray-200">パーセント (%)</Label>
                            <Input
                                type="number"
                                value={settings.percentage || 0}
                                onChange={(e) => onChange({ ...settings, percentage: Number(e.target.value) })}
                                className="h-11"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-200">端数処理</Label>
                                <Select
                                    value={settings.rounding_type || 'round'}
                                    onValueChange={(value: 'round' | 'up' | 'down') =>
                                        onChange({ ...settings, rounding_type: value })
                                    }
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="round">四捨五入</SelectItem>
                                        <SelectItem value="up">切り上げ</SelectItem>
                                        <SelectItem value="down">切り下げ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-200">端数単位</Label>
                                <Select
                                    value={String(settings.rounding_unit || 100)}
                                    onValueChange={(value) =>
                                        onChange({ ...settings, rounding_unit: Number(value) as 10 | 100 | 1000 | 10000 })
                                    }
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROUNDING_UNITS.map(unit => (
                                            <SelectItem key={unit.value} value={String(unit.value)}>
                                                {unit.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-2">
                        <Label className="text-gray-700 dark:text-gray-200">固定金額 (円)</Label>
                        <Input
                            type="number"
                            value={settings.fixed_amount || 0}
                            onChange={(e) => onChange({ ...settings, fixed_amount: Number(e.target.value) })}
                            className="h-11"
                        />
                    </div>
                )}

                {showVariable && (
                    <>
                        <div className="space-y-2 pt-2">
                            <Label className="text-gray-700 dark:text-gray-200">変動設定</Label>
                            <Select
                                value={variableType}
                                onValueChange={(value: 'none' | 'count' | 'amount') => handleVariableTypeChange(value)}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">なし</SelectItem>
                                    <SelectItem value="count">回数で変動</SelectItem>
                                    <SelectItem value="amount">金額で変動</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {variableType === 'count' && (
                            <div className="space-y-4 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                                <div className="space-y-2">
                                    <Label className="text-gray-700 dark:text-gray-200">リセット期間</Label>
                                    <Select
                                        value={settings.reset_period || '1month'}
                                        onValueChange={(value) => onChange({ ...settings, reset_period: value as any })}
                                    >
                                        <SelectTrigger className="h-11">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {RESET_PERIODS.map(period => (
                                                <SelectItem key={period.value} value={period.value}>
                                                    {period.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-gray-700 dark:text-gray-200">回数別設定</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addTier}
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            追加
                                        </Button>
                                    </div>

                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        通常のバック率は上で設定したものが適用されます。以下は回数が増えた時の変動設定です。
                                    </p>

                                    {settings.tiers?.map((tier, index) => (
                                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <Input
                                                type="number"
                                                value={tier.min_count || 0}
                                                onChange={(e) => updateTier(index, { min_count: Number(e.target.value) })}
                                                className="h-9 w-20"
                                                placeholder="回数"
                                            />
                                            <span className="text-sm text-gray-500 whitespace-nowrap">回以上</span>
                                            {settings.calculation_type !== 'fixed' ? (
                                                <>
                                                    <Input
                                                        type="number"
                                                        value={tier.percentage || 0}
                                                        onChange={(e) => updateTier(index, { percentage: Number(e.target.value) })}
                                                        className="h-9 w-20"
                                                    />
                                                    <span className="text-sm text-gray-500">%</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Input
                                                        type="number"
                                                        value={tier.fixed_amount || 0}
                                                        onChange={(e) => updateTier(index, { fixed_amount: Number(e.target.value) })}
                                                        className="h-9 w-24"
                                                    />
                                                    <span className="text-sm text-gray-500">円</span>
                                                </>
                                            )}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => removeTier(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {variableType === 'amount' && (
                            <div className="space-y-4 pl-4 border-l-2 border-green-200 dark:border-green-800">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-gray-700 dark:text-gray-200">金額別設定</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addTier}
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            追加
                                        </Button>
                                    </div>

                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        通常のバック率は上で設定したものが適用されます。以下は金額が増えた時の変動設定です。
                                    </p>

                                    {settings.tiers?.map((tier, index) => (
                                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <Input
                                                type="number"
                                                value={tier.min_amount || 0}
                                                onChange={(e) => updateTier(index, { min_amount: Number(e.target.value) })}
                                                className="h-9 w-28"
                                                placeholder="金額"
                                            />
                                            <span className="text-sm text-gray-500 whitespace-nowrap">円以上</span>
                                            {settings.calculation_type !== 'fixed' ? (
                                                <>
                                                    <Input
                                                        type="number"
                                                        value={tier.percentage || 0}
                                                        onChange={(e) => updateTier(index, { percentage: Number(e.target.value) })}
                                                        className="h-9 w-20"
                                                    />
                                                    <span className="text-sm text-gray-500">%</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Input
                                                        type="number"
                                                        value={tier.fixed_amount || 0}
                                                        onChange={(e) => updateTier(index, { fixed_amount: Number(e.target.value) })}
                                                        className="h-9 w-24"
                                                    />
                                                    <span className="text-sm text-gray-500">円</span>
                                                </>
                                            )}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => removeTier(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="-ml-2" onClick={onClose}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            {system ? "給与システム編集" : "給与システム作成"}
                        </DialogTitle>
                        {system && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="-mr-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        )}
                        {!system && <div className="w-10" />}
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
                        <div className="space-y-4">
                            {/* System Name */}
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-200">システム名 *</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="例: 新人キャスト用"
                                    className="h-11"
                                />
                            </div>

                            <div className="w-full space-y-2">
                                {/* Hourly/Monthly Settings */}
                                <div className="border rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Switch
                                            checked={enableHourly}
                                            onCheckedChange={setEnableHourly}
                                        />
                                        <span className="font-medium text-gray-900 dark:text-white">時給・月給</span>
                                    </div>
                                    {enableHourly && (
                                        <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center justify-between pt-2">
                                                <Label className="text-gray-700 dark:text-gray-200">月給制にする</Label>
                                                <Switch checked={isMonthly} onCheckedChange={setIsMonthly} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-gray-700 dark:text-gray-200">
                                                    {isMonthly ? "月給額 (円)" : "時給額 (円)"}
                                                </Label>
                                                <Input
                                                    type="number"
                                                    value={hourlyAmount}
                                                    onChange={(e) => setHourlyAmount(Number(e.target.value))}
                                                    className="h-11"
                                                />
                                            </div>

                                            {!isMonthly && (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label className="text-gray-700 dark:text-gray-200">時給発生単位 (分)</Label>
                                                        <Select
                                                            value={String(timeUnitMinutes)}
                                                            onValueChange={(v) => setTimeUnitMinutes(Number(v))}
                                                        >
                                                            <SelectTrigger className="h-11">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="15">15分</SelectItem>
                                                                <SelectItem value="30">30分</SelectItem>
                                                                <SelectItem value="60">60分</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-gray-700 dark:text-gray-200">接客中のみ時給発生</Label>
                                                        <Switch
                                                            checked={duringServiceOnly}
                                                            onCheckedChange={setDuringServiceOnly}
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-gray-700 dark:text-gray-200">休憩中も時給発生</Label>
                                                        <Switch
                                                            checked={includesBreak}
                                                            onCheckedChange={setIncludesBreak}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Store Back */}
                                <div className="border rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Switch
                                            checked={enableStoreBack}
                                            onCheckedChange={setEnableStoreBack}
                                        />
                                        <span className="font-medium text-gray-900 dark:text-white">店舗バック</span>
                                    </div>
                                    {enableStoreBack && (
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <BackSettingsEditor
                                                settings={storeBackSettings}
                                                onChange={setStoreBackSettings}
                                                showVariable={false}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Jounai Back */}
                                <div className="border rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Switch
                                            checked={enableJounaiBack}
                                            onCheckedChange={setEnableJounaiBack}
                                        />
                                        <span className="font-medium text-gray-900 dark:text-white">場内バック</span>
                                    </div>
                                    {enableJounaiBack && (
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <BackSettingsEditor
                                                settings={jounaiBackSettings}
                                                onChange={setJounaiBackSettings}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Shimei Back */}
                                <div className="border rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Switch
                                            checked={enableShimeiBack}
                                            onCheckedChange={setEnableShimeiBack}
                                        />
                                        <span className="font-medium text-gray-900 dark:text-white">指名バック</span>
                                    </div>
                                    {enableShimeiBack && (
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <BackSettingsEditor
                                                settings={shimeiBackSettings}
                                                onChange={setShimeiBackSettings}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Douhan Back */}
                                <div className="border rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Switch
                                            checked={enableDouhanBack}
                                            onCheckedChange={setEnableDouhanBack}
                                        />
                                        <span className="font-medium text-gray-900 dark:text-white">同伴バック</span>
                                    </div>
                                    {enableDouhanBack && (
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <BackSettingsEditor
                                                settings={douhanBackSettings}
                                                onChange={setDouhanBackSettings}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Shared Count Settings */}
                                {(enableJounaiBack || enableShimeiBack || enableDouhanBack) && (
                                    <div className="border rounded-xl px-4 py-3">
                                        <div className="font-medium text-gray-900 dark:text-white mb-3">回数共通設定</div>
                                        <div className="space-y-2">
                                            <Label className="text-gray-700 dark:text-gray-200">共通にする組み合わせ</Label>
                                            <Select value={sharedCountType} onValueChange={setSharedCountType}>
                                                <SelectTrigger className="h-11">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {SHARED_COUNT_OPTIONS.map(opt => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                共通にすると、選択した項目の回数を合算してバック率を計算します。
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Deductions */}
                                <div className="border rounded-xl px-4 py-3">
                                    <div className="font-medium text-gray-900 dark:text-white mb-3">
                                        引かれもの {deductions.length > 0 && `(${deductions.length}件)`}
                                    </div>
                                        <div className="space-y-3">
                                            {deductions.map((deduction, index) => (
                                                <div
                                                    key={deduction.id}
                                                    className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                                >
                                                    <div className="flex flex-col gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => moveDeduction(deduction.id, 'up')}
                                                            disabled={index === 0}
                                                        >
                                                            <ChevronLeft className="h-4 w-4 rotate-90" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => moveDeduction(deduction.id, 'down')}
                                                            disabled={index === deductions.length - 1}
                                                        >
                                                            <ChevronLeft className="h-4 w-4 -rotate-90" />
                                                        </Button>
                                                    </div>

                                                    <div className="flex-1 grid grid-cols-3 gap-2">
                                                        <Input
                                                            value={deduction.name}
                                                            onChange={(e) => updateDeduction(deduction.id, { name: e.target.value })}
                                                            placeholder="項目名"
                                                            className="h-9"
                                                        />
                                                        <Select
                                                            value={deduction.type}
                                                            onValueChange={(v: 'percent' | 'fixed') =>
                                                                updateDeduction(deduction.id, { type: v })
                                                            }
                                                        >
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="percent">パーセント</SelectItem>
                                                                <SelectItem value="fixed">固定金額</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <div className="flex items-center gap-1">
                                                            <Input
                                                                type="number"
                                                                value={deduction.amount}
                                                                onChange={(e) =>
                                                                    updateDeduction(deduction.id, { amount: Number(e.target.value) })
                                                                }
                                                                className="h-9"
                                                            />
                                                            <span className="text-sm text-gray-500 w-6">
                                                                {deduction.type === 'percent' ? '%' : '円'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => removeDeduction(deduction.id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}

                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full"
                                                onClick={addDeduction}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                引かれものを追加
                                            </Button>
                                        </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="border-t px-4 py-3 flex-shrink-0 gap-2">
                        <Button variant="outline" onClick={onClose} disabled={saving}>
                            キャンセル
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {saving ? "保存中..." : "保存"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">削除の確認</DialogTitle>
                    </DialogHeader>
                    <p className="text-gray-600 dark:text-gray-400">
                        この給与システムを削除しますか？この操作は取り消せません。
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                            キャンセル
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? "削除中..." : "削除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
