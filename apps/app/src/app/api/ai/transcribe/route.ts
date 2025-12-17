import OpenAI from "openai";
import { createServerClient } from "@/lib/supabaseServerClient";

export const maxDuration = 60;

// OpenAIクライアントを遅延初期化（ビルド時のエラーを防ぐ）
let openai: OpenAI | null = null;
function getOpenAI() {
    if (!openai) {
        openai = new OpenAI();
    }
    return openai;
}

export async function POST(req: Request) {
    try {
        const supabase = await createServerClient() as any;

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return new Response("Unauthorized", { status: 401 });
        }

        // Get current profile and verify role
        const { data: appUser } = await supabase
            .from("users")
            .select("current_profile_id")
            .eq("id", user.id)
            .maybeSingle();

        if (!appUser?.current_profile_id) {
            return new Response("No profile selected", { status: 400 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("id, store_id, role")
            .eq("id", appUser.current_profile_id)
            .maybeSingle();

        // Check if user has admin or staff role
        if (!profile || !["admin", "staff"].includes(profile.role)) {
            return new Response("Permission denied", { status: 403 });
        }

        // Get audio file from form data
        const formData = await req.formData();
        const audioFile = formData.get("audio") as File;

        if (!audioFile) {
            return new Response("No audio file provided", { status: 400 });
        }

        // Call Whisper API
        const transcription = await getOpenAI().audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            language: "ja",
        });

        return Response.json({ text: transcription.text });
    } catch (error) {
        console.error("Transcription error:", error);
        return new Response("Transcription failed", { status: 500 });
    }
}
