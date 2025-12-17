import { createServerClient } from "@/lib/supabaseServerClient";
import { NextRequest, NextResponse } from "next/server";

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

// Get the business date based on day_switch_time
// If current JST time is before day_switch_time, it belongs to the previous business day
function getBusinessDate(timestamp: Date, daySwitchHour: number): string {
    const jstDate = new Date(timestamp.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const currentHour = jstDate.getHours();

    // If current hour is before the switch time, it belongs to the previous day's business
    if (currentHour < daySwitchHour) {
        jstDate.setDate(jstDate.getDate() - 1);
    }

    return `${jstDate.getFullYear()}-${String(jstDate.getMonth() + 1).padStart(2, "0")}-${String(jstDate.getDate()).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
    const supabase = await createServerClient() as any;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "認証エラー" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (profileError || !profile?.store_id) {
        return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    const storeId = profile.store_id;
    const searchParams = request.nextUrl.searchParams;
    const roleFilter = searchParams.get("role") || "cast";

    // Get store settings for day_switch_time
    const { data: storeData } = await supabase
        .from("stores")
        .select("day_switch_time")
        .eq("id", storeId)
        .single();

    // Parse day_switch_time (format: "05:00:00" or "05:00") - default to 5am
    const daySwitchTimeStr = storeData?.day_switch_time || "05:00";
    const daySwitchHour = parseInt(daySwitchTimeStr.split(":")[0], 10) || 5;

    const now = new Date();
    const jstInfo = getJSTDateInfo(now);

    // 過去90日分のデータを取得
    const startDate = new Date(jstInfo.year, jstInfo.month - 3, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = now;

    try {
        // Get profiles with salary systems
        const roles = roleFilter === "staff" ? ["staff", "admin"] : [roleFilter];
        const { data: profiles } = await supabase
            .from("profiles")
            .select(`
                id,
                display_name,
                role,
                profile_salary_systems(
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
                        shared_count_type,
                        deductions
                    )
                )
            `)
            .eq("store_id", storeId)
            .in("role", roles);

        if (!profiles || profiles.length === 0) {
            return NextResponse.json({ records: [], todayTotal: 0 });
        }

        const profileIds = profiles.map((p: any) => p.id);
        const profileMap = new Map<string, any>(profiles.map((p: any) => [p.id, p]));

        // Get time cards for the period
        const { data: timeCards } = await supabase
            .from("work_records")
            .select("id, profile_id, user_id, work_date, clock_in, clock_out")
            .in("user_id", profileIds)
            .gte("work_date", getJSTDateString(startDate))
            .lte("work_date", getJSTDateString(endDate))
            .order("work_date", { ascending: false });

        // Get table sessions for the period with table info
        const { data: sessions } = await supabase
            .from("table_sessions")
            .select("id, start_time, table_id, tables(name)")
            .eq("store_id", storeId)
            .gte("start_time", startDate.toISOString())
            .lte("start_time", endDate.toISOString());

        const sessionIds = sessions?.map((s: any) => s.id) || [];
        let orders: any[] = [];

        if (sessionIds.length > 0) {
            const { data: orderData } = await supabase
                .from("orders")
                .select("table_session_id, cast_id, guest_id, menu_id, quantity, amount, item_name")
                .in("table_session_id", sessionIds)
                .in("cast_id", profileIds);

            if (orderData) orders = orderData;
        }

        // Get guest profiles for guest_id mapping
        const guestIds = [...new Set(orders.filter(o => o.guest_id).map(o => o.guest_id))];
        let guestMap = new Map<string, string>();

        if (guestIds.length > 0) {
            const { data: guestProfiles } = await supabase
                .from("profiles")
                .select("id, display_name")
                .in("id", guestIds);

            if (guestProfiles) {
                guestMap = new Map(guestProfiles.map((g: any) => [g.id, g.display_name || "不明"]));
            }
        }

        // Create session info map (date and table name)
        const sessionInfoMap = new Map<string, { date: string; tableName: string }>(
            sessions?.map((s: any) => [
                s.id,
                {
                    date: getJSTDateString(new Date(s.start_time)),
                    tableName: s.tables?.name || "不明"
                }
            ]) || []
        );

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

        // Build records by date and profile
        const recordMap = new Map<string, {
            date: string;
            label: string;
            profileId: string;
            name: string;
            hourlyWage: number;
            hourlyDetails: {
                timeCardId: string;
                hourlyRate: number;
                clockIn: string | null;
                clockOut: string | null;
                hoursWorked: number;
            } | null;
            backAmount: number;
            backDetails: {
                sessionId: string;
                tableName: string;
                guestName: string | null;
                menuName: string;
                quantity: number;
                unitBack: number;
                amount: number;
            }[];
            deductionAmount: number;
            deductionDetails: { name: string; amount: number; type: string }[];
            totalSalary: number;
            salarySystemId: string | null;
            salarySystemName: string | null;
        }>();

        const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

        // Process time cards for hourly wage
        for (const tc of (timeCards || [])) {
            const key = `${tc.work_date}_${tc.user_id}`;
            const profileData = profileMap.get(tc.user_id);
            if (!profileData) continue;

            const salarySystem = profileData.profile_salary_systems?.[0]?.salary_systems;
            const hourlySettings = salarySystem?.hourly_settings || {};
            const deductions = salarySystem?.deductions || [];

            const info = getJSTDateInfo(new Date(tc.work_date + "T00:00:00+09:00"));
            const label = `${info.month + 1}/${info.day} (${weekdays[info.dayOfWeek]})`;

            let hourlyWage = 0;
            let hourlyDetails: { timeCardId: string; hourlyRate: number; clockIn: string | null; clockOut: string | null; hoursWorked: number } | null = null;

            if (tc.clock_in) {
                const clockIn = new Date(tc.clock_in);
                let clockOut = tc.clock_out ? new Date(tc.clock_out) : new Date();

                // Handle day-crossing: if clock_out is before clock_in, assume it's the next day
                // This can happen when only time is stored and the date wasn't properly adjusted
                if (clockOut.getTime() < clockIn.getTime()) {
                    // Add 24 hours to clock_out to account for day crossing
                    clockOut = new Date(clockOut.getTime() + 24 * 60 * 60 * 1000);
                }

                const rawMinutesWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);

                // Apply time unit rounding
                const timeUnitMinutes = hourlySettings.time_unit_minutes || 60;
                const timeRoundingType = hourlySettings.time_rounding_type || 'round';

                let roundedMinutes: number;
                if (timeRoundingType === 'down') {
                    // 繰り下げ（切り捨て）
                    roundedMinutes = Math.floor(rawMinutesWorked / timeUnitMinutes) * timeUnitMinutes;
                } else if (timeRoundingType === 'up') {
                    // 繰り上げ（切り上げ）
                    roundedMinutes = Math.ceil(rawMinutesWorked / timeUnitMinutes) * timeUnitMinutes;
                } else {
                    // 四捨五入
                    roundedMinutes = Math.round(rawMinutesWorked / timeUnitMinutes) * timeUnitMinutes;
                }

                const hoursWorked = roundedMinutes / 60;

                // hourly_settings.amount is the hourly rate (時給額)
                const hourlyRate = hourlySettings.amount || 0;
                hourlyWage = Math.floor(hoursWorked * hourlyRate);

                hourlyDetails = {
                    timeCardId: tc.id,
                    hourlyRate,
                    clockIn: formatJSTTime(tc.clock_in),
                    clockOut: tc.clock_out ? formatJSTTime(tc.clock_out) : null,
                    hoursWorked: Math.round(hoursWorked * 100) / 100,
                };
            }

            let deductionAmount = 0;
            const deductionDetails: { name: string; amount: number; type: string }[] = [];
            for (const ded of deductions) {
                if (ded.type === "fixed" && ded.amount) {
                    deductionAmount += ded.amount;
                    deductionDetails.push({ name: ded.name || "控除", amount: ded.amount, type: "固定" });
                } else if (ded.type === "percent" && ded.amount) {
                    // Percent deductions - amount field contains the percentage value
                    // Will be calculated after we know the total earnings
                    deductionDetails.push({ name: ded.name || "控除", amount: ded.amount, type: "percent" });
                }
            }

            if (!recordMap.has(key)) {
                recordMap.set(key, {
                    date: tc.work_date,
                    label,
                    profileId: tc.user_id,
                    name: profileData.display_name || "不明",
                    hourlyWage: 0,
                    hourlyDetails: null,
                    backAmount: 0,
                    backDetails: [],
                    deductionAmount: 0,
                    deductionDetails: [],
                    totalSalary: 0,
                    salarySystemId: salarySystem?.id || null,
                    salarySystemName: salarySystem?.name || null,
                });
            }

            const record = recordMap.get(key)!;
            record.hourlyWage = hourlyWage;
            record.hourlyDetails = hourlyDetails;
            record.deductionAmount = deductionAmount;
            record.deductionDetails = deductionDetails;
        }

        // Helper function to calculate back amount based on salary system settings
        const calculateBackAmount = (
            backSettings: any,
            menuPrice: number,
            quantity: number,
            defaultCastBack: number
        ): number => {
            if (!backSettings) {
                // No salary system settings, use menu's cast_back_amount
                return defaultCastBack * quantity;
            }

            const calculationType = backSettings.calculation_type;
            let backAmount = 0;

            if (calculationType === 'fixed') {
                // 固定金額
                backAmount = (backSettings.fixed_amount || 0) * quantity;
            } else if (calculationType === 'total_percent' || calculationType === 'subtotal_percent') {
                // パーセンテージ（合計または小計ベース）
                const percentage = backSettings.percentage || 0;
                backAmount = Math.floor(menuPrice * quantity * (percentage / 100));
            }

            // Apply rounding if specified
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

        // Helper function to determine fee type from item_name
        const getFeeTypeFromItemName = (itemName: string | null): string | null => {
            if (!itemName) return null;
            if (itemName.includes('指名') && !itemName.includes('場内')) return 'shimei';
            if (itemName.includes('場内')) return 'jounai';
            if (itemName.includes('同伴')) return 'douhan';
            return null;
        };

        // Process orders for back amount
        for (const order of orders) {
            if (!order.cast_id) continue;

            const sessionInfo = sessionInfoMap.get(order.table_session_id);
            if (!sessionInfo) continue;

            const dateKey = sessionInfo.date;
            const key = `${dateKey}_${order.cast_id}`;
            const profileData = profileMap.get(order.cast_id);
            if (!profileData) continue;

            const quantity = order.quantity || 1;
            const salarySystem = profileData.profile_salary_systems?.[0]?.salary_systems;

            // Get menu info if menu_id exists, otherwise use item_name
            const menuInfo = order.menu_id ? menuMap.get(order.menu_id) : null;

            // Determine fee type - first check menu category, then item_name
            let feeType: string | null = null;
            let itemName = "";
            let itemPrice = 0;
            let defaultCastBack = 0;

            if (menuInfo) {
                feeType = menuInfo.feeType;
                itemName = menuInfo.name;
                itemPrice = menuInfo.price;
                defaultCastBack = menuInfo.castBack;
            } else if (order.item_name) {
                // For manual items (指名料, 場内指名料, etc.)
                feeType = getFeeTypeFromItemName(order.item_name);
                itemName = order.item_name;
                itemPrice = order.amount || 0;
                defaultCastBack = 0; // Manual items don't have default cast back
            } else {
                continue; // Skip if no menu and no item_name
            }

            // Determine which back settings to use based on fee_type
            let backSettings = null;
            let backType = "store";

            if (feeType === 'shimei') {
                backSettings = salarySystem?.shimei_back_settings;
                backType = "shimei";
            } else if (feeType === 'jounai') {
                backSettings = salarySystem?.jounai_back_settings;
                backType = "jounai";
            } else if (feeType === 'douhan') {
                backSettings = salarySystem?.douhan_back_settings;
                backType = "douhan";
            } else {
                // Regular menu items use store_back_settings
                backSettings = salarySystem?.store_back_settings;
                backType = "store";
            }

            // Calculate back amount
            const backAmount = calculateBackAmount(
                backSettings,
                itemPrice,
                quantity,
                defaultCastBack
            );

            if (!recordMap.has(key)) {
                const info = getJSTDateInfo(new Date(dateKey + "T00:00:00+09:00"));
                const label = `${info.month + 1}/${info.day} (${weekdays[info.dayOfWeek]})`;

                recordMap.set(key, {
                    date: dateKey,
                    label,
                    profileId: order.cast_id,
                    name: profileData.display_name || "不明",
                    hourlyWage: 0,
                    hourlyDetails: null,
                    backAmount: 0,
                    backDetails: [],
                    deductionAmount: 0,
                    deductionDetails: [],
                    totalSalary: 0,
                    salarySystemId: salarySystem?.id || null,
                    salarySystemName: salarySystem?.name || null,
                });
            }

            const record = recordMap.get(key)!;
            record.backAmount += backAmount;

            // Add back detail
            if (backAmount > 0) {
                const guestName = order.guest_id ? guestMap.get(order.guest_id) || null : null;
                record.backDetails.push({
                    sessionId: order.table_session_id,
                    tableName: sessionInfo.tableName,
                    guestName,
                    menuName: itemName,
                    quantity,
                    unitBack: Math.floor(backAmount / quantity),
                    amount: backAmount,
                });
            }
        }

        // Calculate total salary for each record
        for (const record of recordMap.values()) {
            const grossEarnings = record.hourlyWage + record.backAmount;

            // Calculate percent deductions based on gross earnings
            let totalDeduction = 0;
            for (const detail of record.deductionDetails) {
                if (detail.type === "percent") {
                    // detail.amount contains the percentage value
                    const percentValue = detail.amount;
                    const percentDeduction = Math.floor(grossEarnings * (percentValue / 100));
                    detail.amount = percentDeduction; // Update with calculated amount
                    detail.type = `${percentValue}%`; // Show original percentage for display
                    totalDeduction += percentDeduction;
                } else if (detail.type === "固定") {
                    totalDeduction += detail.amount;
                }
            }

            record.deductionAmount = totalDeduction;
            record.totalSalary = grossEarnings - totalDeduction;
        }

        // Sort by date descending
        const records = Array.from(recordMap.values())
            .sort((a, b) => b.date.localeCompare(a.date));

        // Calculate today's total
        const today = getJSTDateString();
        const todayTotal = records
            .filter(r => r.date === today)
            .reduce((sum, r) => sum + Math.max(0, r.totalSalary), 0);

        return NextResponse.json({ records, todayTotal });
    } catch (error) {
        console.error("Payroll API error:", error);
        return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
    }
}
