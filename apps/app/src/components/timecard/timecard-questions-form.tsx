"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export interface TimecardQuestion {
    id: string;
    label: string;
    field_type: string;
    options: string[] | null;
    is_required: boolean;
    target_role: string;
    timing: string;
    sort_order: number;
}

interface TimecardQuestionsFormProps {
    questions: TimecardQuestion[];
    answers: Record<string, string>;
    onAnswersChange: (answers: Record<string, string>) => void;
    onValidationChange?: (isValid: boolean) => void;
    isDarkMode?: boolean;
}

export function TimecardQuestionsForm({
    questions,
    answers,
    onAnswersChange,
    onValidationChange,
    isDarkMode = false,
}: TimecardQuestionsFormProps) {
    const [localAnswers, setLocalAnswers] = useState<Record<string, string>>(answers);

    useEffect(() => {
        setLocalAnswers(answers);
    }, [answers]);

    useEffect(() => {
        // Validate required fields
        const isValid = questions.every((q) => {
            if (!q.is_required) return true;
            const answer = localAnswers[q.id];
            if (!answer || answer.trim() === "") return false;
            return true;
        });
        onValidationChange?.(isValid);
    }, [localAnswers, questions, onValidationChange]);

    const handleChange = (questionId: string, value: string) => {
        const newAnswers = { ...localAnswers, [questionId]: value };
        setLocalAnswers(newAnswers);
        onAnswersChange(newAnswers);
    };

    if (questions.length === 0) {
        return null;
    }

    const textClass = isDarkMode ? "text-white" : "text-gray-900";
    const inputClass = isDarkMode
        ? "bg-gray-800 border-gray-700 text-white"
        : "bg-white border-gray-300 text-gray-900";

    const renderField = (question: TimecardQuestion) => {
        const value = localAnswers[question.id] || "";

        switch (question.field_type) {
            case "text":
                return (
                    <Input
                        value={value}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        placeholder={`${question.label}を入力`}
                        className={inputClass}
                    />
                );

            case "textarea":
                return (
                    <Textarea
                        value={value}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        placeholder={`${question.label}を入力`}
                        rows={3}
                        className={inputClass}
                    />
                );

            case "number":
                return (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        placeholder="0"
                        className={inputClass}
                    />
                );

            case "select":
                return (
                    <Select value={value} onValueChange={(v) => handleChange(question.id, v)}>
                        <SelectTrigger className={inputClass}>
                            <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                            {question.options?.map((option, idx) => (
                                <SelectItem key={idx} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );

            case "checkbox":
                return (
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id={`question-${question.id}`}
                            checked={value === "true"}
                            onChange={(e) => handleChange(question.id, e.target.checked ? "true" : "false")}
                            className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor={`question-${question.id}`} className={`cursor-pointer ${textClass}`}>
                            はい
                        </Label>
                    </div>
                );

            default:
                return (
                    <Input
                        value={value}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        placeholder={`${question.label}を入力`}
                        className={inputClass}
                    />
                );
        }
    };

    return (
        <div className="space-y-4">
            {questions.map((question) => (
                <div key={question.id} className="space-y-1.5">
                    <Label className={`text-sm font-medium ${textClass}`}>
                        {question.label}
                        {question.is_required && (
                            <span className="text-red-500 ml-1">*</span>
                        )}
                    </Label>
                    {renderField(question)}
                </div>
            ))}
        </div>
    );
}
