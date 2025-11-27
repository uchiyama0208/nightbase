"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, GripVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getResumeQuestions, updateResumeQuestions } from "../../resumes/actions";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface ResumeSettingsClientProps {
    storeId: string;
}

export default function ResumeSettingsClient({ storeId }: ResumeSettingsClientProps) {
    const [questions, setQuestions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (storeId) {
            loadQuestions();
        }
    }, [storeId]);

    const loadQuestions = async () => {
        setIsLoading(true);
        if (storeId) {
            const data = await getResumeQuestions(storeId);
            setQuestions(data || []);
        }
        setIsLoading(false);
    };

    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            {
                id: `temp_${Date.now()}`,
                content: "",
                is_active: true,
            }
        ]);
    };

    const handleRemoveQuestion = (index: number) => {
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
    };

    const handleUpdateQuestion = (index: number, field: string, value: any) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setQuestions(newQuestions);
    };

    const handleDragEnd = (result: any) => {
        if (!result.destination) return;

        const items = Array.from(questions);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setQuestions(items);
    };

    const handleSave = async () => {
        if (!storeId) return;
        setIsSaving(true);
        try {
            await updateResumeQuestions(storeId, questions);
            alert("保存しました");
            loadQuestions(); // Reload to get real IDs
        } catch (error) {
            console.error("Error saving questions:", error);
            alert("保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-3xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">履歴書設定</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        履歴書の質問項目をカスタマイズします
                    </p>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    変更を保存
                </Button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-medium">質問項目</h2>
                    <Button variant="outline" size="sm" onClick={handleAddQuestion}>
                        <Plus className="h-4 w-4 mr-2" />
                        質問を追加
                    </Button>
                </div>

                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="questions">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-3"
                            >
                                {questions.map((question, index) => (
                                    <Draggable key={question.id} draggableId={question.id} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 group"
                                            >
                                                <div {...provided.dragHandleProps} className="text-gray-400 cursor-move hover:text-gray-600">
                                                    <GripVertical className="h-5 w-5" />
                                                </div>

                                                <div className="flex-1 space-y-2">
                                                    <Input
                                                        value={question.content}
                                                        onChange={(e) => handleUpdateQuestion(index, "content", e.target.value)}
                                                        placeholder="質問内容を入力 (例: お酒は飲めますか？)"
                                                        className="bg-white dark:bg-gray-900"
                                                    />
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <Label htmlFor={`active-${question.id}`} className="text-xs text-gray-500">有効</Label>
                                                        <Switch
                                                            id={`active-${question.id}`}
                                                            checked={question.is_active}
                                                            onCheckedChange={(checked) => handleUpdateQuestion(index, "is_active", checked)}
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveQuestion(index)}
                                                        className="text-gray-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                {questions.length === 0 && (
                    <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                        質問項目がありません
                    </div>
                )}
            </div>
        </div>
    );
}
