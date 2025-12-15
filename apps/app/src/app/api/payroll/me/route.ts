import { createServerClient } from "@/lib/supabaseServerClient";
import { NextResponse } from "next/server";

function getJSTDateString(date?: Date): string {
    const d = date || new Date();
    return d.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");
}

function getJSTDateInfo(date: Date) {
    const jstDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    return {
        year: jstDate.getFullYear(),
        month: jstDate.getMonth(),
        day: jstDate.getDate(),
        dayOfWeek: jstDate.getDay(),
    };
}

function formatJSTTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export async function GET() {
    const supabase = await createServerClient() as any;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "認証エラー" }, { status: 401 });
    }

    // Get user's current profile
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .single();

    if (!appUser?.current_profile_id) {
        return NextResponse.json({ records: [] });
    }

    // Get profile with store info
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, store_id, display_name, role")
        .eq("id", appUser.current_profile_id)
        .single();

    if (!profile?.store_id) {
        return NextResponse.json({ records: [] });
    }

    const profileId = profile.id;
    const storeId = profile.store_id;

    // Get salary system for this profile
    const { data: profileSalarySystem } = await supabase
        .from("profile_salary_systems")
        .select(`
            salary_system_id,
            salary_systems(
                id,
                name,
                target_type,
                hourly_settings,
                store_back_settings,
                jounai_back_settings,
                shimei_back_settings,
                douhan_back_settings,
                deductions
            )
        `)
        .eq("profile_id", profileId)
        .single();

    const salarySystem = profileSalarySystem?.salary_systems;

    const now = new Date();
    const jstInfo = getJSTDateInfo(now);

    // 過去90日分のデータを取得
    const startDate = new Date(jstInfo.year, jstInfo.month - 3, 1);
    startDate.setHours(0, 0, 0, 0);

    try {
        // Get time cards
        const { data: timeCards } = await supabase
            .from("time_cards")
            .select("id, work_date, clock_in, clock_out")
            .eq("user_id", profileId)
            .gte("work_date", getJSTDateString(startDate))
            .lte("work_date", getJSTDateString(now))
            .order("work_date", { ascending: false });

        // Get table sessions
        const { data: sessions } = await supabase
            .from("table_sessions")
            .select("id, start_time, table_id, tables(name)")
            .eq("store_id", storeId)
            .gte("start_time", startDate.toISOString())
            .lte("start_time", now.toISOString());

        const sessionIds = sessions?.map((s: any) => s.id) || [];
        let orders: any[] = [];

        if (sessionIds.length > 0) {
            const { data: orderData } = await supabase
                .from("orders")
                .select("table_session_id, cast_id, guest_id, menu_id, quantity, amount, item_name")
                .in("table_session_id", sessionIds)
                .eq("cast_id", profileId);

            if (orderData) orders = orderData;
        }

        // Get menus with category info
        const { data: menusData } = await supabase
            .from("menus")
            .select("id, name, cast_back_amount, price, category_id, menu_categories(name)")
            .eq("store_id", storeId);

        // Determine fee type from category name
        const getFeeTypeFromCategory = (categoryName: string | null): string | null => {
            if (!categoryName) return null;
            const lowerName = categoryName.toLowerCase();
            if (lowerName.includes('指名') && !lowerName.includes('場内')) return 'shimei';
            if (lowerName.includes('場内')) return 'jounai';
            if (lowerName.includes('同伴')) return 'douhan';
            return null;
        };

        const menuMap = new Map<string, { name: string; castBack: number; feeType: string | null; price: number }>(
            menusData?.map((m: any) => {
                const categoryName = m.menu_categories?.name || null;
                return [m.id, {
                    name: m.name || "不明",
                    castBack: m.cast_back_amount || 0,
                    feeType: getFeeTypeFromCategory(categoryName),
                    price: m.price || 0
                }];
            }) || []
        );

        // Create session info map
        const sessionInfoMap = new Map<string, { date: string; tableName: string }>(
            sessions?.map((s: any) => [
                s.id,
                {
                    date: getJSTDateString(new Date(s.start_time)),
                    tableName: s.tables?.name || "不明"
                }
            ]) || []
        );

        // Build records by date
        const recordMap = new Map<string, {
            date: string;
            label: string;
            profileId: string;
            name: string;
            hourlyWage: number;
            backAmount: number;
            deductionAmount: number;
            totalSalary: number;
        }>();

        const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
        const hourlySettings = salarySystem?.hourly_settings || {};
        const deductions = salarySystem?.deductions || [];

        // Process time cards
        for (const tc of (timeCards || [])) {
            const info = getJSTDateInfo(new Date(tc.work_date + "T00:00:00+09:00"));
            const label = `${info.month + 1}/${info.day} (${weekdays[info.dayOfWeek]})`;

            let hourlyWage = 0;

            if (tc.clock_in) {
                const clockIn = new Date(tc.clock_in);
                let clockOut = tc.clock_out ? new Date(tc.clock_out) : new Date();

                if (clockOut.getTime() < clockIn.getTime()) {
                    clockOut = new Date(clockOut.getTime() + 24 * 60 * 60 * 1000);
                }

                const rawMinutesWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);
                const timeUnitMinutes = hourlySettings.time_unit_minutes || 60;
                const timeRoundingType = hourlySettings.time_rounding_type || 'round';

                let roundedMinutes: number;
                if (timeRoundingType === 'down') {
                    roundedMinutes = Math.floor(rawMinutesWorked / timeUnitMinutes) * timeUnitMinutes;
                } else if (timeRoundingType === 'up') {
                    roundedMinutes = Math.ceil(rawMinutesWorked / timeUnitMinutes) * timeUnitMinutes;
                } else {
                    roundedMinutes = Math.round(rawMinutesWorked / timeUnitMinutes) * timeUnitMinutes;
                }

                const hoursWorked = roundedMinutes / 60;
                const hourlyRate = hourlySettings.amount || 0;
                hourlyWage = Math.floor(hoursWorked * hourlyRate);
            }

            let deductionAmount = 0;
            for (const ded of deductions) {
                if (ded.type === "fixed" && ded.amount) {
                    deductionAmount += ded.amount;
                }
            }

            if (!recordMap.has(tc.work_date)) {
                recordMap.set(tc.work_date, {
                    date: tc.work_date,
                    label,
                    profileId,
                    name: profile.display_name || "不明",
                    hourlyWage: 0,
                    backAmount: 0,
                    deductionAmount: 0,
                    totalSalary: 0,
                });
            }

            const record = recordMap.get(tc.work_date)!;
            record.hourlyWage = hourlyWage;
            record.deductionAmount = deductionAmount;
        }

        // Helper function
        const calculateBackAmount = (
            backSettings: any,
            menuPrice: number,
            quantity: number,
            defaultCastBack: number
        ): number => {
            if (!backSettings) {
                return defaultCastBack * quantity;
            }

            const calculationType = backSettings.calculation_type;
            let backAmount = 0;

            if (calculationType === 'fixed') {
                backAmount = (backSettings.fixed_amount || 0) * quantity;
            } else if (calculationType === 'total_percent' || calculationType === 'subtotal_percent') {
                const percentage = backSettings.percentage || 0;
                backAmount = Math.floor(menuPrice * quantity * (percentage / 100));
            }

            if (backSettings.rounding_type && backSettings.rounding_unit) {
                const unit = backSettings.rounding_unit;
                if (backSettings.rounding_type === 'down') {
                    backAmount = Math.floor(backAmount / unit) * unit;
                } else if (backSettings.rounding_type === 'up') {
                    backAmount = Math.ceil(backAmount / unit) * unit;
                } else {
                    backAmount = Math.round(backAmount / unit) * unit;
                }
            }

            return backAmount;
        };

        const getFeeTypeFromItemName = (itemName: string | null): string | null => {
            if (!itemName) return null;
            if (itemName.includes('指名') && !itemName.includes('場内')) return 'shimei';
            if (itemName.includes('場内')) return 'jounai';
            if (itemName.includes('同伴')) return 'douhan';
            return null;
        };

        // Process orders
        for (const order of orders) {
            const sessionInfo = sessionInfoMap.get(order.table_session_id);
            if (!sessionInfo) continue;

            const dateKey = sessionInfo.date;
            const quantity = order.quantity || 1;

            const menuInfo = order.menu_id ? menuMap.get(order.menu_id) : null;

            let feeType: string | null = null;
            let itemPrice = 0;
            let defaultCastBack = 0;

            if (menuInfo) {
                feeType = menuInfo.feeType;
                itemPrice = menuInfo.price;
                defaultCastBack = menuInfo.castBack;
            } else if (order.item_name) {
                feeType = getFeeTypeFromItemName(order.item_name);
                itemPrice = order.amount || 0;
                defaultCastBack = 0;
            } else {
                continue;
            }

            let backSettings = null;
            if (feeType === 'shimei') {
                backSettings = salarySystem?.shimei_back_settings;
            } else if (feeType === 'jounai') {
                backSettings = salarySystem?.jounai_back_settings;
            } else if (feeType === 'douhan') {
                backSettings = salarySystem?.douhan_back_settings;
            } else {
                backSettings = salarySystem?.store_back_settings;
            }

            const backAmount = calculateBackAmount(backSettings, itemPrice, quantity, defaultCastBack);

            if (!recordMap.has(dateKey)) {
                const info = getJSTDateInfo(new Date(dateKey + "T00:00:00+09:00"));
                const label = `${info.month + 1}/${info.day} (${weekdays[info.dayOfWeek]})`;

                recordMap.set(dateKey, {
                    date: dateKey,
                    label,
                    profileId,
                    name: profile.display_name || "不明",
                    hourlyWage: 0,
                    backAmount: 0,
                    deductionAmount: 0,
                    totalSalary: 0,
                });
            }

            const record = recordMap.get(dateKey)!;
            record.backAmount += backAmount;
        }

        // Calculate totals
        for (const record of recordMap.values()) {
            const grossEarnings = record.hourlyWage + record.backAmount;

            // Calculate percent deductions
            let totalDeduction = record.deductionAmount;
            for (const ded of deductions) {
                if (ded.type === "percent" && ded.amount) {
                    totalDeduction += Math.floor(grossEarnings * (ded.amount / 100));
                }
            }

            record.deductionAmount = totalDeduction;
            record.totalSalary = grossEarnings - totalDeduction;
        }

        // Sort by date descending
        const records = Array.from(recordMap.values())
            .sort((a, b) => b.date.localeCompare(a.date));

        return NextResponse.json({ records });
    } catch (error) {
        console.error("Payroll me API error:", error);
        return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
    }
}
