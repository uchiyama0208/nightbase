"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, MoreHorizontal, Send, UserCircle, Heart, Edit2, Trash2, Upload, Download, Pencil, Calendar, Clock, MapPin, X, Plus, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    updateUser,
    createUser,
    deleteUser,
    getProfileDetails,
    updateProfileRelationships,
    uploadProfileAvatar,
    deleteProfileAvatar,
    getUserBottleKeeps,
    getUserEditModalData,
    getProfileReportData,
    updateProfileSalarySystems,
    createPastEmployment,
    updatePastEmployment,
    deletePastEmployment,
    generateProfileAIReport,
} from "./actions";
import { getMenus } from "../menus/actions";
import { BottleModal } from "../bottles/bottle-modal";
import { SalarySystemSelectorModal } from "./salary-system-selector-modal";
import { SalarySystemModal } from "../salary-systems/salary-system-modal";
import { toast } from "@/components/ui/use-toast";
import { RoleFormModal } from "../settings/roles/role-form-modal";
import { getRoles, assignRoleToProfile, setAdminRole } from "../settings/roles/actions";
import { useSearchParams } from "next/navigation";
import { UserAttendanceListModal } from "./user-attendance-list-modal";
import { AttendanceModal } from "../attendance/attendance-modal";
import { RelationshipSelectorModal } from "./relationship-selector-modal";
import { formatJSTDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { CommentSection } from "@/components/comment-section";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/components/ui/use-toast";
import { VercelTabs } from "@/components/ui/vercel-tabs";
import { useGlobalLoading } from "@/components/global-loading";

interface Profile {
    id: string;
    display_name: string | null;
    display_name_kana: string | null;
    real_name: string | null;
    real_name_kana: string | null;
    last_name?: string | null;
    first_name?: string | null;
    last_name_kana?: string | null;
    first_name_kana?: string | null;
    zip_code?: string | null;
    prefecture?: string | null;
    city?: string | null;
    street?: string | null;
    building?: string | null;
    birth_date?: string | null;
    phone_number?: string | null;
    emergency_phone_number?: string | null;
    nearest_station?: string | null;
    role: string;
    role_id?: string | null;
    store_id: string;
    guest_addressee?: string | null;
    guest_receipt_type?: string | null;
    stores?: { name: string } | null;
    avatar_url?: string | null;
}

interface PagePermissions {
    bottles: boolean;
    resumes: boolean;
    salarySystems: boolean;
    attendance: boolean;
    personalInfo: boolean;
}

interface UserEditModalProps {
    profile: Profile | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isNested?: boolean;
    defaultRole?: string;
    hidePersonalInfo?: boolean;
    onDelete?: (profileId: string) => void;
    onUpdate?: (profile: Partial<Profile> & { id: string }) => void;
    onCreated?: () => void;
    canEdit?: boolean;
    pagePermissions?: PagePermissions;
}

export function UserEditModal({ profile, open, onOpenChange, isNested = false, defaultRole: propDefaultRole, hidePersonalInfo = false, onDelete, onUpdate, onCreated, canEdit = false, pagePermissions }: UserEditModalProps) {
    const searchParams = useSearchParams();
    const defaultRole = propDefaultRole || searchParams.get("role") || "cast";
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { showLoading, hideLoading } = useGlobalLoading();
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [role, setRole] = useState<string>(profile?.role ?? defaultRole);
    const roleToggleRef = React.useRef<HTMLDivElement>(null);
    const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });

    const [showActions, setShowActions] = useState(false);
    const [showAttendanceList, setShowAttendanceList] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showAvatarDeleteConfirm, setShowAvatarDeleteConfirm] = useState(false);
    const [editingAttendanceRecord, setEditingAttendanceRecord] = useState<any>(null);

    // 名刺AI読み取り用state
    const [isParsingBusinessCard, setIsParsingBusinessCard] = useState(false);
    const [businessCardFormData, setBusinessCardFormData] = useState<{
        displayName?: string;
        displayNameKana?: string;
    }>({});
    const businessCardInputRef = React.useRef<HTMLInputElement>(null);

    // Relationships state
    const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
    const [relationships, setRelationships] = useState<any[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);

    // Relationship selector state
    const [relationshipSelectorOpen, setRelationshipSelectorOpen] = useState<string | null>(null);
    const [nestedProfileId, setNestedProfileId] = useState<string | null>(null);

    // Bottle Keeps state
    const [bottleKeeps, setBottleKeeps] = useState<any[]>([]);
    const [menus, setMenus] = useState<any[]>([]);
    const [isBottleModalOpen, setIsBottleModalOpen] = useState(false);

    // Past Employments state
    const [pastEmployments, setPastEmployments] = useState<any[]>([]);
    const [originalPastEmployments, setOriginalPastEmployments] = useState<any[]>([]);

    // Salary Systems state
    const [salarySystems, setSalarySystems] = useState<any[]>([]);
    const [selectedSalarySystemId, setSelectedSalarySystemId] = useState<string | null>(null);
    const [salarySystemSelectorOpen, setSalarySystemSelectorOpen] = useState(false);
    const [salarySystemCreateOpen, setSalarySystemCreateOpen] = useState(false);
    const [salarySystemDetailOpen, setSalarySystemDetailOpen] = useState<any>(null);
    const [salarySystemDetailFromSelector, setSalarySystemDetailFromSelector] = useState(false);
    const [salarySystemRemoveConfirmOpen, setSalarySystemRemoveConfirmOpen] = useState(false);

    // Role/Permission state
    const [storeRoles, setStoreRoles] = useState<any[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [roleSelectorOpen, setRoleSelectorOpen] = useState(false);
    const [roleRemoveConfirmOpen, setRoleRemoveConfirmOpen] = useState(false);

    // Accordion state for sections
    const [compatibilityAccordionOpen, setCompatibilityAccordionOpen] = useState<string | undefined>(undefined);
    const [resumeAccordionOpen, setResumeAccordionOpen] = useState<string | undefined>(undefined);
    const [personalInfoAccordionOpen, setPersonalInfoAccordionOpen] = useState<string | undefined>(undefined);

    // Tab toggle state (基本情報 / レポート)
    const [activeTab, setActiveTab] = useState<'info' | 'report'>('info');
    const tabToggleRef = React.useRef<HTMLDivElement>(null);
    const [tabSliderStyle, setTabSliderStyle] = useState({ left: 0, width: 0 });

    // Report data state
    const [reportData, setReportData] = useState<any>(null);
    const [isLoadingReport, setIsLoadingReport] = useState(false);

    // AI Report state
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [isGeneratingAIReport, setIsGeneratingAIReport] = useState(false);

    // Status state for form submission (shadcn Select doesn't work with FormData)
    const [statusValue, setStatusValue] = useState<string>((profile as any)?.status || "在籍中");

    // Address state for auto-fill
    const [addressState, setAddressState] = useState({
        zipCode: "",
        prefecture: "",
        city: "",
        street: "",
        building: ""
    });

    useEffect(() => {
        if (profile) {
            setAddressState({
                zipCode: profile.zip_code || "",
                prefecture: profile.prefecture || "",
                city: profile.city || "",
                street: profile.street || "",
                building: profile.building || ""
            });
        } else {
            setAddressState({
                zipCode: "",
                prefecture: "",
                city: "",
                street: "",
                building: ""
            });
        }
    }, [profile]);

    // 名刺AI読み取りハンドラー
    const handleBusinessCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsingBusinessCard(true);
        try {
            const formData = new FormData();
            formData.append("image", file);

            const response = await fetch("/api/ai/parse-business-card", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("名刺の読み取りに失敗しました");
            }

            const data = await response.json();
            setBusinessCardFormData({
                displayName: data.name || "",
                displayNameKana: data.nameKana || "",
            });
            toast({
                title: "名刺を読み取りました",
                description: "情報を確認して保存してください",
            });
        } catch (error) {
            console.error("Business card parse error:", error);
            toast({
                title: "エラー",
                description: "名刺の読み取りに失敗しました",
                variant: "destructive",
            });
        } finally {
            setIsParsingBusinessCard(false);
            if (businessCardInputRef.current) {
                businessCardInputRef.current.value = "";
            }
        }
    };

    const handleZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setAddressState(prev => ({ ...prev, zipCode: value }));

        if (value.length === 7) {
            try {
                const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${value}`);
                const data = await response.json();
                if (data.results?.[0]) {
                    const { address1, address2, address3 } = data.results[0];
                    setAddressState(prev => ({
                        ...prev,
                        zipCode: value,
                        prefecture: address1,
                        city: address2,
                        street: address3
                    }));
                }
            } catch (error) {
                console.error("Failed to fetch address:", error);
            }
        }
    };

    const handleAddressChange = (field: keyof typeof addressState) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddressState(prev => ({ ...prev, [field]: e.target.value }));
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleAvatarClick = () => {
        if (!profile) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            await uploadProfileAvatar(profile.id, formData);
            await queryClient.invalidateQueries({ queryKey: ["users"] });
        } catch (error) {
            console.error("Avatar upload failed:", error);
            toast({
                title: "エラー",
                description: "アップロードに失敗しました",
                variant: "destructive",
            });
        }
    };

    const handleDeleteAvatar = async () => {
        if (!profile) return;
        try {
            await deleteProfileAvatar(profile.id);
            await queryClient.invalidateQueries({ queryKey: ["users"] });
            setShowAvatarDeleteConfirm(false);
        } catch (error) {
            console.error("Avatar delete failed:", error);
            toast({
                title: "エラー",
                description: "削除に失敗しました",
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        setRole(profile?.role ?? defaultRole);
        setStatusValue((profile as any)?.status || "在籍中");
    }, [profile, defaultRole]);

    // Reload salary systems when role changes (for new profile creation)
    useEffect(() => {
        if (!profile && open && (role === "cast" || role === "staff" || role === "partner")) {
            const fetchSalarySystems = async () => {
                const data = await getUserEditModalData(null, role);
                if (data) {
                    setSalarySystems(data.salarySystems || []);
                    setSelectedSalarySystemId(null);
                }
            };
            fetchSalarySystems();
        }
    }, [role, profile, open]);

    // Handler for saving salary systems
    const handleSaveSalarySystems = async () => {
        if (!profile) return;
        try {
            const ids = selectedSalarySystemId ? [selectedSalarySystemId] : [];
            await updateProfileSalarySystems(profile.id, ids);
        } catch (error) {
            console.error("Failed to save salary systems:", error);
        }
    };

    // Handler for newly created salary system
    const handleSalarySystemCreated = (newSystem: any) => {
        setSalarySystems(prev => [...prev, newSystem]);
        setSelectedSalarySystemId(newSystem.id);
        setSalarySystemCreateOpen(false);
    };

    // Handler for salary system changes
    const handleSalarySystemChange = async (systemId: string | null) => {
        if (!profile) return;
        try {
            const ids = systemId ? [systemId] : [];
            await updateProfileSalarySystems(profile.id, ids);
        } catch (error) {
            console.error("Failed to update salary system:", error);
        }
    };

    // Update slider position when role changes
    const isNewProfile = !profile;
    useEffect(() => {
        const updateSlider = () => {
            if (!roleToggleRef.current) return;
            const buttons = roleToggleRef.current.querySelectorAll('button');
            const roleIndex = role === "cast" ? 0 : role === "staff" ? 1 : role === "guest" ? 2 : 3;
            const button = buttons[roleIndex] as HTMLButtonElement;
            if (button) {
                setSliderStyle({
                    left: button.offsetLeft,
                    width: button.offsetWidth,
                });
            }
        };

        // Initial delay to wait for DOM render
        if (open && isNewProfile) {
            const timer = setTimeout(updateSlider, 50);
            return () => clearTimeout(timer);
        }
        updateSlider();
    }, [role, open, isNewProfile]);

    // Update tab slider position when activeTab changes
    useEffect(() => {
        const updateTabSlider = () => {
            if (!tabToggleRef.current) return;
            const buttons = tabToggleRef.current.querySelectorAll('button');
            const tabIndex = activeTab === 'info' ? 0 : 1;
            const button = buttons[tabIndex] as HTMLButtonElement;
            if (button) {
                setTabSliderStyle({
                    left: button.offsetLeft,
                    width: button.offsetWidth,
                });
            }
        };

        // 初回マウント時のみ少し遅延（DOMレンダリング待ち）
        if (open && profile && tabSliderStyle.width === 0) {
            const timer = setTimeout(updateTabSlider, 10);
            return () => clearTimeout(timer);
        }
        // タブ切り替え時は即座に更新
        updateTabSlider();
    }, [activeTab, open, profile, tabSliderStyle.width]);

    // Fetch report data when switching to report tab
    useEffect(() => {
        if (activeTab === 'report' && profile && !reportData && !isLoadingReport) {
            setIsLoadingReport(true);
            getProfileReportData(profile.id, role).then(data => {
                setReportData(data);
                setIsLoadingReport(false);
            }).catch(error => {
                console.error("Failed to fetch report data:", error);
                setIsLoadingReport(false);
            });
        }
    }, [activeTab, profile, role, reportData, isLoadingReport]);

    // Reset tab and report data when profile changes
    useEffect(() => {
        setActiveTab('info');
        setReportData(null);
        setAiReport(null);
    }, [profile?.id]);

    // Handle AI report generation
    const handleGenerateAIReport = async () => {
        if (!profile) return;

        setIsGeneratingAIReport(true);
        try {
            const result = await generateProfileAIReport(profile.id, role);
            if (result.success && result.report) {
                setAiReport(result.report);
            } else {
                toast({
                    title: "エラー",
                    description: result.error || "AIレポートの生成に失敗しました",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Failed to generate AI report:", error);
            toast({
                title: "エラー",
                description: "AIレポートの生成中にエラーが発生しました",
                variant: "destructive",
            });
        } finally {
            setIsGeneratingAIReport(false);
        }
    };

    // Section-based edit mode states
    const [editingSection, setEditingSection] = useState<string | null>(!profile ? 'all' : null);
    const formRef = React.useRef<HTMLFormElement>(null);

    // Reset edit mode when profile changes
    useEffect(() => {
        setEditingSection(!profile ? 'all' : null);
    }, [profile?.id]);

    // Helper to check if a section is being edited
    const isEditingSection = (section: string) => editingSection === section || editingSection === 'all';

    // Handle save for a section
    const handleSectionSave = async (section: string) => {
        const form = formRef.current;
        if (!form || !profile) return;

        // Check edit permission
        if (!canEdit) {
            toast({
                title: "権限エラー",
                description: "編集権限がありません",
                variant: "destructive",
            });
            return;
        }

        const formData = new FormData(form);
        try {
            const result = await updateUser(formData);

            if (!result.success) {
                toast({
                    title: "エラー",
                    description: result.error || "保存に失敗しました",
                    variant: "destructive",
                });
                return;
            }

            // 履歴書セクションの場合は過去在籍店も保存
            if (section === 'resume') {
                await savePastEmployments();
            }

            setEditingSection(null);
            await queryClient.invalidateQueries({ queryKey: ["users"] });
        } catch (error) {
            console.error("Failed to save:", error);
            toast({
                title: "エラー",
                description: "保存に失敗しました",
                variant: "destructive",
            });
        }
    };

    // 過去在籍店の差分を計算して保存
    const savePastEmployments = async () => {
        if (!profile) return;

        const originalIds = new Set(originalPastEmployments.map(e => e.id));
        const currentIds = new Set(pastEmployments.filter(e => !e.id.startsWith('new-')).map(e => e.id));

        // 削除されたもの
        const toDelete = originalPastEmployments.filter(e => !currentIds.has(e.id));

        // 新規追加されたもの
        const toCreate = pastEmployments.filter(e => e.id.startsWith('new-'));

        // 更新されたもの（IDが既存で、内容が変わったもの）
        const toUpdate = pastEmployments.filter(e => {
            if (e.id.startsWith('new-')) return false;
            const original = originalPastEmployments.find(o => o.id === e.id);
            if (!original) return false;
            return (
                e.store_name !== original.store_name ||
                e.period !== original.period ||
                e.hourly_wage !== original.hourly_wage ||
                e.sales_amount !== original.sales_amount ||
                e.customer_count !== original.customer_count
            );
        });

        // 削除処理
        for (const emp of toDelete) {
            await deletePastEmployment(emp.id);
        }

        // 新規作成処理
        for (const emp of toCreate) {
            if (!emp.store_name) continue; // 店舗名が空なら作成しない
            const formData = new FormData();
            formData.set('profileId', profile.id);
            formData.set('storeName', emp.store_name);
            formData.set('period', emp.period || '');
            formData.set('hourlyWage', emp.hourly_wage?.toString() || '');
            formData.set('salesAmount', emp.sales_amount?.toString() || '');
            formData.set('customerCount', emp.customer_count?.toString() || '');
            await createPastEmployment(formData);
        }

        // 更新処理
        for (const emp of toUpdate) {
            const formData = new FormData();
            formData.set('storeName', emp.store_name);
            formData.set('period', emp.period || '');
            formData.set('hourlyWage', emp.hourly_wage?.toString() || '');
            formData.set('salesAmount', emp.sales_amount?.toString() || '');
            formData.set('customerCount', emp.customer_count?.toString() || '');
            await updatePastEmployment(emp.id, formData);
        }

        // 保存後、originalを更新
        setOriginalPastEmployments(pastEmployments);
    };

    // Handle cancel for a section
    const handleSectionCancel = () => {
        setEditingSection(null);
        // 過去在籍店データを元に戻す
        setPastEmployments(originalPastEmployments);
        // Reset form values by invalidating cache
        queryClient.invalidateQueries({ queryKey: ["users"] });
    };

    // 自動保存関数（既存データ編集時のみ使用）
    const performAutoSave = useCallback(async () => {
        const form = formRef.current;
        if (!form || !profile || !canEdit) return;

        showLoading("保存中...");
        try {
            const formData = new FormData(form);
            const result = await updateUser(formData);

            if (!result.success) {
                toast({
                    title: "エラー",
                    description: result.error || "保存に失敗しました",
                    variant: "destructive",
                });
                return;
            }

            await queryClient.invalidateQueries({ queryKey: ["users"] });
        } catch (error) {
            console.error("Auto save failed:", error);
            toast({
                title: "エラー",
                description: "保存に失敗しました",
                variant: "destructive",
            });
        } finally {
            hideLoading();
        }
    }, [profile, canEdit, showLoading, hideLoading, toast, queryClient]);

    // デバウンス付き自動保存をトリガーする関数
    const triggerAutoSave = useCallback(() => {
        if (!profile) return; // 新規作成時は自動保存しない

        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(() => {
            performAutoSave();
        }, 800);
    }, [profile, performAutoSave]);

    // クリーンアップ
    useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, []);

    // Memoize profile id and role to prevent unnecessary re-fetches
    const profileId = profile?.id;
    const profileRole = profile?.role;

    useEffect(() => {
        if (open) {
            const fetchData = async () => {
                setIsLoadingDetails(true);
                try {
                    // Single server action call to fetch all data at once
                    const data = await getUserEditModalData(
                        profileId || null,
                        profileRole || null
                    );

                    if (data) {
                        setAllProfiles(data.allProfiles as any[]);
                        setCurrentUserProfileId(data.currentUserProfileId);
                        setRelationships(data.relationships);
                        setBottleKeeps(data.bottleKeeps);
                        setPastEmployments(data.pastEmployments);
                        setOriginalPastEmployments(data.pastEmployments);
                        setSalarySystems(data.salarySystems || []);
                        // 単一選択: 最初の1つを選択（または null）
                        const assignedIds = data.assignedSalarySystemIds || [];
                        setSelectedSalarySystemId(assignedIds.length > 0 ? assignedIds[0] : null);
                    }

                    // Fetch store roles
                    const roles = await getRoles();
                    setStoreRoles(roles);
                    // Set selected role from profile
                    setSelectedRoleId(profile?.role_id || null);

                    // Only fetch menus when needed (for bottle modal) - lazy load
                    // Menus will be fetched when bottle modal opens
                } catch (error) {
                    console.error("Failed to fetch details:", error);
                } finally {
                    setIsLoadingDetails(false);
                }
            };
            fetchData();
        } else {
            // Reset state on close
            setRelationships([]);
            setBottleKeeps([]);
            setMenus([]);
            setPastEmployments([]);
            setSalarySystems([]);
            setSelectedSalarySystemId(null);
            setStoreRoles([]);
            setSelectedRoleId(null);
        }
    }, [open, profileId, profileRole]);

    const refreshBottleKeeps = async () => {
        if (!profile) return;
        const keeps = await getUserBottleKeeps(profile.id);
        setBottleKeeps(keeps);
    };

    // Handler for role assignment change
    const handleRoleAssign = async (roleId: string | null) => {
        if (!profile) return;
        try {
            await assignRoleToProfile(profile.id, roleId);
            setSelectedRoleId(roleId);
            setRoleSelectorOpen(false);
        } catch (error) {
            console.error("Failed to assign role:", error);
            const message = error instanceof Error ? error.message : "権限の適用に失敗しました";
            toast({ title: message, variant: "destructive" });
        }
    };

    // Handler for role creation
    const handleRoleCreated = async () => {
        setRoleModalOpen(false);
        // Refresh roles list
        const roles = await getRoles();
        setStoreRoles(roles);
    };

    // Handler for setting admin role
    const handleSetAdminRole = async () => {
        if (!profile) return;
        try {
            await setAdminRole(profile.id, true);
            // Update local state
            setRole("admin");
            setSelectedRoleId(null);
            setRoleSelectorOpen(false);
            await queryClient.invalidateQueries({ queryKey: ["users"] });
        } catch (error: unknown) {
            console.error("Failed to set admin role:", error);
            const message = error instanceof Error ? error.message : "管理者権限の付与に失敗しました";
            toast({
                title: "エラー",
                description: message,
                variant: "destructive",
            });
        }
    };

    const handleSubmit = async (formData: FormData) => {
        // Check edit permission on client side first
        if (!canEdit) {
            toast({
                title: "権限エラー",
                description: "編集権限がありません",
                variant: "destructive",
            });
            return;
        }

        // Call server action first to check permissions
        const result = profile
            ? await updateUser(formData)
            : await createUser(formData);

        if (!result.success) {
            toast({
                title: "エラー",
                description: result.error || "保存に失敗しました",
                variant: "destructive",
            });
            return;
        }

        // Extract form data for optimistic update
        const updatedData = {
            id: profile?.id || "",
            display_name: formData.get("displayName") as string,
            display_name_kana: formData.get("displayNameKana") as string || null,
            real_name: formData.get("realName") as string || null,
            real_name_kana: formData.get("realNameKana") as string || null,
            role: formData.get("role") as string,
        };

        // Success: close modal and update parent
        onOpenChange(false);
        if (profile && onUpdate) {
            onUpdate(updatedData);
        }
        if (!profile && onCreated) {
            onCreated();
        }
        await queryClient.invalidateQueries({ queryKey: ["users"] });
    };

    const handleDelete = async () => {
        if (!profile) return;

        // Check edit permission on client side first
        if (!canEdit) {
            toast({
                title: "権限エラー",
                description: "削除権限がありません",
                variant: "destructive",
            });
            return;
        }

        // Call server action first to check permissions
        const result = await deleteUser(profile.id);
        if (!result.success) {
            toast({
                title: "エラー",
                description: result.error || "削除に失敗しました",
                variant: "destructive",
            });
            setShowDeleteConfirm(false);
            return;
        }

        // Success: close modals and notify parent
        setShowDeleteConfirm(false);
        onOpenChange(false);

        if (onDelete) {
            onDelete(profile.id);
        }
        await queryClient.invalidateQueries({ queryKey: ["users"] });
    };

    const handleRelationshipChange = async (type: string, selectedIds: string[]) => {
        if (!profile) return;

        // Check edit permission
        if (!canEdit) {
            toast({
                title: "権限エラー",
                description: "編集権限がありません",
                variant: "destructive",
            });
            return;
        }

        try {
            await updateProfileRelationships(profile.id, type, selectedIds);
            // Refresh local state
            const details = await getProfileDetails(profile.id);
            if (details) {
                setRelationships(details.relationships);
            }
        } catch (error) {
            console.error(`Failed to update ${type}:`, error);
            toast({
                title: "エラー",
                description: "更新に失敗しました",
                variant: "destructive",
            });
        }
    };

    // Helper to get selected IDs for a relationship type
    const getSelectedIds = (type: string) => {
        if (!profile) return [];
        return relationships
            .filter((r) => r.relationship_type === type)
            .map((r) => (r.source_profile_id === profile.id ? r.target_profile_id : r.source_profile_id));
    };

    // Helper to get selected profile objects
    const getSelectedProfiles = (type: string) => {
        const selectedIds = getSelectedIds(type);
        return allProfiles.filter((p) => selectedIds.includes(p.id));
    };


    // Helper to filter profiles for selection
    const getOptions = (filterRole?: string | string[]) => {
        let filtered = allProfiles.filter((p) => p.id !== profile?.id);
        if (filterRole) {
            const roles = Array.isArray(filterRole) ? filterRole : [filterRole];
            filtered = filtered.filter((p) => roles.includes(p.role));
        }
        return filtered.map((p) => ({
            label: p.display_name || p.real_name || "Unknown",
            value: p.id,
        }));
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl sm:max-w-2xl">
                    <DialogTitle className="sr-only">
                        {profile ? (profile.display_name || "ユーザー編集") : "新規作成"}
                    </DialogTitle>
                    {/* Header */}
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {profile ? (profile.display_name || "ユーザー編集") : "新規作成"}
                        </span>
                        {profile ? (
                            <button
                                type="button"
                                onClick={() => setShowActions(!showActions)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="オプション"
                            >
                                <MoreHorizontal className="h-5 w-5" />
                            </button>
                        ) : (role === "guest" || role === "partner") ? (
                            <>
                                <input
                                    ref={businessCardInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleBusinessCardUpload}
                                />
                                <button
                                    type="button"
                                    onClick={() => businessCardInputRef.current?.click()}
                                    disabled={isParsingBusinessCard}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 transition-all"
                                    aria-label="名刺から追加"
                                >
                                    {isParsingBusinessCard ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                        <Sparkles className="h-4 w-4" />
                                    )}
                                </button>
                            </>
                        ) : (
                            <div className="w-8 h-8" />
                        )}
                    </DialogHeader>

                    {/* Actions Menu (positioned relative to the panel) */}
                    {showActions && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                            <div className="absolute right-4 top-14 z-50 w-40 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-2 flex flex-col gap-1 text-sm animate-in fade-in zoom-in-95 duration-200">
                                {pagePermissions?.attendance !== false && (
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        onClick={() => {
                                            setShowActions(false);
                                            setShowAttendanceList(true);
                                        }}
                                    >
                                        勤怠一覧
                                    </button>
                                )}
                                {profile?.id !== currentUserProfileId && (
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        onClick={() => {
                                            setShowActions(false);
                                            setShowDeleteConfirm(true);
                                        }}
                                    >
                                        削除
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
                    <form
                            ref={formRef}
                            id="profile-form"
                            action={handleSubmit}
                            className="space-y-4"
                            key={profile?.id || 'new'}
                            data-profile-form
                        >
                            {profile && <input type="hidden" name="profileId" value={profile.id} />}
                            <input type="hidden" name="role" value={role} />

                            {profile && (
                                <>
                                    {/* Vercel-style Tab Navigation - 基本情報 / レポート */}
                                    <div className="relative mb-4 -mt-2">
                                        <div ref={tabToggleRef} className="flex">
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('info')}
                                                className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                                                    activeTab === 'info'
                                                        ? "text-gray-900 dark:text-white"
                                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                                }`}
                                            >
                                                基本情報
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('report')}
                                                className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                                                    activeTab === 'report'
                                                        ? "text-gray-900 dark:text-white"
                                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                                }`}
                                            >
                                                レポート
                                            </button>
                                        </div>
                                        <div
                                            className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                                            style={{ left: tabSliderStyle.left, width: tabSliderStyle.width }}
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
                                    </div>
                                </>
                            )}

                            {!profile && (
                                <VercelTabs
                                    tabs={[
                                        { key: "cast", label: "キャスト" },
                                        { key: "staff", label: "スタッフ" },
                                        { key: "guest", label: "ゲスト" },
                                        { key: "partner", label: "パートナー" },
                                    ]}
                                    value={role}
                                    onChange={setRole}
                                    className="mb-4"
                                />
                            )}

                            {/* レポートタブ */}
                            {profile && activeTab === 'report' && (
                                <div className="space-y-6">
                                    {isLoadingReport ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        </div>
                                    ) : reportData ? (
                                        role === 'guest' ? (
                                            /* ゲストのレポート */
                                            <div className="space-y-6">
                                                {/* 来店回数カード */}
                                                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-purple-100 text-sm font-medium">総来店回数</p>
                                                            <p className="text-4xl font-bold mt-1">{reportData.visitCount}</p>
                                                            <p className="text-purple-100 text-sm mt-1">回</p>
                                                        </div>
                                                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                                            <MapPin className="w-8 h-8" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 月別来店グラフ */}
                                                {reportData.monthlyVisits && Object.keys(reportData.monthlyVisits).length > 0 && (
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">月別来店回数</h4>
                                                        <div className="space-y-2">
                                                            {Object.entries(reportData.monthlyVisits as Record<string, number>)
                                                                .sort(([a], [b]) => b.localeCompare(a))
                                                                .slice(0, 6)
                                                                .map(([month, count]) => {
                                                                    const maxCount = Math.max(...Object.values(reportData.monthlyVisits as Record<string, number>));
                                                                    const percentage = (count / maxCount) * 100;
                                                                    return (
                                                                        <div key={month} className="flex items-center gap-3">
                                                                            <span className="text-xs text-gray-500 w-16">{month}</span>
                                                                            <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                                                                                    style={{ width: `${percentage}%` }}
                                                                                />
                                                                            </div>
                                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8 text-right">{count}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* キャスト・スタッフのレポート */
                                            <div className="space-y-6">
                                                {/* 統計カード */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* 出勤回数 */}
                                                    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 text-white">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                                                <Calendar className="w-5 h-5" />
                                                            </div>
                                                        </div>
                                                        <p className="text-3xl font-bold">{reportData.attendanceCount}</p>
                                                        <p className="text-blue-100 text-sm">出勤回数</p>
                                                    </div>

                                                    {/* 総勤務時間 */}
                                                    <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 text-white">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                                                <Clock className="w-5 h-5" />
                                                            </div>
                                                        </div>
                                                        <p className="text-3xl font-bold">
                                                            {Math.floor(reportData.totalWorkMinutes / 60)}
                                                            <span className="text-lg font-normal">h</span>
                                                        </p>
                                                        <p className="text-emerald-100 text-sm">総勤務時間</p>
                                                    </div>
                                                </div>

                                                {/* 月別勤務グラフ */}
                                                {reportData.monthlyData && Object.keys(reportData.monthlyData).length > 0 && (
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">月別勤務実績</h4>
                                                        <div className="space-y-3">
                                                            {Object.entries(reportData.monthlyData as Record<string, { count: number; minutes: number }>)
                                                                .sort(([a], [b]) => b.localeCompare(a))
                                                                .slice(0, 6)
                                                                .map(([month, data]) => {
                                                                    const maxMinutes = Math.max(...Object.values(reportData.monthlyData as Record<string, { count: number; minutes: number }>).map(d => d.minutes));
                                                                    const percentage = (data.minutes / maxMinutes) * 100;
                                                                    const hours = Math.floor(data.minutes / 60);
                                                                    const mins = data.minutes % 60;
                                                                    return (
                                                                        <div key={month}>
                                                                            <div className="flex items-center justify-between mb-1">
                                                                                <span className="text-xs text-gray-500">{month}</span>
                                                                                <span className="text-xs text-gray-500">{data.count}回 / {hours}h{mins > 0 ? `${mins}m` : ''}</span>
                                                                            </div>
                                                                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                                                                                    style={{ width: `${percentage}%` }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            データがありません
                                        </div>
                                    )}

                                    {/* AIレポート生成セクション */}
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-purple-500" />
                                                AI分析レポート
                                            </h4>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleGenerateAIReport}
                                                disabled={isGeneratingAIReport || !reportData}
                                                className="text-xs"
                                            >
                                                {isGeneratingAIReport ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 mr-2"></div>
                                                        生成中...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-3 h-3 mr-1" />
                                                        レポート生成
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                        {aiReport ? (
                                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                                    {aiReport}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 text-center">
                                                <p className="text-sm text-gray-500">
                                                    {reportData ? "「レポート生成」をクリックしてAI分析を開始" : "データがないためレポートを生成できません"}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 基本情報タブ */}
                            {(!profile || activeTab === 'info') && (
                                <>
                                    {/* 新規作成時: 表示名とアバターセクション（キャスト・スタッフのみ） */}
                                    {!profile && (role === "cast" || role === "staff") && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <label htmlFor="newAvatarInput" className="cursor-pointer">
                                                        <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                                                            <Upload className="h-6 w-6 text-gray-400" />
                                                        </div>
                                                    </label>
                                                    <input
                                                        id="newAvatarInput"
                                                        name="avatar"
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <Input
                                                        name="displayName"
                                                        placeholder="表示名"
                                                        className="rounded-md"
                                                        required
                                                    />
                                                    <Input
                                                        name="displayNameKana"
                                                        placeholder="ひょうじめい（かな）"
                                                        className="rounded-md"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="newStatus" className="text-sm font-medium text-gray-700 dark:text-gray-200">状態</Label>
                                                <Select
                                                    value={statusValue}
                                                    onValueChange={setStatusValue}
                                                >
                                                    <SelectTrigger id="newStatus" className="rounded-md">
                                                        <SelectValue placeholder="状態を選択" />
                                                    </SelectTrigger>
                                                    <SelectContent position="popper" className="z-[9999]">
                                                        <SelectItem value="在籍中">在籍中</SelectItem>
                                                        {role === "cast" && <SelectItem value="体入">体入</SelectItem>}
                                                        <SelectItem value="休職中">休職中</SelectItem>
                                                        <SelectItem value={role === "cast" ? "退店済み" : "退職済み"}>
                                                            {role === "cast" ? "退店済み" : "退職済み"}
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <input type="hidden" name="status" value={statusValue} />
                                            </div>
                                        </div>
                                    )}

                                    {/* 新規作成時: ゲスト・パートナー用セクション */}
                                    {!profile && (role === "guest" || role === "partner") && (
                                        <div className="space-y-4">
                                            {/* アイコン + 表示名 */}
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <label htmlFor="guestAvatarInput" className="cursor-pointer">
                                                        <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                                                            <Upload className="h-6 w-6 text-gray-400" />
                                                        </div>
                                                    </label>
                                                    <input
                                                        id="guestAvatarInput"
                                                        name="avatar"
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <Input
                                                        name="displayName"
                                                        placeholder="表示名（氏名）"
                                                        className="rounded-md"
                                                        defaultValue={businessCardFormData.displayName}
                                                        key={`displayName-${businessCardFormData.displayName}`}
                                                        required
                                                    />
                                                    <Input
                                                        name="displayNameKana"
                                                        placeholder="ひょうじめい（かな）"
                                                        className="rounded-md"
                                                        defaultValue={businessCardFormData.displayNameKana}
                                                        key={`displayNameKana-${businessCardFormData.displayNameKana}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 表示名セクション - アイコン＋表示名とかな */}
                                    {profile && (
                                        <div className="space-y-4">
                                            {isEditingSection('displayName') ? (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="displayName" className="text-sm font-medium text-gray-700 dark:text-gray-200">表示名</Label>
                                                        <Input
                                                            id="displayName"
                                                            name="displayName"
                                                            defaultValue={profile?.display_name || ""}
                                                            placeholder="表示名"
                                                            className="rounded-md"
                                                            onChange={triggerAutoSave}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="displayNameKana" className="text-sm font-medium text-gray-700 dark:text-gray-200">表示名（かな）</Label>
                                                        <Input
                                                            id="displayNameKana"
                                                            name="displayNameKana"
                                                            defaultValue={profile?.display_name_kana || ""}
                                                            placeholder="ひょうじめい"
                                                            className="rounded-md"
                                                            onChange={triggerAutoSave}
                                                            required
                                                        />
                                                    </div>
                                                    {role === "cast" && (
                                                        <div className="space-y-2">
                                                            <Label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-200">ステータス</Label>
                                                            <Select
                                                                value={statusValue}
                                                                onValueChange={(value) => {
                                                                    setStatusValue(value);
                                                                    triggerAutoSave();
                                                                }}
                                                            >
                                                                <SelectTrigger id="status" className="rounded-md">
                                                                    <SelectValue placeholder="ステータスを選択" />
                                                                </SelectTrigger>
                                                                <SelectContent position="popper" className="z-[9999]">
                                                                    <SelectItem value="在籍中">在籍中</SelectItem>
                                                                    <SelectItem value="体入">体入</SelectItem>
                                                                    <SelectItem value="休職中">休職中</SelectItem>
                                                                    <SelectItem value="退店済み">退店済み</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <input type="hidden" name="status" value={statusValue} />
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative group flex-shrink-0">
                                                                <Avatar className="h-12 w-12 cursor-pointer" onClick={handleAvatarClick}>
                                                                    <AvatarImage src={profile.avatar_url || ""} className="object-cover" />
                                                                    <AvatarFallback className="bg-gray-100 dark:bg-gray-800 text-lg">
                                                                        {profile.display_name?.[0] || <UserCircle className="h-6 w-6" />}
                                                                    </AvatarFallback>
                                                                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                        <Upload className="h-5 w-5 text-white" />
                                                                    </div>
                                                                </Avatar>
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-gray-900 dark:text-white truncate">
                                                                        {profile.display_name || "-"}
                                                                    </span>
                                                                    {role === "cast" && statusValue && (
                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                            statusValue === "在籍中" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                                                                            statusValue === "体入" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                                                                            statusValue === "休職中" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                                                            statusValue === "退店済み" ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" :
                                                                            "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                                                        }`}>
                                                                            {statusValue}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                                    {profile.display_name_kana || "-"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingSection('displayName')}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                                            aria-label="編集"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                    <input type="hidden" name="displayName" value={profile?.display_name || ""} />
                                                    <input type="hidden" name="displayNameKana" value={profile?.display_name_kana || ""} />
                                                    <input type="hidden" name="status" value={statusValue} />
                                                </>
                                            )}
                                        </div>
                                    )}

                            {(role === "staff" || role === "admin") && (
                                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium text-gray-900 dark:text-white text-sm">スタッフ情報</h3>
                                        {profile && !isEditingSection('staffInfo') && (
                                            <button
                                                type="button"
                                                onClick={() => setEditingSection('staffInfo')}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                                aria-label="編集"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    {isEditingSection('staffInfo') ? (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="staffStatus" className="text-sm font-medium text-gray-700 dark:text-gray-200">状態</Label>
                                                <Select
                                                    value={statusValue}
                                                    onValueChange={(value) => {
                                                        setStatusValue(value);
                                                        triggerAutoSave();
                                                    }}
                                                >
                                                    <SelectTrigger id="staffStatus" className="rounded-md">
                                                        <SelectValue placeholder="状態を選択" />
                                                    </SelectTrigger>
                                                    <SelectContent position="popper" className="z-[9999]">
                                                        <SelectItem value="在籍中">在籍中</SelectItem>
                                                        <SelectItem value="体入">体入</SelectItem>
                                                        <SelectItem value="休職中">休職中</SelectItem>
                                                        <SelectItem value="退店済み">退店済み</SelectItem>
                                                        <SelectItem value="退職済み">退職済み</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <input type="hidden" name="status" value={statusValue} />
                                            </div>
                                        </>
                                    ) : (
                                        <div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">状態</span>
                                            <p className="text-sm text-gray-900 dark:text-white">{statusValue}</p>
                                            <input type="hidden" name="status" value={statusValue} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {role === "partner" && (
                                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium text-gray-900 dark:text-white text-sm">パートナー情報</h3>
                                        {profile && !isEditingSection('partnerInfo') && (
                                            <button
                                                type="button"
                                                onClick={() => setEditingSection('partnerInfo')}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                                aria-label="編集"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    {isEditingSection('partnerInfo') ? (
                                        <>
                                            <div className="space-y-4">
                                                <span className="text-sm text-gray-500 font-medium">住所</span>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="partnerZipCode" className="text-xs text-gray-500">郵便番号</Label>
                                                        <Input
                                                            id="partnerZipCode"
                                                            name="zipCode"
                                                            value={addressState.zipCode}
                                                            onChange={handleZipCodeChange}
                                                            onBlur={triggerAutoSave}
                                                            placeholder="1234567"
                                                            className="rounded-md"
                                                            maxLength={7}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="partnerPrefecture" className="text-xs text-gray-500">都道府県</Label>
                                                        <Input
                                                            id="partnerPrefecture"
                                                            name="prefecture"
                                                            value={addressState.prefecture}
                                                            onChange={handleAddressChange("prefecture")}
                                                            onBlur={triggerAutoSave}
                                                            placeholder="東京都"
                                                            className="rounded-md"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="partnerCity" className="text-xs text-gray-500">市区町村</Label>
                                                    <Input
                                                        id="partnerCity"
                                                        name="city"
                                                        value={addressState.city}
                                                        onChange={handleAddressChange("city")}
                                                        onBlur={triggerAutoSave}
                                                        placeholder="渋谷区"
                                                        className="rounded-md"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="partnerStreet" className="text-xs text-gray-500">番地</Label>
                                                    <Input
                                                        id="partnerStreet"
                                                        name="street"
                                                        value={addressState.street}
                                                        onChange={handleAddressChange("street")}
                                                        onBlur={triggerAutoSave}
                                                        placeholder="道玄坂1-1-1"
                                                        className="rounded-md"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="partnerBuilding" className="text-xs text-gray-500">建物名</Label>
                                                    <Input
                                                        id="partnerBuilding"
                                                        name="building"
                                                        value={addressState.building}
                                                        onChange={handleAddressChange("building")}
                                                        onBlur={triggerAutoSave}
                                                        placeholder="渋谷ビル 101"
                                                        className="rounded-md"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="space-y-2">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">住所</span>
                                                <p className="text-sm text-gray-900 dark:text-white">
                                                    {profile?.prefecture || profile?.city || profile?.street
                                                        ? `${profile?.zip_code ? `〒${profile.zip_code} ` : ""}${profile?.prefecture || ""}${profile?.city || ""}${profile?.street || ""}${profile?.building ? ` ${profile.building}` : ""}`
                                                        : "-"}
                                                </p>
                                            </div>
                                            <input type="hidden" name="zipCode" value={profile?.zip_code || ""} />
                                            <input type="hidden" name="prefecture" value={profile?.prefecture || ""} />
                                            <input type="hidden" name="city" value={profile?.city || ""} />
                                            <input type="hidden" name="street" value={profile?.street || ""} />
                                            <input type="hidden" name="building" value={profile?.building || ""} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {role === "guest" && (
                                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium text-gray-900 dark:text-white text-sm">ゲスト情報</h3>
                                        {profile && !isEditingSection('guestInfo') && (
                                            <button
                                                type="button"
                                                onClick={() => setEditingSection('guestInfo')}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                                aria-label="編集"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    {isEditingSection('guestInfo') ? (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="guestAddressee" className="text-sm font-medium text-gray-700 dark:text-gray-200">宛名</Label>
                                                <Input
                                                    id="guestAddressee"
                                                    name="guestAddressee"
                                                    type="text"
                                                    defaultValue={profile?.guest_addressee ?? ""}
                                                    placeholder="例: 山田様"
                                                    className="rounded-md"
                                                    onChange={triggerAutoSave}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="guestReceiptType" className="text-sm font-medium text-gray-700 dark:text-gray-200">領収書</Label>
                                                <Select
                                                    name="guestReceiptType"
                                                    defaultValue={profile?.guest_receipt_type || "unspecified"}
                                                    onValueChange={triggerAutoSave}
                                                >
                                                    <SelectTrigger id="guestReceiptType" className="rounded-md">
                                                        <SelectValue placeholder="領収書の種類を選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="unspecified">未設定</SelectItem>
                                                        <SelectItem value="none">なし</SelectItem>
                                                        <SelectItem value="amount_only">金額のみ</SelectItem>
                                                        <SelectItem value="with_date">日付入り</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">宛名</span>
                                                    <p className="text-sm text-gray-900 dark:text-white">{profile?.guest_addressee || "-"}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">領収書</span>
                                                    <p className="text-sm text-gray-900 dark:text-white">
                                                        {profile?.guest_receipt_type === "none" ? "なし" :
                                                         profile?.guest_receipt_type === "amount_only" ? "金額のみ" :
                                                         profile?.guest_receipt_type === "with_date" ? "日付入り" : "未設定"}
                                                    </p>
                                                </div>
                                            </div>
                                            <input type="hidden" name="guestAddressee" value={profile?.guest_addressee || ""} />
                                            <input type="hidden" name="guestReceiptType" value={profile?.guest_receipt_type || "unspecified"} />
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Bottle Keeps (Guest only) */}
                            {profile && role === "guest" && pagePermissions?.bottles !== false && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium text-gray-900 dark:text-white text-sm">キープボトル</h3>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                // Lazy load menus when opening bottle modal
                                                if (menus.length === 0) {
                                                    const menusData = await getMenus();
                                                    setMenus(menusData);
                                                }
                                                setIsBottleModalOpen(true);
                                            }}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                        >
                                            + 追加
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {bottleKeeps.length === 0 ? (
                                            <span className="text-sm text-gray-400 dark:text-gray-500">ボトルはありません</span>
                                        ) : (
                                            bottleKeeps.map((bottle) => (
                                                <div key={bottle.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                                    <div>
                                                        <div className="font-medium text-sm text-gray-900 dark:text-white">
                                                            {bottle.menu_name}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            残量: {bottle.remaining_amount}%
                                                            {bottle.expiration_date && ` / 期限: ${formatJSTDate(bottle.expiration_date)}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Compatibility & Relationships */}
                            {profile && (
                                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <Accordion type="single" collapsible className="w-full" value={compatibilityAccordionOpen} onValueChange={setCompatibilityAccordionOpen}>
                                        <AccordionItem value="compatibility" className="border-none">
                                            <div
                                                className="cursor-pointer"
                                                onClick={() => {
                                                    if (!compatibilityAccordionOpen) {
                                                        setCompatibilityAccordionOpen('compatibility');
                                                    }
                                                }}
                                            >
                                                <AccordionTrigger className="hover:no-underline w-full justify-start py-0 [&>svg]:h-4 [&>svg]:w-4">
                                                    <span className="font-medium text-gray-900 dark:text-white text-sm">相性</span>
                                                </AccordionTrigger>
                                            </div>
                                            <AccordionContent className="pt-3 pb-0">
                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* 相性◯ */}
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">相性 ◯</span>
                                                            {canEdit && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setRelationshipSelectorOpen("compatibility_good")}
                                                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                                >
                                                                    + 追加
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {getSelectedProfiles("compatibility_good").length === 0 ? (
                                                                <span className="text-xs text-gray-400 dark:text-gray-500">未設定</span>
                                                            ) : (
                                                                getSelectedProfiles("compatibility_good").map((p) => (
                                                                    <button
                                                                        key={p.id}
                                                                        type="button"
                                                                        onClick={() => setNestedProfileId(p.id)}
                                                                        className="px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                                                    >
                                                                        {p.display_name || p.real_name || "名前なし"}
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* 相性✕ */}
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">相性 ✕</span>
                                                            {canEdit && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setRelationshipSelectorOpen("compatibility_bad")}
                                                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                                >
                                                                    + 追加
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {getSelectedProfiles("compatibility_bad").length === 0 ? (
                                                                <span className="text-xs text-gray-400 dark:text-gray-500">未設定</span>
                                                            ) : (
                                                                getSelectedProfiles("compatibility_bad").map((p) => (
                                                                    <button
                                                                        key={p.id}
                                                                        type="button"
                                                                        onClick={() => setNestedProfileId(p.id)}
                                                                        className="px-2 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                                    >
                                                                        {p.display_name || p.real_name || "名前なし"}
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* 指名 (Cast/Guest only) */}
                                                    {(role === "cast" || role === "guest") && (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">指名</span>
                                                                {canEdit && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setRelationshipSelectorOpen("nomination")}
                                                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                                    >
                                                                        + 追加
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {getSelectedProfiles("nomination").length === 0 ? (
                                                                    <span className="text-xs text-gray-400 dark:text-gray-500">未設定</span>
                                                                ) : (
                                                                    getSelectedProfiles("nomination").map((p) => (
                                                                        <button
                                                                            key={p.id}
                                                                            type="button"
                                                                            onClick={() => setNestedProfileId(p.id)}
                                                                            className="px-2 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                                                                        >
                                                                            {p.display_name || p.real_name || "名前なし"}
                                                                        </button>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* 担当 (Cast/Staff only) */}
                                                    {(role === "cast" || role === "staff") && (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">担当</span>
                                                                {canEdit && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setRelationshipSelectorOpen("in_charge")}
                                                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                                    >
                                                                        + 追加
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {getSelectedProfiles("in_charge").length === 0 ? (
                                                                    <span className="text-xs text-gray-400 dark:text-gray-500">未設定</span>
                                                                ) : (
                                                                    getSelectedProfiles("in_charge").map((p) => (
                                                                        <button
                                                                            key={p.id}
                                                                            type="button"
                                                                            onClick={() => setNestedProfileId(p.id)}
                                                                            className="px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                                                        >
                                                                            {p.display_name || p.real_name || "名前なし"}
                                                                        </button>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            )}

                            {/* Resume Section (Cast only, existing profiles only) */}
                            {profile && !hidePersonalInfo && role === "cast" && pagePermissions?.resumes !== false && (
                                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <Accordion type="single" collapsible className="w-full" value={isEditingSection('resume') ? 'resume' : resumeAccordionOpen} onValueChange={setResumeAccordionOpen}>
                                        <AccordionItem value="resume" className="border-none">
                                            <div
                                                className="flex items-center justify-between cursor-pointer"
                                                onClick={() => {
                                                    if (!isEditingSection('resume')) {
                                                        setResumeAccordionOpen(resumeAccordionOpen === 'resume' ? undefined : 'resume');
                                                    }
                                                }}
                                            >
                                                <AccordionTrigger className="hover:no-underline flex-1 justify-start py-0 [&>svg]:h-4 [&>svg]:w-4">
                                                    <span className="font-medium text-gray-900 dark:text-white text-sm">履歴書</span>
                                                </AccordionTrigger>
                                                {profile && !isEditingSection('resume') && resumeAccordionOpen === 'resume' && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingSection('resume');
                                                        }}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                                        aria-label="編集"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                            <AccordionContent className="pt-3 pb-0">
                                                {isEditingSection('resume') ? (
                                                    <div className="space-y-4 pt-2">
                                                        {/* 希望キャスト名 */}
                                                        <div className="space-y-2">
                                                            <Label htmlFor="desiredCastName" className="text-sm font-medium text-gray-700 dark:text-gray-200">希望キャスト名</Label>
                                                            <Input
                                                                id="desiredCastName"
                                                                name="desiredCastName"
                                                                defaultValue={(profile as any)?.desired_cast_name || ""}
                                                                placeholder="例: さくら"
                                                                className="rounded-md"
                                                                onChange={triggerAutoSave}
                                                            />
                                                        </div>
                                                        {/* 生年月日 */}
                                                        <div className="space-y-2">
                                                            <Label htmlFor="birthDate" className="text-sm font-medium text-gray-700 dark:text-gray-200">生年月日</Label>
                                                            <Input
                                                                id="birthDate"
                                                                name="birthDate"
                                                                type="date"
                                                                defaultValue={(profile as any)?.birth_date || ""}
                                                                className="rounded-md"
                                                                onChange={triggerAutoSave}
                                                            />
                                                        </div>
                                                        {/* 希望時給・希望シフト */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="desiredHourlyWage" className="text-sm font-medium text-gray-700 dark:text-gray-200">希望時給 (円)</Label>
                                                                <Input
                                                                    id="desiredHourlyWage"
                                                                    name="desiredHourlyWage"
                                                                    type="number"
                                                                    defaultValue={(profile as any)?.desired_hourly_wage || ""}
                                                                    placeholder="3000"
                                                                    className="rounded-md"
                                                                    onChange={triggerAutoSave}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="desiredShiftDays" className="text-sm font-medium text-gray-700 dark:text-gray-200">希望シフト</Label>
                                                                <Input
                                                                    id="desiredShiftDays"
                                                                    name="desiredShiftDays"
                                                                    defaultValue={(profile as any)?.desired_shift_days || ""}
                                                                    placeholder="週3回"
                                                                    className="rounded-md"
                                                                    onChange={triggerAutoSave}
                                                                />
                                                            </div>
                                                        </div>
                                                        {/* 過去在籍店（編集モード） */}
                                                        {profile && (
                                                            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">過去在籍店</Label>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setPastEmployments([...pastEmployments, {
                                                                                id: `new-${Date.now()}`,
                                                                                store_name: "",
                                                                                period: "",
                                                                                hourly_wage: null,
                                                                                sales_amount: null,
                                                                                customer_count: null,
                                                                            }]);
                                                                        }}
                                                                        className="h-7 text-xs"
                                                                    >
                                                                        <Plus className="h-3 w-3 mr-1" />
                                                                        追加
                                                                    </Button>
                                                                </div>
                                                                <div className="space-y-3">
                                                                    {pastEmployments.length === 0 ? (
                                                                        <span className="text-sm text-gray-400 dark:text-gray-500">登録なし</span>
                                                                    ) : (
                                                                        pastEmployments.map((employment, index) => (
                                                                            <div key={employment.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-2">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">#{index + 1}</span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setPastEmployments(pastEmployments.filter(e => e.id !== employment.id));
                                                                                        }}
                                                                                        className="text-red-500 hover:text-red-600 p-1"
                                                                                    >
                                                                                        <X className="h-3.5 w-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                                <Input
                                                                                    placeholder="店舗名"
                                                                                    value={employment.store_name}
                                                                                    onChange={(e) => {
                                                                                        const updated = [...pastEmployments];
                                                                                        updated[index] = { ...employment, store_name: e.target.value };
                                                                                        setPastEmployments(updated);
                                                                                    }}
                                                                                    onBlur={triggerAutoSave}
                                                                                    className="rounded-md h-8 text-sm"
                                                                                />
                                                                                <Input
                                                                                    placeholder="期間（例: 2023年1月〜2023年12月）"
                                                                                    value={employment.period || ""}
                                                                                    onChange={(e) => {
                                                                                        const updated = [...pastEmployments];
                                                                                        updated[index] = { ...employment, period: e.target.value };
                                                                                        setPastEmployments(updated);
                                                                                    }}
                                                                                    onBlur={triggerAutoSave}
                                                                                    className="rounded-md h-8 text-sm"
                                                                                />
                                                                                <div className="grid grid-cols-3 gap-2">
                                                                                    <Input
                                                                                        type="number"
                                                                                        placeholder="時給"
                                                                                        value={employment.hourly_wage || ""}
                                                                                        onChange={(e) => {
                                                                                            const updated = [...pastEmployments];
                                                                                            updated[index] = { ...employment, hourly_wage: e.target.value ? parseInt(e.target.value) : null };
                                                                                            setPastEmployments(updated);
                                                                                        }}
                                                                                        onBlur={triggerAutoSave}
                                                                                        className="rounded-md h-8 text-sm"
                                                                                    />
                                                                                    <Input
                                                                                        type="number"
                                                                                        placeholder="売上"
                                                                                        value={employment.sales_amount || ""}
                                                                                        onChange={(e) => {
                                                                                            const updated = [...pastEmployments];
                                                                                            updated[index] = { ...employment, sales_amount: e.target.value ? parseInt(e.target.value) : null };
                                                                                            setPastEmployments(updated);
                                                                                        }}
                                                                                        onBlur={triggerAutoSave}
                                                                                        className="rounded-md h-8 text-sm"
                                                                                    />
                                                                                    <Input
                                                                                        type="number"
                                                                                        placeholder="客数"
                                                                                        value={employment.customer_count || ""}
                                                                                        onChange={(e) => {
                                                                                            const updated = [...pastEmployments];
                                                                                            updated[index] = { ...employment, customer_count: e.target.value ? parseInt(e.target.value) : null };
                                                                                            setPastEmployments(updated);
                                                                                        }}
                                                                                        onBlur={triggerAutoSave}
                                                                                        className="rounded-md h-8 text-sm"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4 pt-2">
                                                        {/* 表示モード */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">希望キャスト名</span>
                                                                <p className="text-sm text-gray-900 dark:text-white">{(profile as any)?.desired_cast_name || "-"}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">生年月日</span>
                                                                <p className="text-sm text-gray-900 dark:text-white">
                                                                    {(profile as any)?.birth_date ? new Date((profile as any).birth_date).toLocaleDateString("ja-JP") : "-"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">希望時給</span>
                                                                <p className="text-sm text-gray-900 dark:text-white">{(profile as any)?.desired_hourly_wage ? `¥${(profile as any).desired_hourly_wage.toLocaleString()}` : "-"}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">希望シフト</span>
                                                                <p className="text-sm text-gray-900 dark:text-white">{(profile as any)?.desired_shift_days || "-"}</p>
                                                            </div>
                                                        </div>
                                                        <input type="hidden" name="desiredCastName" value={(profile as any)?.desired_cast_name || ""} />
                                                        <input type="hidden" name="birthDate" value={(profile as any)?.birth_date || ""} />
                                                        <input type="hidden" name="desiredHourlyWage" value={(profile as any)?.desired_hourly_wage || ""} />
                                                        <input type="hidden" name="desiredShiftDays" value={(profile as any)?.desired_shift_days || ""} />

                                                        {/* 過去在籍店（表示モード） */}
                                                        {profile && (
                                                            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">過去在籍店</Label>
                                                                <div className="space-y-2">
                                                                    {pastEmployments.length === 0 ? (
                                                                        <span className="text-sm text-gray-400 dark:text-gray-500">登録なし</span>
                                                                    ) : (
                                                                        pastEmployments.map((employment) => (
                                                                            <div key={employment.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                                                                <div className="font-medium text-sm text-gray-900 dark:text-white">
                                                                                    {employment.store_name}
                                                                                </div>
                                                                                {employment.period && (
                                                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                                        期間: {employment.period}
                                                                                    </div>
                                                                                )}
                                                                                <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                                                    {employment.hourly_wage && <span>時給: ¥{employment.hourly_wage.toLocaleString()}</span>}
                                                                                    {employment.sales_amount && <span>売上: ¥{employment.sales_amount.toLocaleString()}</span>}
                                                                                    {employment.customer_count && <span>客数: {employment.customer_count}人</span>}
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            )}

                            {/* Personal Info Section */}
                            {!hidePersonalInfo && (
                                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <Accordion type="single" collapsible className="w-full" value={isEditingSection('personalInfo') ? 'personal-info' : personalInfoAccordionOpen} onValueChange={setPersonalInfoAccordionOpen}>
                                        <AccordionItem value="personal-info" className="border-none">
                                            <div
                                                className="flex items-center justify-between cursor-pointer"
                                                onClick={() => {
                                                    if (!isEditingSection('personalInfo')) {
                                                        setPersonalInfoAccordionOpen(personalInfoAccordionOpen === 'personal-info' ? undefined : 'personal-info');
                                                    }
                                                }}
                                            >
                                                <AccordionTrigger className="hover:no-underline flex-1 justify-start py-0 [&>svg]:h-4 [&>svg]:w-4">
                                                    <span className="font-medium text-gray-900 dark:text-white text-sm">個人情報</span>
                                                </AccordionTrigger>
                                                {profile && !isEditingSection('personalInfo') && personalInfoAccordionOpen === 'personal-info' && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingSection('personalInfo');
                                                        }}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                                        aria-label="編集"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                            <AccordionContent className="pt-3 pb-0">
                                                {isEditingSection('personalInfo') ? (
                                                    <div className="space-y-4">
                                                        {/* 本名 */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-200">姓</Label>
                                                                <Input
                                                                    id="lastName"
                                                                    name="lastName"
                                                                    defaultValue={profile?.last_name || ""}
                                                                    placeholder="姓"
                                                                    className="rounded-md"
                                                                    onChange={triggerAutoSave}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-200">名</Label>
                                                                <Input
                                                                    id="firstName"
                                                                    name="firstName"
                                                                    defaultValue={profile?.first_name || ""}
                                                                    placeholder="名"
                                                                    className="rounded-md"
                                                                    onChange={triggerAutoSave}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="lastNameKana" className="text-sm font-medium text-gray-700 dark:text-gray-200">姓（かな）</Label>
                                                                <Input
                                                                    id="lastNameKana"
                                                                    name="lastNameKana"
                                                                    defaultValue={profile?.last_name_kana || ""}
                                                                    placeholder="せい"
                                                                    className="rounded-md"
                                                                    onChange={triggerAutoSave}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="firstNameKana" className="text-sm font-medium text-gray-700 dark:text-gray-200">名（かな）</Label>
                                                                <Input
                                                                    id="firstNameKana"
                                                                    name="firstNameKana"
                                                                    defaultValue={profile?.first_name_kana || ""}
                                                                    placeholder="めい"
                                                                    className="rounded-md"
                                                                    onChange={triggerAutoSave}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* 生年月日 */}
                                                        <div className="space-y-2">
                                                            <Label htmlFor="birthDate" className="text-sm font-medium text-gray-700 dark:text-gray-200">生年月日</Label>
                                                            <Input
                                                                id="birthDate"
                                                                name="birthDate"
                                                                type="date"
                                                                defaultValue={profile?.birth_date || ""}
                                                                className="rounded-md"
                                                                onChange={triggerAutoSave}
                                                            />
                                                        </div>

                                                        {/* 電話番号 */}
                                                        <div className="space-y-2">
                                                            <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 dark:text-gray-200">電話番号</Label>
                                                            <Input
                                                                id="phoneNumber"
                                                                name="phoneNumber"
                                                                defaultValue={profile?.phone_number || ""}
                                                                placeholder="090-1234-5678"
                                                                className="rounded-md"
                                                                onChange={triggerAutoSave}
                                                            />
                                                        </div>

                                                        {/* 住所 */}
                                                        <div className="space-y-4 pt-4">
                                                            <span className="text-sm text-gray-500 font-medium">住所</span>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="zipCode" className="text-xs text-gray-500">郵便番号</Label>
                                                                    <Input
                                                                        id="zipCode"
                                                                        name="zipCode"
                                                                        value={addressState.zipCode}
                                                                        onChange={handleZipCodeChange}
                                                                        onBlur={triggerAutoSave}
                                                                        placeholder="1234567"
                                                                        className="rounded-md"
                                                                        maxLength={7}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="prefecture" className="text-xs text-gray-500">都道府県</Label>
                                                                    <Input
                                                                        id="prefecture"
                                                                        name="prefecture"
                                                                        value={addressState.prefecture}
                                                                        onChange={handleAddressChange("prefecture")}
                                                                        onBlur={triggerAutoSave}
                                                                        placeholder="東京都"
                                                                        className="rounded-md"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <Label htmlFor="city" className="text-xs text-gray-500">市区町村</Label>
                                                                <Input
                                                                    id="city"
                                                                    name="city"
                                                                    value={addressState.city}
                                                                    onChange={handleAddressChange("city")}
                                                                    onBlur={triggerAutoSave}
                                                                    placeholder="渋谷区"
                                                                    className="rounded-md"
                                                                />
                                                            </div>

                                                            <div className="space-y-2">
                                                                <Label htmlFor="street" className="text-xs text-gray-500">番地</Label>
                                                                <Input
                                                                    id="street"
                                                                    name="street"
                                                                    value={addressState.street}
                                                                    onChange={handleAddressChange("street")}
                                                                    onBlur={triggerAutoSave}
                                                                    placeholder="道玄坂1-1-1"
                                                                    className="rounded-md"
                                                                />
                                                            </div>

                                                            <div className="space-y-2">
                                                                <Label htmlFor="building" className="text-xs text-gray-500">建物名</Label>
                                                                <Input
                                                                    id="building"
                                                                    name="building"
                                                                    value={addressState.building}
                                                                    onChange={handleAddressChange("building")}
                                                                    onBlur={triggerAutoSave}
                                                                    placeholder="渋谷ビル 101"
                                                                    className="rounded-md"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* 緊急連絡先・最寄り駅 (cast/staff only) */}
                                                        {(role === "cast" || role === "staff") && (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="emergencyPhoneNumber" className="text-sm font-medium text-gray-700 dark:text-gray-200">緊急連絡先</Label>
                                                                    <Input
                                                                        id="emergencyPhoneNumber"
                                                                        name="emergencyPhoneNumber"
                                                                        defaultValue={profile?.emergency_phone_number || ""}
                                                                        placeholder="090-1234-5678"
                                                                        className="rounded-md"
                                                                        onChange={triggerAutoSave}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="nearestStation" className="text-sm font-medium text-gray-700 dark:text-gray-200">最寄り駅</Label>
                                                                    <Input
                                                                        id="nearestStation"
                                                                        name="nearestStation"
                                                                        defaultValue={profile?.nearest_station || ""}
                                                                        placeholder="渋谷駅"
                                                                        className="rounded-md"
                                                                        onChange={triggerAutoSave}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                    </div>
                                                ) : (
                                                    <div className="space-y-4 pt-2">
                                                        {/* 本名 */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">姓</span>
                                                                <p className="text-sm text-gray-900 dark:text-white">{profile?.last_name || "-"}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">名</span>
                                                                <p className="text-sm text-gray-900 dark:text-white">{profile?.first_name || "-"}</p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">姓（かな）</span>
                                                                <p className="text-sm text-gray-900 dark:text-white">{profile?.last_name_kana || "-"}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">名（かな）</span>
                                                                <p className="text-sm text-gray-900 dark:text-white">{profile?.first_name_kana || "-"}</p>
                                                            </div>
                                                        </div>

                                                        {/* 生年月日 */}
                                                        <div>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">生年月日</span>
                                                            <p className="text-sm text-gray-900 dark:text-white">
                                                                {profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric" }) : "-"}
                                                            </p>
                                                        </div>

                                                        {/* 電話番号 */}
                                                        <div>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">電話番号</span>
                                                            <p className="text-sm text-gray-900 dark:text-white">{profile?.phone_number || "-"}</p>
                                                        </div>

                                                        {/* 住所 */}
                                                        <div className="space-y-3 pt-2">
                                                            <span className="text-sm text-gray-500 font-medium">住所</span>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">郵便番号</span>
                                                                    <p className="text-sm text-gray-900 dark:text-white">{profile?.zip_code || "-"}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">都道府県</span>
                                                                    <p className="text-sm text-gray-900 dark:text-white">{profile?.prefecture || "-"}</p>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">市区町村</span>
                                                                <p className="text-sm text-gray-900 dark:text-white">{profile?.city || "-"}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">番地</span>
                                                                <p className="text-sm text-gray-900 dark:text-white">{profile?.street || "-"}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">建物名</span>
                                                                <p className="text-sm text-gray-900 dark:text-white">{profile?.building || "-"}</p>
                                                            </div>
                                                        </div>

                                                        {/* 緊急連絡先・最寄り駅 (cast/staff only) */}
                                                        {(role === "cast" || role === "staff") && (
                                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                                <div>
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">緊急連絡先</span>
                                                                    <p className="text-sm text-gray-900 dark:text-white">{profile?.emergency_phone_number || "-"}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">最寄り駅</span>
                                                                    <p className="text-sm text-gray-900 dark:text-white">{profile?.nearest_station || "-"}</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Hidden inputs for form submission */}
                                                        <input type="hidden" name="lastName" value={profile?.last_name || ""} />
                                                        <input type="hidden" name="firstName" value={profile?.first_name || ""} />
                                                        <input type="hidden" name="lastNameKana" value={profile?.last_name_kana || ""} />
                                                        <input type="hidden" name="firstNameKana" value={profile?.first_name_kana || ""} />
                                                        <input type="hidden" name="birthDate" value={profile?.birth_date || ""} />
                                                        <input type="hidden" name="phoneNumber" value={profile?.phone_number || ""} />
                                                        <input type="hidden" name="zipCode" value={profile?.zip_code || ""} />
                                                        <input type="hidden" name="prefecture" value={profile?.prefecture || ""} />
                                                        <input type="hidden" name="city" value={profile?.city || ""} />
                                                        <input type="hidden" name="street" value={profile?.street || ""} />
                                                        <input type="hidden" name="building" value={profile?.building || ""} />
                                                        <input type="hidden" name="emergencyPhoneNumber" value={profile?.emergency_phone_number || ""} />
                                                        <input type="hidden" name="nearestStation" value={profile?.nearest_station || ""} />
                                                    </div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            )}

                            {/* Salary Systems Section - for cast, staff, partner (existing profiles only) */}
                            {profile && (role === "cast" || role === "staff" || role === "partner") && pagePermissions?.salarySystems !== false && (() => {
                                const selectedSystem = salarySystems.find(s => s.id === selectedSalarySystemId);
                                return (
                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium text-gray-900 dark:text-white text-sm">給与システム</h3>
                                                {selectedSystem ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSalarySystemDetailOpen(selectedSystem)}
                                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        {selectedSystem.name}
                                                    </button>
                                                ) : (
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">未設定</span>
                                                )}
                                            </div>
                                            {profile && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSalarySystemSelectorOpen(true)}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                                    aria-label="編集"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Role/Permission Section - for cast, staff, and admin */}
                            {profile && (role === "cast" || role === "staff" || role === "admin") && (() => {
                                const selectedRole = storeRoles.find(r => r.id === selectedRoleId);
                                const availableRoles = storeRoles.filter(r => r.for_role === role);

                                // adminは強制的に管理者権限（セレクター不要）
                                if (role === "admin") {
                                    return (
                                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                <h3 className="font-medium text-gray-900 dark:text-white text-sm">権限</h3>
                                                <span className="text-sm text-green-600 dark:text-green-400">管理者（全権限）</span>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                <h3 className="font-medium text-gray-900 dark:text-white text-sm">権限</h3>
                                                {selectedRole ? (
                                                    <span className="text-sm text-blue-600 dark:text-blue-400">
                                                        {selectedRole.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">未設定</span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setRoleSelectorOpen(true)}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                                aria-label="編集"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        {/* Role Selector Inline (when open) */}
                                        {roleSelectorOpen && (
                                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">権限セットを選択</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRoleSelectorOpen(false)}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        <X className="h-5 w-5" />
                                                    </button>
                                                </div>

                                                {/* No role option */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRoleAssign(null)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                        !selectedRoleId
                                                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                                            : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                                    }`}
                                                >
                                                    未設定
                                                </button>

                                                {/* Available roles */}
                                                {availableRoles.map(r => (
                                                    <button
                                                        key={r.id}
                                                        type="button"
                                                        onClick={() => handleRoleAssign(r.id)}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                            selectedRoleId === r.id
                                                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                                                : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                                        }`}
                                                    >
                                                        {r.name}
                                                        {r.is_system_role && (
                                                            <span className="ml-2 text-xs text-gray-400">（システム）</span>
                                                        )}
                                                    </button>
                                                ))}

                                                {availableRoles.length === 0 && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                                                        利用可能な権限セットがありません
                                                    </p>
                                                )}

                                                {/* Admin role option - only for staff */}
                                                {role === "staff" && (
                                                    <>
                                                        <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                                                        <button
                                                            type="button"
                                                            onClick={handleSetAdminRole}
                                                            className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700 dark:text-green-400"
                                                        >
                                                            管理者権限（全権限）
                                                        </button>
                                                    </>
                                                )}

                                                {/* Create new role button */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setRoleSelectorOpen(false);
                                                        setRoleModalOpen(true);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-dashed border-blue-300 dark:border-blue-700"
                                                >
                                                    <Plus className="h-5 w-5" />
                                                    新規作成
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                                    {!profile && (
                                        <DialogFooter className="gap-2">
                                            <div className="flex flex-col w-full gap-3">
                                                <Button type="submit" disabled={isSubmitting} className="w-full rounded-full h-10">
                                                    {isSubmitting ? "作成中..." : "作成する"}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => onOpenChange(false)}
                                                    className="w-full rounded-full border-gray-300 dark:border-gray-600 h-10"
                                                >
                                                    キャンセル
                                                </Button>
                                            </div>
                                        </DialogFooter>
                                    )}
                                </>
                            )}
                        </form>

                        {profile && (
                            <CommentSection
                                targetType="profile"
                                targetId={profile.id}
                                isOpen={open}
                            />
                        )}

                </div>
                </DialogContent>
            </Dialog>

            {/* Bottle Modal - only show if not nested */}
            {
                !isNested && profile && profile.role === "guest" && (
                    <BottleModal
                        isOpen={isBottleModalOpen}
                        onClose={(shouldRefresh) => {
                            setIsBottleModalOpen(false);
                            if (shouldRefresh) {
                                refreshBottleKeeps();
                            }
                        }}
                        menus={menus}
                        profiles={[profile]}
                        initialProfileIds={[profile.id]}
                    />
                )
            }

            {/* Delete User Confirmation Modal */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 w-[90%] rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-center text-lg font-bold text-gray-900 dark:text-white">
                            ユーザーを削除
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            ユーザーを削除する確認ダイアログ
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-center text-gray-600 dark:text-gray-300">
                        <p>本当にこのユーザーを削除しますか？</p>
                        <p className="text-sm mt-2 text-gray-500">この操作は取り消せません。</p>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            className="w-full rounded-full bg-red-600 hover:bg-red-700 text-white h-10"
                        >
                            削除
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="w-full rounded-full border-gray-300 dark:border-gray-600 h-10"
                        >
                            キャンセル
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Relationship Selector Modal */}
            {profile && relationshipSelectorOpen && (
                <RelationshipSelectorModal
                    isOpen={!!relationshipSelectorOpen}
                    onClose={() => setRelationshipSelectorOpen(null)}
                    selectedIds={getSelectedIds(relationshipSelectorOpen)}
                    profiles={allProfiles.filter((p) => p.id !== profile.id)}
                    onSelectionChange={(ids) => handleRelationshipChange(relationshipSelectorOpen, ids)}
                    currentProfileId={profile.id}
                    title={
                        relationshipSelectorOpen === "compatibility_good"
                            ? "相性 ◯"
                            : relationshipSelectorOpen === "compatibility_bad"
                                ? "相性 ✕"
                                : relationshipSelectorOpen === "nomination"
                                    ? "指名"
                                    : "担当"
                    }
                />
            )}

            {/* Nested Profile Modal */}
            {nestedProfileId && (
                <UserEditModal
                    profile={allProfiles.find((p) => p.id === nestedProfileId) || null}
                    open={!!nestedProfileId}
                    onOpenChange={(open) => {
                        if (!open) setNestedProfileId(null);
                    }}
                    isNested={true}
                    hidePersonalInfo={true}
                />
            )}

            {/* User Attendance List Modal */}
            {profile && (
                <UserAttendanceListModal
                    profileId={profile.id}
                    profileName={profile.display_name || profile.real_name || ""}
                    isOpen={showAttendanceList}
                    onClose={() => setShowAttendanceList(false)}
                    onEditRecord={(record) => {
                        setShowAttendanceList(false);
                        setEditingAttendanceRecord(record);
                    }}
                />
            )}

            {/* Attendance Edit Modal */}
            {editingAttendanceRecord && profile && (
                <AttendanceModal
                    isOpen={!!editingAttendanceRecord}
                    onClose={() => setEditingAttendanceRecord(null)}
                    profiles={[profile]}
                    currentProfileId={profile.id}
                    editingRecord={editingAttendanceRecord}
                />
            )}

            {/* Salary System Selector Modal */}
            {profile && (
                <SalarySystemSelectorModal
                    isOpen={salarySystemSelectorOpen}
                    onClose={() => setSalarySystemSelectorOpen(false)}
                    salarySystems={salarySystems}
                    selectedId={selectedSalarySystemId}
                    onSelect={async (id) => {
                        setSelectedSalarySystemId(id);
                        await handleSalarySystemChange(id);
                    }}
                    onOpenDetail={(system) => {
                        setSalarySystemSelectorOpen(false);
                        setSalarySystemDetailFromSelector(true);
                        setSalarySystemDetailOpen(system);
                    }}
                    className="z-[110]"
                />
            )}

            {/* Salary System Create Modal */}
            {salarySystemCreateOpen && (
                <SalarySystemModal
                    isOpen={salarySystemCreateOpen}
                    onClose={() => {
                        setSalarySystemCreateOpen(false);
                        if (salarySystemDetailFromSelector) {
                            setSalarySystemSelectorOpen(true);
                            setSalarySystemDetailFromSelector(false);
                        }
                    }}
                    system={null}
                    targetType={role === "cast" ? "cast" : "staff"}
                    onSaved={(newSystem) => {
                        setSalarySystems([...salarySystems, newSystem]);
                        setSelectedSalarySystemId(newSystem.id);
                        handleSalarySystemChange(newSystem.id);
                        setSalarySystemCreateOpen(false);
                        setSalarySystemDetailFromSelector(false);
                    }}
                    onDeleted={() => {}}
                    storeShowBreakColumns={false}
                    storeTimeRoundingEnabled={false}
                    storeTimeRoundingMinutes={15}
                    className="z-[110]"
                />
            )}

            {/* Salary System Detail Modal */}
            {salarySystemDetailOpen && (
                <SalarySystemModal
                    isOpen={!!salarySystemDetailOpen}
                    onClose={() => {
                        setSalarySystemDetailOpen(null);
                        if (salarySystemDetailFromSelector) {
                            setSalarySystemSelectorOpen(true);
                            setSalarySystemDetailFromSelector(false);
                        }
                    }}
                    system={salarySystemDetailOpen}
                    targetType={salarySystemDetailOpen?.target_type === "cast" ? "cast" : "staff"}
                    onSaved={(updatedSystem) => {
                        setSalarySystems(salarySystems.map(s => s.id === updatedSystem.id ? updatedSystem : s));
                        setSalarySystemDetailOpen(null);
                        setSalarySystemDetailFromSelector(false);
                    }}
                    onDeleted={() => {}}
                    storeShowBreakColumns={false}
                    storeTimeRoundingEnabled={false}
                    storeTimeRoundingMinutes={15}
                    className="z-[110]"
                />
            )}

            {/* Salary System Remove Confirmation */}
            <Dialog open={salarySystemRemoveConfirmOpen} onOpenChange={setSalarySystemRemoveConfirmOpen}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 w-[90%] rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">給与システムを解除しますか？</DialogTitle>
                        <DialogDescription className="text-gray-500 dark:text-gray-400">
                            給与システムを設定しないと、このユーザーの給与計算が行われません。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSalarySystemRemoveConfirmOpen(false)}
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                setSelectedSalarySystemId(null);
                                handleSalarySystemChange(null);
                                setSalarySystemRemoveConfirmOpen(false);
                            }}
                        >
                            解除する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Role Form Modal for creating new roles */}
            <RoleFormModal
                open={roleModalOpen}
                onClose={handleRoleCreated}
                forRole={role === "cast" ? "cast" : "staff"}
            />
        </>
    );
}
