"use client";

import { useState } from "react";

type PickupFormProps = {
    profileId?: string; // Optional as it might not be needed for main app logic immediately
    pickupHistory: string[];
    onValidationChange: (isValid: boolean) => void;
    isDarkMode: boolean;
    onPickupChange?: (required: boolean) => void;
    onDestinationChange?: (destination: string) => void;
};

export function PickupForm({
    pickupHistory,
    onValidationChange,
    isDarkMode,
    onPickupChange,
    onDestinationChange
}: PickupFormProps) {
    const [pickupRequired, setPickupRequired] = useState<boolean | null>(null);
    const [destination, setDestination] = useState("");

    const handlePickupChange = (value: boolean) => {
        setPickupRequired(value);
        if (onPickupChange) onPickupChange(value);

        // Validate when pickup selection changes
        if (value === false) {
            onValidationChange(true); // No pickup = valid
        } else {
            // Check if destination is filled
            onValidationChange(destination.trim() !== "");
            if (onDestinationChange) onDestinationChange(destination);
        }
    };

    const handleDestinationChange = (value: string) => {
        setDestination(value);

        // Validate when destination changes
        if (pickupRequired === true) {
            onValidationChange(value.trim() !== "");
            if (onDestinationChange) onDestinationChange(value);
        }
    };

    return (
        <>
            <div className="space-y-3">
                <div className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>送迎の有無</div>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => handlePickupChange(false)}
                        className={`px-6 py-4 rounded-xl border-2 font-semibold text-lg transition-all ${pickupRequired === false
                            ? "bg-blue-500 border-blue-500 text-white"
                            : isDarkMode
                                ? "bg-slate-800 border-slate-600 text-gray-200 hover:border-slate-400"
                                : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                            }`}
                    >
                        送迎なし
                    </button>
                    <button
                        type="button"
                        onClick={() => handlePickupChange(true)}
                        className={`px-6 py-4 rounded-xl border-2 font-semibold text-lg transition-all ${pickupRequired === true
                            ? "bg-blue-500 border-blue-500 text-white"
                            : isDarkMode
                                ? "bg-slate-800 border-slate-600 text-gray-200 hover:border-slate-400"
                                : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                            }`}
                    >
                        送迎あり
                    </button>
                </div>
            </div>

            <input type="hidden" name="pickup_required" value={pickupRequired === true ? "yes" : "no"} />

            {pickupRequired === true && (
                <div className="space-y-3">
                    <div className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>送迎先</div>
                    <div className="space-y-4">
                        <input
                            type="text"
                            name="pickup_destination_custom"
                            value={destination}
                            onChange={(e) => handleDestinationChange(e.target.value)}
                            placeholder="送迎先を入力"
                            className={`w-full rounded-lg px-4 py-3 text-base border placeholder:text-gray-400 ${isDarkMode
                                ? "bg-slate-800 border-slate-600 text-white placeholder:text-gray-500"
                                : "bg-white border-gray-300 text-gray-900"
                                }`}
                        />

                        {pickupHistory?.length > 0 && (
                            <div className="space-y-2">
                                <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>過去の履歴から選択</div>
                                <div className="flex flex-wrap gap-2">
                                    {pickupHistory.map((dest) => (
                                        <button
                                            key={dest}
                                            type="button"
                                            onClick={() => handleDestinationChange(dest)}
                                            className={`px-4 py-2 rounded-lg text-sm border transition-colors ${destination === dest
                                                ? "bg-blue-500 border-blue-500 text-white"
                                                : isDarkMode
                                                    ? "bg-slate-800 border-slate-600 text-gray-200 hover:border-slate-400"
                                                    : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                                                }`}
                                        >
                                            {dest}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
