"use client";

import { useState, useEffect } from "react";

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

interface TabletTimecardQuestionsProps {
    questions: TimecardQuestion[];
    onValidationChange?: (isValid: boolean) => void;
    isDarkMode?: boolean;
}

export function TabletTimecardQuestions({
    questions,
    onValidationChange,
    isDarkMode = false,
}: TabletTimecardQuestionsProps) {
    const [answers, setAnswers] = useState<Record<string, string>>({});

    useEffect(() => {
        // Validate required fields
        const isValid = questions.every((q) => {
            if (!q.is_required) return true;
            const answer = answers[q.id];
            if (!answer || answer.trim() === "") return false;
            return true;
        });
        onValidationChange?.(isValid);
    }, [answers, questions, onValidationChange]);

    const handleChange = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    if (questions.length === 0) {
        return null;
    }

    const textClass = isDarkMode ? "text-white" : "text-gray-900";
    const labelClass = isDarkMode ? "text-gray-300" : "text-gray-700";
    const inputClass = isDarkMode
        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500";

    const renderField = (question: TimecardQuestion) => {
        const value = answers[question.id] || "";
        const inputName = `question_${question.id}`;

        switch (question.field_type) {
            case "text":
                return (
                    <input
                        type="text"
                        name={inputName}
                        value={value}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        placeholder={`${question.label}を入力`}
                        className={`w-full px-4 py-3 text-lg rounded-xl border-2 focus:outline-none transition-colors ${inputClass}`}
                    />
                );

            case "textarea":
                return (
                    <textarea
                        name={inputName}
                        value={value}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        placeholder={`${question.label}を入力`}
                        rows={3}
                        className={`w-full px-4 py-3 text-lg rounded-xl border-2 focus:outline-none transition-colors resize-none ${inputClass}`}
                    />
                );

            case "number":
                return (
                    <input
                        type="number"
                        name={inputName}
                        value={value}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        placeholder="0"
                        className={`w-full px-4 py-3 text-lg rounded-xl border-2 focus:outline-none transition-colors ${inputClass}`}
                    />
                );

            case "select":
                return (
                    <select
                        name={inputName}
                        value={value}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        className={`w-full px-4 py-3 text-lg rounded-xl border-2 focus:outline-none transition-colors ${inputClass}`}
                    >
                        <option value="">選択してください</option>
                        {question.options?.map((option, idx) => (
                            <option key={idx} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                );

            case "checkbox":
                return (
                    <div className="flex items-center gap-3">
                        <input
                            type="hidden"
                            name={inputName}
                            value={value}
                        />
                        <button
                            type="button"
                            onClick={() => handleChange(question.id, value === "true" ? "false" : "true")}
                            className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${
                                value === "true"
                                    ? "bg-blue-500 border-blue-500 text-white"
                                    : isDarkMode
                                    ? "bg-gray-700 border-gray-600"
                                    : "bg-white border-gray-300"
                            }`}
                        >
                            {value === "true" && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                        <span className={`text-lg ${labelClass}`}>はい</span>
                    </div>
                );

            default:
                return (
                    <input
                        type="text"
                        name={inputName}
                        value={value}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        placeholder={`${question.label}を入力`}
                        className={`w-full px-4 py-3 text-lg rounded-xl border-2 focus:outline-none transition-colors ${inputClass}`}
                    />
                );
        }
    };

    return (
        <div className="space-y-4">
            {questions.map((question) => (
                <div key={question.id} className="space-y-2">
                    <label className={`block text-base font-medium ${labelClass}`}>
                        {question.label}
                        {question.is_required && (
                            <span className="text-red-500 ml-1">*</span>
                        )}
                    </label>
                    {renderField(question)}
                </div>
            ))}
        </div>
    );
}
