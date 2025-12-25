"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, Trash2, Plus, GripVertical, X } from "lucide-react";
import { useGlobalLoading } from "@/components/global-loading";
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
import { cn } from "@/lib/utils";
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
    storeShowBreakColumns: boolean;
    storeTimeRoundingEnabled: boolean;
    storeTimeRoundingMinutes: number;
    className?: string;
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

function getDefaultBackSettings(): BackSettings {
    return {
        calculation_type: 'subtotal_percent',
        percentage: undefined,
        fixed_amount: undefined,
        rounding_type: 'round',
        rounding_unit: 100,
        variable_type: 'none',
        reset_period: '1month',
        tiers: [],
    };
}

// Back settings editor component - defined outside to prevent re-renders
function BackSettingsEditor({
    settings,
    onChange,
    showVariable = true,
}: {
    settings: BackSettings;
    onChange: (settings: BackSettings) => void;
    showVariable?: boolean;
}) {
    const variableType = settings.variable_type || 'none';

    const addTier = () => {
        const newTier: BackTier = variableType === 'count' ? {
            min_count: (settings.tiers?.length || 0) + 1,
            percentage: settings.calculation_type === 'fixed' ? undefined : undefined,
            fixed_amount: settings.calculation_type === 'fixed' ? undefined : undefined,
        } : {
            min_amount: (settings.tiers?.length || 0) * 10000 + 10000,
            percentage: settings.calculation_type === 'fixed' ? undefined : undefined,
            fixed_amount: settings.calculation_type === 'fixed' ? undefined : undefined,
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
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">計算方法</Label>
                <Select
                    value={settings.calculation_type}
                    onValueChange={(value: 'total_percent' | 'subtotal_percent' | 'fixed') =>
                        onChange({ ...settings, calculation_type: value })
                    }
                >
                    <SelectTrigger className="h-10">
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
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">パーセント (%)</Label>
                        <Input
                            type="number"
                            value={settings.percentage ?? ""}
                            onChange={(e) => onChange({ ...settings, percentage: e.target.value === "" ? undefined : Number(e.target.value) })}
                            className="h-10"
                            placeholder="10"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">端数処理</Label>
                            <Select
                                value={settings.rounding_type || 'round'}
                                onValueChange={(value: 'round' | 'up' | 'down') =>
                                    onChange({ ...settings, rounding_type: value })
                                }
                            >
                                <SelectTrigger className="h-10">
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
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">端数単位</Label>
                            <Select
                                value={String(settings.rounding_unit || 100)}
                                onValueChange={(value) =>
                                    onChange({ ...settings, rounding_unit: Number(value) as 10 | 100 | 1000 | 10000 })
                                }
                            >
                                <SelectTrigger className="h-10">
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
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">固定金額 (円)</Label>
                    <Input
                        type="number"
                        value={settings.fixed_amount ?? ""}
                        onChange={(e) => onChange({ ...settings, fixed_amount: e.target.value === "" ? undefined : Number(e.target.value) })}
                        className="h-11"
                        placeholder="1000"
                    />
                </div>
            )}

            {showVariable && (
                <>
                    <div className="space-y-2 pt-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">変動設定</Label>
                        <Select
                            value={variableType}
                            onValueChange={(value: 'none' | 'count' | 'amount') => handleVariableTypeChange(value)}
                        >
                            <SelectTrigger className="h-10">
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
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">リセット期間</Label>
                                <Select
                                    value={settings.reset_period || '1month'}
                                    onValueChange={(value) => onChange({ ...settings, reset_period: value as any })}
                                >
                                    <SelectTrigger className="h-10">
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
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">回数別設定</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addTier}
                                    >
                                        <Plus className="h-5 w-5 mr-1" />
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
                                            value={tier.min_count ?? ""}
                                            onChange={(e) => updateTier(index, { min_count: e.target.value === "" ? undefined : Number(e.target.value) })}
                                            className="h-10 w-20"
                                            placeholder="回数"
                                        />
                                        <span className="text-sm text-gray-500 whitespace-nowrap">回以上</span>
                                        {settings.calculation_type !== 'fixed' ? (
                                            <>
                                                <Input
                                                    type="number"
                                                    value={tier.percentage ?? ""}
                                                    onChange={(e) => updateTier(index, { percentage: e.target.value === "" ? undefined : Number(e.target.value) })}
                                                    className="h-10 w-20"
                                                    placeholder="%"
                                                />
                                                <span className="text-sm text-gray-500">%</span>
                                            </>
                                        ) : (
                                            <>
                                                <Input
                                                    type="number"
                                                    value={tier.fixed_amount ?? ""}
                                                    onChange={(e) => updateTier(index, { fixed_amount: e.target.value === "" ? undefined : Number(e.target.value) })}
                                                    className="h-10 w-24"
                                                    placeholder="金額"
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
                                            <X className="h-5 w-5" />
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
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">金額別設定</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addTier}
                                    >
                                        <Plus className="h-5 w-5 mr-1" />
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
                                            value={tier.min_amount ?? ""}
                                            onChange={(e) => updateTier(index, { min_amount: e.target.value === "" ? undefined : Number(e.target.value) })}
                                            className="h-10 w-28"
                                            placeholder="金額"
                                        />
                                        <span className="text-sm text-gray-500 whitespace-nowrap">円以上</span>
                                        {settings.calculation_type !== 'fixed' ? (
                                            <>
                                                <Input
                                                    type="number"
                                                    value={tier.percentage ?? ""}
                                                    onChange={(e) => updateTier(index, { percentage: e.target.value === "" ? undefined : Number(e.target.value) })}
                                                    className="h-10 w-20"
                                                    placeholder="%"
                                                />
                                                <span className="text-sm text-gray-500">%</span>
                                            </>
                                        ) : (
                                            <>
                                                <Input
                                                    type="number"
                                                    value={tier.fixed_amount ?? ""}
                                                    onChange={(e) => updateTier(index, { fixed_amount: e.target.value === "" ? undefined : Number(e.target.value) })}
                                                    className="h-10 w-24"
                                                    placeholder="金額"
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
                                            <X className="h-5 w-5" />
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
}

export function SalarySystemModal({
    isOpen,
    onClose,
    system,
    targetType,
    onSaved,
    onDeleted,
    storeShowBreakColumns,
    storeTimeRoundingEnabled,
    storeTimeRoundingMinutes,
    className,
}: SalarySystemModalProps) {
    const { toast } = useToast();
    const { showLoading, hideLoading } = useGlobalLoading();
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [currentSystemId, setCurrentSystemId] = useState<string | null>(null);
    const [hasUserEdited, setHasUserEdited] = useState(false);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isInitializedRef = useRef(false);

    // Form state
    const [name, setName] = useState("");

    // Hourly settings
    const [enableHourly, setEnableHourly] = useState(false);
    const [hourlyAmountValue, setHourlyAmountValue] = useState(0);
    const [monthlyAmountValue, setMonthlyAmountValue] = useState(0);
    const [timeUnitMinutes, setTimeUnitMinutes] = useState(60);
    const [timeRoundingType, setTimeRoundingType] = useState<'round' | 'up' | 'down'>('round');
    const [amountRoundingType, setAmountRoundingType] = useState<'round' | 'up' | 'down'>('round');
    const [amountRoundingUnit, setAmountRoundingUnit] = useState<10 | 100 | 1000 | 10000>(100);
    const [duringServiceOnly, setDuringServiceOnly] = useState(false);
    const [includesBreak, setIncludesBreak] = useState(false);
    const [syncWithStoreTimeRounding, setSyncWithStoreTimeRounding] = useState(false);

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

    // Initialize form when system changes
    useEffect(() => {
        isInitializedRef.current = false;
        setHasUserEdited(false);
        if (system) {
            setName(system.name);
            setCurrentSystemId(system.id);

            // Hourly settings
            if (system.hourly_settings) {
                setEnableHourly(true);
                // Support both new and legacy fields
                const hs = system.hourly_settings;
                if (hs.hourly_amount !== undefined) {
                    setHourlyAmountValue(hs.hourly_amount);
                } else if (!hs.is_monthly && hs.amount !== undefined) {
                    // Legacy: amount was hourly
                    setHourlyAmountValue(hs.amount);
                } else {
                    setHourlyAmountValue(0);
                }
                if (hs.monthly_amount !== undefined) {
                    setMonthlyAmountValue(hs.monthly_amount);
                } else if (hs.is_monthly && hs.amount !== undefined) {
                    // Legacy: amount was monthly
                    setMonthlyAmountValue(hs.amount);
                } else {
                    setMonthlyAmountValue(0);
                }
                const savedTimeUnit = hs.time_unit_minutes || 60;
                setTimeUnitMinutes(savedTimeUnit);
                setTimeRoundingType(hs.time_rounding_type || 'round');
                setAmountRoundingType(hs.amount_rounding_type || 'round');
                setAmountRoundingUnit(hs.amount_rounding_unit || 100);
                setDuringServiceOnly(hs.during_service_only ?? false);
                setIncludesBreak(hs.includes_break ?? false);
                // Check if it was synced with store time rounding
                setSyncWithStoreTimeRounding(savedTimeUnit === storeTimeRoundingMinutes);
            } else {
                setEnableHourly(false);
                setHourlyAmountValue(0);
                setMonthlyAmountValue(0);
                setTimeUnitMinutes(60);
                setTimeRoundingType('round');
                setAmountRoundingType('round');
                setAmountRoundingUnit(100);
                setDuringServiceOnly(false);
                setIncludesBreak(false);
                setSyncWithStoreTimeRounding(false);
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
            // Mark as initialized after a short delay to prevent initial auto-save
            setTimeout(() => {
                isInitializedRef.current = true;
            }, 100);
        } else {
            // Reset to defaults
            setName("");
            setEnableHourly(false);
            setHourlyAmountValue(0);
            setMonthlyAmountValue(0);
            setTimeUnitMinutes(60);
            setTimeRoundingType('round');
            setAmountRoundingType('round');
            setAmountRoundingUnit(100);
            setDuringServiceOnly(false);
            setIncludesBreak(false);
            setSyncWithStoreTimeRounding(false);
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
            setCurrentSystemId(null);
        }
    }, [system, isOpen, storeTimeRoundingMinutes]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, []);

    // Sync time unit with store time rounding when checkbox is checked
    useEffect(() => {
        if (syncWithStoreTimeRounding) {
            setTimeUnitMinutes(storeTimeRoundingMinutes);
        }
    }, [syncWithStoreTimeRounding, storeTimeRoundingMinutes]);

    // Build input data
    const buildInput = useCallback((): SalarySystemInput => {
        return {
            name: name.trim(),
            target_type: targetType,
            hourly_settings: enableHourly ? {
                hourly_amount: hourlyAmountValue || undefined,
                monthly_amount: monthlyAmountValue || undefined,
                time_unit_minutes: hourlyAmountValue ? timeUnitMinutes : undefined,
                time_rounding_type: hourlyAmountValue ? timeRoundingType : undefined,
                amount_rounding_type: amountRoundingType,
                amount_rounding_unit: amountRoundingUnit,
                during_service_only: hourlyAmountValue ? duringServiceOnly : undefined,
                includes_break: hourlyAmountValue ? includesBreak : undefined,
            } : null,
            store_back_settings: enableStoreBack ? storeBackSettings : null,
            jounai_back_settings: enableJounaiBack ? jounaiBackSettings : null,
            shimei_back_settings: enableShimeiBack ? shimeiBackSettings : null,
            douhan_back_settings: enableDouhanBack ? douhanBackSettings : null,
            shared_count_type: sharedCountType,
            deductions: deductions,
        };
    }, [
        name, targetType, enableHourly, hourlyAmountValue, monthlyAmountValue, timeUnitMinutes,
        timeRoundingType, amountRoundingType, amountRoundingUnit, duringServiceOnly, includesBreak, enableStoreBack,
        storeBackSettings, enableJounaiBack, jounaiBackSettings, enableShimeiBack,
        shimeiBackSettings, enableDouhanBack, douhanBackSettings, sharedCountType, deductions
    ]);

    // Auto save function (for editing existing system)
    const performAutoSave = useCallback(async () => {
        if (!currentSystemId || !name.trim()) return;

        showLoading("保存中...");
        try {
            const input = buildInput();
            const result = await updateSalarySystem(currentSystemId, input);
            if (result.success) {
                onSaved({ id: currentSystemId, ...input, updated_at: new Date().toISOString(), created_at: system?.created_at || new Date().toISOString() } as SalarySystem);
            } else {
                toast({ title: result.error || "保存に失敗しました" });
            }
        } catch (error) {
            toast({ title: "エラーが発生しました" });
        } finally {
            hideLoading();
        }
    }, [currentSystemId, name, buildInput, showLoading, hideLoading, toast, onSaved, system?.created_at]);

    // Debounced auto save trigger
    const triggerAutoSave = useCallback(() => {
        if (!currentSystemId) return;

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }
        autoSaveTimerRef.current = setTimeout(() => {
            performAutoSave();
        }, 800);
    }, [currentSystemId, performAutoSave]);

    // Trigger auto save when form values change (only for editing mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (currentSystemId && isOpen && isInitializedRef.current && hasUserEdited) {
            triggerAutoSave();
        }
    }, [
        hasUserEdited,
        name, enableHourly, hourlyAmountValue, monthlyAmountValue, timeUnitMinutes, timeRoundingType,
        amountRoundingType, amountRoundingUnit, duringServiceOnly, includesBreak, enableStoreBack, storeBackSettings,
        enableJounaiBack, jounaiBackSettings, enableShimeiBack, shimeiBackSettings,
        enableDouhanBack, douhanBackSettings, sharedCountType, deductions,
        // Note: currentSystemId, isOpen, triggerAutoSave are intentionally excluded
        // to prevent auto-save on initial load
    ]);

    // Create new system (manual)
    const handleCreate = async () => {
        if (!name.trim()) {
            toast({ title: "システム名を入力してください" });
            return;
        }

        setSaving(true);
        showLoading("作成中...");
        try {
            const input = buildInput();
            const result = await createSalarySystem(input);
            if (result.success && result.data) {
                toast({ title: "作成しました" });
                setCurrentSystemId(result.data.id);
                onSaved(result.data);
            } else {
                toast({ title: result.error || "作成に失敗しました" });
            }
        } catch (error) {
            toast({ title: "エラーが発生しました" });
        } finally {
            setSaving(false);
            hideLoading();
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
        setHasUserEdited(true);
    };

    // Update deduction
    const updateDeduction = (id: string, updates: Partial<Deduction>) => {
        setDeductions(deductions.map(d => d.id === id ? { ...d, ...updates } : d));
        setHasUserEdited(true);
    };

    // Remove deduction
    const removeDeduction = (id: string) => {
        setDeductions(deductions.filter(d => d.id !== id).map((d, i) => ({ ...d, order: i })));
        setHasUserEdited(true);
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
        setHasUserEdited(true);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className={cn("p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl max-w-[calc(100vw-32px)] sm:max-w-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900", className)}>
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {system ? "給与システム編集" : "給与システム作成"}
                        </DialogTitle>
                        {system ? (
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        ) : (
                            <div className="w-8 h-8" />
                        )}
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-4">
                            {/* System Name */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">システム名 *</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setHasUserEdited(true);
                                    }}
                                    placeholder="例: 新人キャスト用"
                                    className="h-10"
                                />
                            </div>

                            <div className="w-full space-y-2">
                                {/* Hourly/Monthly Settings */}
                                <div className="border rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Switch
                                            checked={enableHourly}
                                            onCheckedChange={(checked) => {
                                                setEnableHourly(checked);
                                                setHasUserEdited(true);
                                            }}
                                        />
                                        <span className="font-medium text-gray-900 dark:text-white">時給・月給</span>
                                    </div>
                                    {enableHourly && (
                                        <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                                            {/* Hourly Amount */}
                                            <div className="space-y-2 pt-2">
                                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    時給額 (円)
                                                </Label>
                                                <Input
                                                    type="number"
                                                    value={hourlyAmountValue === 0 ? "" : hourlyAmountValue}
                                                    onChange={(e) => {
                                                        setHourlyAmountValue(e.target.value === "" ? 0 : Number(e.target.value));
                                                        setHasUserEdited(true);
                                                    }}
                                                    className="h-10"
                                                    placeholder="1500"
                                                />
                                            </div>

                                            {/* Monthly Amount */}
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    月給額 (円)
                                                </Label>
                                                <Input
                                                    type="number"
                                                    value={monthlyAmountValue === 0 ? "" : monthlyAmountValue}
                                                    onChange={(e) => {
                                                        setMonthlyAmountValue(e.target.value === "" ? 0 : Number(e.target.value));
                                                        setHasUserEdited(true);
                                                    }}
                                                    className="h-10"
                                                    placeholder="300000"
                                                />
                                            </div>

                                            {/* Time unit settings - only show when hourly is set */}
                                            {hourlyAmountValue > 0 && (
                                                <>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">時給分割単位 (分)</Label>
                                                            {storeTimeRoundingEnabled && (
                                                                <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={syncWithStoreTimeRounding}
                                                                        onChange={(e) => {
                                                                            setSyncWithStoreTimeRounding(e.target.checked);
                                                                            setHasUserEdited(true);
                                                                        }}
                                                                        className="h-3.5 w-3.5 rounded border-gray-300"
                                                                    />
                                                                    打刻修正単位に合わせる
                                                                </label>
                                                            )}
                                                        </div>
                                                        <Select
                                                            value={String(timeUnitMinutes)}
                                                            onValueChange={(v) => {
                                                                setTimeUnitMinutes(Number(v));
                                                                setHasUserEdited(true);
                                                            }}
                                                            disabled={syncWithStoreTimeRounding}
                                                        >
                                                            <SelectTrigger className={`h-11 ${syncWithStoreTimeRounding ? "opacity-60 cursor-not-allowed" : ""}`}>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="1">1分</SelectItem>
                                                                <SelectItem value="5">5分</SelectItem>
                                                                <SelectItem value="10">10分</SelectItem>
                                                                <SelectItem value="15">15分</SelectItem>
                                                                <SelectItem value="20">20分</SelectItem>
                                                                <SelectItem value="30">30分</SelectItem>
                                                                <SelectItem value="60">60分</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        {syncWithStoreTimeRounding && (
                                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                                タイムカード設定の打刻修正単位（{storeTimeRoundingMinutes}分）に連動しています
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">時間の丸め方</Label>
                                                        <Select
                                                            value={timeRoundingType}
                                                            onValueChange={(v) => {
                                                                setTimeRoundingType(v as 'round' | 'up' | 'down');
                                                                setHasUserEdited(true);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-10">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="round">四捨五入</SelectItem>
                                                                <SelectItem value="down">繰り下げ（切り捨て）</SelectItem>
                                                                <SelectItem value="up">繰り上げ（切り上げ）</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                                            勤務時間を時給分割単位で丸める方法
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">接客中のみ時給発生</Label>
                                                        <Switch
                                                            checked={duringServiceOnly}
                                                            onCheckedChange={(checked) => {
                                                                setDuringServiceOnly(checked);
                                                                setHasUserEdited(true);
                                                            }}
                                                        />
                                                    </div>

                                                    {storeShowBreakColumns && (
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">休憩中も時給発生</Label>
                                                            <Switch
                                                                checked={includesBreak}
                                                                onCheckedChange={(checked) => {
                                                                    setIncludesBreak(checked);
                                                                    setHasUserEdited(true);
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Amount Rounding Settings */}
                                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">金額端数処理</Label>
                                                    <Select
                                                        value={amountRoundingType}
                                                        onValueChange={(v) => {
                                                            setAmountRoundingType(v as 'round' | 'up' | 'down');
                                                            setHasUserEdited(true);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-10">
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
                                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">端数単位</Label>
                                                    <Select
                                                        value={String(amountRoundingUnit)}
                                                        onValueChange={(v) => {
                                                            setAmountRoundingUnit(Number(v) as 10 | 100 | 1000 | 10000);
                                                            setHasUserEdited(true);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-10">
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
                                        </div>
                                    )}
                                </div>

                                {/* Store Back */}
                                <div className="border rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Switch
                                            checked={enableStoreBack}
                                            onCheckedChange={(checked) => {
                                                setEnableStoreBack(checked);
                                                setHasUserEdited(true);
                                            }}
                                        />
                                        <span className="font-medium text-gray-900 dark:text-white">店舗バック</span>
                                    </div>
                                    {enableStoreBack && (
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <BackSettingsEditor
                                                settings={storeBackSettings}
                                                onChange={(settings) => {
                                                    setStoreBackSettings(settings);
                                                    setHasUserEdited(true);
                                                }}
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
                                            onCheckedChange={(checked) => {
                                                setEnableJounaiBack(checked);
                                                setHasUserEdited(true);
                                            }}
                                        />
                                        <span className="font-medium text-gray-900 dark:text-white">場内バック</span>
                                    </div>
                                    {enableJounaiBack && (
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <BackSettingsEditor
                                                settings={jounaiBackSettings}
                                                onChange={(settings) => {
                                                    setJounaiBackSettings(settings);
                                                    setHasUserEdited(true);
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Shimei Back */}
                                <div className="border rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Switch
                                            checked={enableShimeiBack}
                                            onCheckedChange={(checked) => {
                                                setEnableShimeiBack(checked);
                                                setHasUserEdited(true);
                                            }}
                                        />
                                        <span className="font-medium text-gray-900 dark:text-white">指名バック</span>
                                    </div>
                                    {enableShimeiBack && (
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <BackSettingsEditor
                                                settings={shimeiBackSettings}
                                                onChange={(settings) => {
                                                    setShimeiBackSettings(settings);
                                                    setHasUserEdited(true);
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Douhan Back */}
                                <div className="border rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Switch
                                            checked={enableDouhanBack}
                                            onCheckedChange={(checked) => {
                                                setEnableDouhanBack(checked);
                                                setHasUserEdited(true);
                                            }}
                                        />
                                        <span className="font-medium text-gray-900 dark:text-white">同伴バック</span>
                                    </div>
                                    {enableDouhanBack && (
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <BackSettingsEditor
                                                settings={douhanBackSettings}
                                                onChange={(settings) => {
                                                    setDouhanBackSettings(settings);
                                                    setHasUserEdited(true);
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Shared Count Settings */}
                                {(enableJounaiBack || enableShimeiBack || enableDouhanBack) && (
                                    <div className="border rounded-xl px-4 py-3">
                                        <div className="font-medium text-gray-900 dark:text-white mb-3">回数共通設定</div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">共通にする組み合わせ</Label>
                                            <Select
                                                value={sharedCountType}
                                                onValueChange={(value) => {
                                                    setSharedCountType(value);
                                                    setHasUserEdited(true);
                                                }}
                                            >
                                                <SelectTrigger className="h-10">
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
                                                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => moveDeduction(deduction.id, 'up')}
                                                                disabled={index === 0}
                                                            >
                                                                <ChevronLeft className="h-5 w-5 rotate-90" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => moveDeduction(deduction.id, 'down')}
                                                                disabled={index === deductions.length - 1}
                                                            >
                                                                <ChevronLeft className="h-5 w-5 -rotate-90" />
                                                            </Button>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                                                {index + 1}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => removeDeduction(deduction.id)}
                                                        >
                                                            <X className="h-5 w-5" />
                                                        </Button>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Input
                                                            value={deduction.name}
                                                            onChange={(e) => updateDeduction(deduction.id, { name: e.target.value })}
                                                            placeholder="項目名"
                                                            className="h-10"
                                                        />
                                                        <div className="flex gap-2">
                                                            <Select
                                                                value={deduction.type}
                                                                onValueChange={(v: 'percent' | 'fixed') =>
                                                                    updateDeduction(deduction.id, { type: v })
                                                                }
                                                            >
                                                                <SelectTrigger className="h-10 w-32">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="percent">パーセント</SelectItem>
                                                                    <SelectItem value="fixed">固定金額</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <div className="flex-1 flex items-center gap-2">
                                                                <Input
                                                                    type="number"
                                                                    value={deduction.amount === 0 ? "" : deduction.amount}
                                                                    onChange={(e) =>
                                                                        updateDeduction(deduction.id, { amount: e.target.value === "" ? 0 : Number(e.target.value) })
                                                                    }
                                                                    className="h-10"
                                                                    placeholder={deduction.type === 'percent' ? "10" : "1000"}
                                                                />
                                                                <span className="text-sm text-gray-500 dark:text-gray-400 w-6 shrink-0">
                                                                    {deduction.type === 'percent' ? '%' : '円'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full"
                                                onClick={addDeduction}
                                            >
                                                <Plus className="h-5 w-5 mr-2" />
                                                引かれものを追加
                                            </Button>
                                        </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Show create button only for new system (not editing) */}
                    {!currentSystemId && (
                        <DialogFooter className="border-t border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0 gap-2">
                            <Button
                                onClick={handleCreate}
                                disabled={saving}
                                className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {saving ? "作成中..." : "作成"}
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">削除の確認</DialogTitle>
                    </DialogHeader>
                    <p className="text-gray-600 dark:text-gray-400 py-2">
                        この給与システムを削除しますか？この操作は取り消せません。
                    </p>
                    <DialogFooter className="flex flex-col gap-2">
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="w-full h-11 rounded-lg"
                        >
                            {deleting ? "削除中..." : "削除"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={deleting}
                            className="w-full h-11 rounded-lg"
                        >
                            キャンセル
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
