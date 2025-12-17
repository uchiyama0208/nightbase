import { createServerClient } from "@/lib/supabaseServerClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createServerClient() as any;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "認証エラー" }, { status: 401 });
    }

    // Get current user's profile to check store_id
    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("id, store_id")
        .eq("user_id", user.id)
        .single();

    if (!currentProfile?.store_id) {
        return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    const storeId = currentProfile.store_id;

    // Get the timecard with profile info
    const { data: timeCard, error } = await supabase
        .from("work_records")
        .select(`
            id,
            profile_id,
            work_date,
            clock_in,
            clock_out,
            break_start,
            break_end,
            pickup_required,
            pickup_destination,
            profiles!work_records_profile_id_fkey(
                id,
                display_name,
                store_id
            )
        `)
        .eq("id", id)
        .single();

    if (error || !timeCard) {
        return NextResponse.json({ error: "勤怠データが見つかりません" }, { status: 404 });
    }

    // Verify the timecard belongs to the same store
    const tcProfile = timeCard.profiles as any;
    if (tcProfile?.store_id !== storeId) {
        return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    // Get all profiles for the store (needed for AttendanceModal)
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, real_name, role")
        .eq("store_id", storeId)
        .in("role", ["cast", "staff", "admin"]);

    // Format as AttendanceRecord for the modal
    const attendanceRecord = {
        id: timeCard.id,
        profile_id: timeCard.profile_id,
        date: timeCard.work_date,
        status: timeCard.clock_out ? "completed" : "working",
        start_time: timeCard.clock_in,
        end_time: timeCard.clock_out,
        pickup_destination: timeCard.pickup_destination,
    };

    return NextResponse.json({
        record: attendanceRecord,
        profiles: profiles || [],
        currentProfileId: currentProfile.id,
    });
}
