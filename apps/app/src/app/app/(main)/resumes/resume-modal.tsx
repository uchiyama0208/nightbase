"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createResume, getResume, getResumeQuestions, updateResume, deleteResume } from "./actions";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabaseClient";

interface ResumeModalProps {
    isOpen: boolean;
    onClose: () => void;
    resumeId: string | null;
    storeId: string;
}

export function ResumeModal({ isOpen, onClose, resumeId, storeId }: ResumeModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);

    // Form State
    const [profileId, setProfileId] = useState("");
    const [desiredCastName, setDesiredCastName] = useState("");
    const [desiredHourlyWage, setDesiredHourlyWage] = useState("");
    const [desiredShiftDays, setDesiredShiftDays] = useState("");
    const [remarks, setRemarks] = useState("");
    const [pastEmployments, setPastEmployments] = useState<any[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    // Profile extra fields (read-only or editable if needed, but mainly for display/input)
    // Actually, these are part of Profile, not Resume, but we might want to show them or allow editing.
    // For now, let's assume they are edited in UserEditModal, or we can fetch them.
    // The requirement says "Profilesのキャストのみに、身長を追加したい".
    // If we are creating a resume, we select a profile.

    useEffect(() => {
        if (isOpen) {
            loadData();
        } else {
            resetForm();
        }
    }, [isOpen, resumeId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const supabase = createBrowserClient();

            // Load Profiles for selection
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("id, real_name, display_name")
                .eq("store_id", storeId)
                .eq("role", "cast"); // Only casts have resumes?
            setProfiles(profilesData || []);

            // Load Questions
            const qs = await getResumeQuestions(storeId);
            setQuestions(qs || []);

            // Load Resume if editing
            if (resumeId) {
                const resume = await getResume(resumeId);
                if (resume) {
                    setProfileId(resume.profile_id);
                    setDesiredCastName(resume.desired_cast_name || "");
                    setDesiredHourlyWage(resume.desired_hourly_wage?.toString() || "");
                    setDesiredShiftDays(resume.desired_shift_days || "");
                    setRemarks(resume.remarks || "");
                    setPastEmployments(resume.past_employments || []);

                    const ans: Record<string, string> = {};
                    resume.resume_answers?.forEach((a: any) => {
                        ans[a.question_id] = a.answer;
                    });
                    setAnswers(ans);
                }
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setProfileId("");
        setDesiredCastName("");
        setDesiredHourlyWage("");
        setDesiredShiftDays("");
        setRemarks("");
        setPastEmployments([]);
        setAnswers({});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append("profileId", profileId);
        formData.append("desiredCastName", desiredCastName);
        formData.append("desiredHourlyWage", desiredHourlyWage);
        formData.append("desiredShiftDays", desiredShiftDays);
        formData.append("remarks", remarks);
        formData.append("pastEmployments", JSON.stringify(pastEmployments));

        const answersArray = Object.entries(answers).map(([qid, ans]) => ({
            question_id: qid,
            answer: ans
        }));
        formData.append("answers", JSON.stringify(answersArray));

        try {
            if (resumeId) {
                await updateResume(resumeId, formData);
            } else {
                await createResume(formData);
            }
            onClose();
        } catch (error) {
            console.error("Error saving resume:", error);
            alert("保存に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!resumeId || !confirm("本当に削除しますか？")) return;
        setIsSubmitting(true);
        try {
            await deleteResume(resumeId);
            onClose();
        } catch (error) {
            console.error("Error deleting resume:", error);
            alert("削除に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>読み込み中</DialogTitle>
                        <DialogDescription>データを読み込んでいます...</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{resumeId ? "履歴書編集" : "履歴書作成"}</DialogTitle>
                    <DialogDescription>
                        {resumeId ? "履歴書の内容を編集できます" : "新しい履歴書を作成します"}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium border-b pb-2">基本情報</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>対象キャスト</Label>
                                <Select value={profileId} onValueChange={setProfileId} disabled={!!resumeId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="キャストを選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {profiles.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.real_name || p.display_name || "未設定"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>希望キャスト名</Label>
                                <Input
                                    value={desiredCastName}
                                    onChange={e => setDesiredCastName(e.target.value)}
                                    placeholder="例: さくら"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>希望時給</Label>
                                <Input
                                    type="number"
                                    value={desiredHourlyWage}
                                    onChange={e => setDesiredHourlyWage(e.target.value)}
                                    placeholder="例: 3000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>希望シフト</Label>
                                <Input
                                    value={desiredShiftDays}
                                    onChange={e => setDesiredShiftDays(e.target.value)}
                                    placeholder="例: 週3回"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Past Employments */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="text-lg font-medium">過去在籍店</h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setPastEmployments([...pastEmployments, { id: `temp_${Date.now()}`, store_name: "", period: "", hourly_wage: "", sales_amount: "", customer_count: "" }])}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                追加
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {pastEmployments.map((employment, index) => (
                                <div key={employment.id || index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-3 relative group border border-gray-100 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setPastEmployments(pastEmployments.filter((_, i) => i !== index))}
                                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-500">店名</Label>
                                            <Input
                                                value={employment.store_name}
                                                onChange={(e) => {
                                                    const newEmployments = [...pastEmployments];
                                                    newEmployments[index].store_name = e.target.value;
                                                    setPastEmployments(newEmployments);
                                                }}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-500">期間</Label>
                                            <Input
                                                value={employment.period || ""}
                                                onChange={(e) => {
                                                    const newEmployments = [...pastEmployments];
                                                    newEmployments[index].period = e.target.value;
                                                    setPastEmployments(newEmployments);
                                                }}
                                                placeholder="2020/01 - 2021/03"
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-500">時給</Label>
                                            <Input
                                                type="number"
                                                value={employment.hourly_wage || ""}
                                                onChange={(e) => {
                                                    const newEmployments = [...pastEmployments];
                                                    newEmployments[index].hourly_wage = e.target.value;
                                                    setPastEmployments(newEmployments);
                                                }}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-500">売上</Label>
                                            <Input
                                                type="number"
                                                value={employment.sales_amount || ""}
                                                onChange={(e) => {
                                                    const newEmployments = [...pastEmployments];
                                                    newEmployments[index].sales_amount = e.target.value;
                                                    setPastEmployments(newEmployments);
                                                }}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-500">持ち客数</Label>
                                            <Input
                                                type="number"
                                                value={employment.customer_count || ""}
                                                onChange={(e) => {
                                                    const newEmployments = [...pastEmployments];
                                                    newEmployments[index].customer_count = e.target.value;
                                                    setPastEmployments(newEmployments);
                                                }}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Questions */}
                    {questions.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium border-b pb-2">質問事項</h3>
                            <div className="space-y-4">
                                {questions.map(q => (
                                    <div key={q.id} className="space-y-2">
                                        <Label>{q.content}</Label>
                                        <Textarea
                                            value={answers[q.id] || ""}
                                            onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                                            placeholder="回答を入力..."
                                            className="min-h-[80px]"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Remarks */}
                    <div className="space-y-2">
                        <Label>備考</Label>
                        <Textarea
                            value={remarks}
                            onChange={e => setRemarks(e.target.value)}
                            placeholder="その他特記事項など"
                            className="min-h-[100px]"
                        />
                    </div>

                    <div className="flex justify-between pt-4">
                        {resumeId && (
                            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                                削除
                            </Button>
                        )}
                        <div className="flex gap-2 ml-auto">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                                キャンセル
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !profileId}>
                                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                保存
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
