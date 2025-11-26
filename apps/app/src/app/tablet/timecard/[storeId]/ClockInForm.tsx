"use client";

import { useState } from "react";
import { PickupForm } from "@/components/timecard/pickup-form";

type ClockInFormProps = {
    storeId: string;
    profileId: string;
    profileName: string;
    pickupHistory: string[];
    tabletClockIn: (formData: FormData) => Promise<void>;
};

export function ClockInForm({ storeId, profileId, profileName, pickupHistory, tabletClockIn, isDarkMode }: ClockInFormProps & { isDarkMode: boolean }) {
    const [isValid, setIsValid] = useState(false);

    return (
        <form action={tabletClockIn} className="flex-1 flex flex-col">
            <input type="hidden" name="store_id" value={storeId} />
            <input type="hidden" name="profile_id" value={profileId} />

            <div className="flex-1 overflow-auto space-y-4">
                <PickupForm
                    profileId={profileId}
                    pickupHistory={pickupHistory}
                    onValidationChange={setIsValid}
                    isDarkMode={isDarkMode}
                />
            </div>

            <button
                type="submit"
                disabled={!isValid}
                className={`mt-4 w-full py-8 rounded-2xl text-white text-2xl font-bold shadow-lg transition-colors ${isValid
                    ? "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                    : "bg-gray-400 cursor-not-allowed"
                    }`}
            >
                出勤する
            </button>
        </form>
    );
}
