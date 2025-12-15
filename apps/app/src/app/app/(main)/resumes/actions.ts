// @ts-nocheck
"use server";

import { createServerClient as createClient, createServiceRoleClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

// 履歴書フォーマット作成
export async function createResumeTemplate(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("認証が必要です");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("user_id", user.id)
        .single() as { data: { store_id: string; role: string } | null };

    if (!profile) {
        throw new Error("権限がありません");
    }

    if (!["admin", "staff"].includes(profile.role)) {
        throw new Error("権限がありません");
    }

    const name = formData.get("name") as string;
    const targetRole = formData.get("targetRole") as string || "cast";
    const visibleFieldsStr = formData.get("visibleFields") as string;
    const visibleFields = visibleFieldsStr ? JSON.parse(visibleFieldsStr) : undefined;

    const { data, error } = await supabase
        .from("resume_templates" as any)
        .insert({
            store_id: profile.store_id,
            name,
            target_role: targetRole,
            visible_fields: visibleFields,
            is_active: true,
        } as any)
        .select()
        .single();

    if (error) {
        console.error("Failed to create resume template:", error);
        throw new Error("作成に失敗しました");
    }

    revalidatePath("/app/resumes");
    return data;
}

// 履歴書フォーマット更新
export async function updateResumeTemplate(formData: FormData) {
    const supabase = await createClient();

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const isActive = formData.get("isActive") === "true";
    const targetRole = formData.get("targetRole") as string || "cast";
    const visibleFieldsStr = formData.get("visibleFields") as string;
    const visibleFields = visibleFieldsStr ? JSON.parse(visibleFieldsStr) : undefined;

    const { error } = await supabase
        .from("resume_templates" as any)
        .update({
            name,
            target_role: targetRole,
            visible_fields: visibleFields,
            is_active: isActive,
            updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id);

    if (error) {
        console.error("Failed to update resume template:", error);
        throw new Error("更新に失敗しました");
    }

    revalidatePath("/app/resumes");
}

// 履歴書フォーマット削除
export async function deleteResumeTemplate(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("resume_templates" as any)
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Failed to delete resume template:", error);
        throw new Error("削除に失敗しました");
    }

    revalidatePath("/app/resumes");
}

// カスタムフィールド追加
export async function addTemplateField(
    templateId: string,
    field: {
        field_type: string;
        label: string;
        options?: string[];
        is_required: boolean;
        sort_order: number;
    }
) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("resume_template_fields" as any)
        .insert({
            template_id: templateId,
            field_type: field.field_type,
            label: field.label,
            options: field.options ? field.options : null,
            is_required: field.is_required,
            sort_order: field.sort_order,
        } as any)
        .select()
        .single();

    if (error) {
        console.error("Failed to add template field:", error);
        throw new Error("項目の追加に失敗しました");
    }

    revalidatePath("/app/resumes");
    return data;
}

// カスタムフィールド更新
export async function updateTemplateField(
    fieldId: string,
    field: {
        field_type?: string;
        label?: string;
        options?: string[];
        is_required?: boolean;
        sort_order?: number;
    }
) {
    const supabase = await createClient();

    const updateData: any = {};
    if (field.field_type !== undefined) updateData.field_type = field.field_type;
    if (field.label !== undefined) updateData.label = field.label;
    if (field.options !== undefined) updateData.options = field.options;
    if (field.is_required !== undefined) updateData.is_required = field.is_required;
    if (field.sort_order !== undefined) updateData.sort_order = field.sort_order;

    const { error } = await supabase
        .from("resume_template_fields" as any)
        .update(updateData)
        .eq("id", fieldId);

    if (error) {
        console.error("Failed to update template field:", error);
        throw new Error("項目の更新に失敗しました");
    }

    revalidatePath("/app/resumes");
}

// カスタムフィールド削除
export async function deleteTemplateField(fieldId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("resume_template_fields" as any)
        .delete()
        .eq("id", fieldId);

    if (error) {
        console.error("Failed to delete template field:", error);
        throw new Error("項目の削除に失敗しました");
    }

    revalidatePath("/app/resumes");
}

// カスタムフィールドの順番更新
export async function updateFieldsOrder(
    fieldOrders: { id: string; sort_order: number }[]
) {
    const supabase = await createClient();

    for (const field of fieldOrders) {
        const { error } = await supabase
            .from("resume_template_fields" as any)
            .update({ sort_order: field.sort_order } as any)
            .eq("id", field.id);

        if (error) {
            console.error("Failed to update field order:", error);
            throw new Error("順番の更新に失敗しました");
        }
    }

    revalidatePath("/app/resumes");
}

// 公開URL用のトークン生成
export async function generateSubmissionToken(templateId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("認証が必要です");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile) throw new Error("プロフィールが見つかりません");

    const token = nanoid(16);

    const { data, error } = await supabase
        .from("resume_submissions" as any)
        .insert({
            store_id: profile.store_id,
            template_id: templateId,
            token,
            status: "draft",
        } as any)
        .select()
        .single();

    if (error) {
        console.error("Failed to generate token:", error);
        throw new Error("トークンの生成に失敗しました");
    }

    return data;
}

// 履歴書詳細取得（過去在籍店、カスタム回答含む）
export async function getSubmissionDetails(submissionId: string) {
    const supabase = await createClient();

    // Get past employments
    const { data: pastEmployments, error: empError } = await supabase
        .from("past_employments" as any)
        .select("*")
        .eq("submission_id", submissionId)
        .order("start_date", { ascending: false });

    if (empError) {
        console.error("Failed to fetch past employments:", empError);
    }

    // Get custom answers
    const { data: customAnswers, error: answerError } = await supabase
        .from("resume_submission_answers" as any)
        .select(`
            *,
            resume_template_fields (
                label,
                field_type
            )
        `)
        .eq("submission_id", submissionId);

    if (answerError) {
        console.error("Failed to fetch custom answers:", answerError);
    }

    return {
        pastEmployments: pastEmployments || [],
        customAnswers: customAnswers || [],
    };
}

// 名前重複チェック（かなで判断）
export async function checkDisplayNameDuplicate(displayNameKana: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("認証が必要です");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile) throw new Error("プロフィールが見つかりません");

    // Check for duplicate display_name_kana in the same store
    const { data: existingProfiles, error } = await supabase
        .from("profiles")
        .select("id, display_name, display_name_kana")
        .eq("store_id", (profile as any).store_id)
        .ilike("display_name_kana", displayNameKana);

    if (error) {
        console.error("Failed to check duplicate:", error);
        return { isDuplicate: false, existingNames: [] };
    }

    return {
        isDuplicate: existingProfiles && existingProfiles.length > 0,
        existingNames: (existingProfiles || []).map((p: any) => p.display_name),
    };
}

// 採用処理（profile作成と紐付け）
export async function hireApplicant(
    submissionId: string,
    hireType: "trial" | "full" = "full",
    customDisplayName?: string,
    customDisplayNameKana?: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("認証が必要です");

    // Get current user's profile for store_id
    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("user_id", user.id)
        .single();

    if (!currentProfile) {
        throw new Error("権限がありません");
    }

    if (!["admin", "staff"].includes((currentProfile as any).role)) {
        throw new Error("権限がありません");
    }

    // Get submission data
    const { data: submission, error: subError } = await supabase
        .from("resume_submissions" as any)
        .select("*")
        .eq("id", submissionId)
        .single();

    if (subError || !submission) {
        throw new Error("履歴書が見つかりません");
    }

    if (submission.profile_id) {
        throw new Error("既に採用済みです");
    }

    // Create new profile from submission data
    const { data: newProfile, error: profileError } = await supabase
        .from("profiles" as any)
        .insert({
            store_id: submission.store_id,
            role: "cast",
            last_name: submission.last_name,
            first_name: submission.first_name,
            last_name_kana: submission.last_name_kana,
            first_name_kana: submission.first_name_kana,
            real_name: submission.last_name && submission.first_name
                ? `${submission.last_name} ${submission.first_name}`
                : null,
            real_name_kana: submission.last_name_kana && submission.first_name_kana
                ? `${submission.last_name_kana} ${submission.first_name_kana}`
                : null,
            display_name: customDisplayName !== undefined ? customDisplayName : (submission.desired_cast_name || null),
            display_name_kana: customDisplayNameKana !== undefined ? customDisplayNameKana : (submission.desired_cast_name_kana || null),
            birth_date: submission.birth_date,
            phone_number: submission.phone_number,
            emergency_phone_number: submission.emergency_phone_number,
            zip_code: submission.zip_code,
            prefecture: submission.prefecture,
            city: submission.city,
            street: submission.street,
            building: submission.building,
            desired_cast_name: submission.desired_cast_name,
            status: hireType === "trial" ? "体入" : "在籍中",
        } as any)
        .select()
        .single();

    if (profileError) {
        console.error("Failed to create profile:", JSON.stringify(profileError, null, 2));
        throw new Error(`プロフィール作成に失敗しました: ${profileError.message || profileError.code}`);
    }

    // Update submission with profile_id
    const { error: updateError } = await supabase
        .from("resume_submissions" as any)
        .update({
            profile_id: (newProfile as any).id,
        } as any)
        .eq("id", submissionId);

    if (updateError) {
        console.error("Failed to update submission:", updateError);
    }

    // Move past employments to profile
    const { data: pastEmployments } = await supabase
        .from("past_employments" as any)
        .select("*")
        .eq("submission_id", submissionId);

    if (pastEmployments && pastEmployments.length > 0) {
        // Update past_employments to link to profile
        for (const emp of pastEmployments as any[]) {
            await supabase
                .from("past_employments" as any)
                .update({ profile_id: (newProfile as any).id } as any)
                .eq("id", emp.id);
        }
    }

    revalidatePath("/app/resumes");
    revalidatePath("/app/users");

    return newProfile;
}

// 不採用処理
export async function rejectApplicant(submissionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("認証が必要です");

    // Get current user's profile for permission check
    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("user_id", user.id)
        .single();

    if (!currentProfile) {
        throw new Error("権限がありません");
    }

    if (!["admin", "staff"].includes((currentProfile as any).role)) {
        throw new Error("権限がありません");
    }

    // Use service role client to bypass RLS (permission already checked above)
    const adminClient = createServiceRoleClient();

    // Update submission status to rejected (with store_id check)
    const { error } = await adminClient
        .from("resume_submissions" as any)
        .update({
            status: "rejected",
        } as any)
        .eq("id", submissionId)
        .eq("store_id", (currentProfile as any).store_id);

    if (error) {
        console.error("Failed to reject applicant:", JSON.stringify(error, null, 2));
        throw new Error(`不採用処理に失敗しました: ${error.message || error.code}`);
    }

    revalidatePath("/app/resumes");
}

// 採否前に戻す処理
export async function revertSubmissionStatus(submissionId: string, deleteProfile: boolean = false) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("認証が必要です");

    // Get current user's profile for permission check
    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("user_id", user.id)
        .single();

    if (!currentProfile) {
        throw new Error("権限がありません");
    }

    if (!["admin", "staff"].includes((currentProfile as any).role)) {
        throw new Error("権限がありません");
    }

    // Get submission data
    const adminClient = createServiceRoleClient();
    const { data: submission, error: subError } = await adminClient
        .from("resume_submissions" as any)
        .select("*")
        .eq("id", submissionId)
        .eq("store_id", (currentProfile as any).store_id)
        .single();

    if (subError || !submission) {
        throw new Error("履歴書が見つかりません");
    }

    // If there's a linked profile and we should delete it
    if (submission.profile_id && deleteProfile) {
        // Delete the linked profile
        const { error: profileDeleteError } = await adminClient
            .from("profiles" as any)
            .delete()
            .eq("id", submission.profile_id);

        if (profileDeleteError) {
            console.error("Failed to delete profile:", profileDeleteError);
            throw new Error("プロフィールの削除に失敗しました");
        }
    }

    // Update submission status back to submitted and clear profile_id
    const { error } = await adminClient
        .from("resume_submissions" as any)
        .update({
            status: "submitted",
            profile_id: null,
        } as any)
        .eq("id", submissionId)
        .eq("store_id", (currentProfile as any).store_id);

    if (error) {
        console.error("Failed to revert submission status:", error);
        throw new Error("採否前に戻す処理に失敗しました");
    }

    revalidatePath("/app/resumes");
    revalidatePath("/app/users");
}

// 履歴書削除
export async function deleteSubmission(submissionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("認証が必要です");

    // Get current user's profile for permission check
    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("user_id", user.id)
        .single();

    if (!currentProfile) {
        throw new Error("権限がありません");
    }

    if (!["admin", "staff"].includes((currentProfile as any).role)) {
        throw new Error("権限がありません");
    }

    // Use service role client to bypass RLS (permission already checked above)
    const adminClient = createServiceRoleClient();

    const { error } = await adminClient
        .from("resume_submissions" as any)
        .delete()
        .eq("id", submissionId)
        .eq("store_id", (currentProfile as any).store_id);

    if (error) {
        console.error("Failed to delete submission:", error);
        throw new Error("削除に失敗しました");
    }

    revalidatePath("/app/resumes");
}

// 履歴書コメント取得
export async function getSubmissionComments(submissionId: string) {
    const supabase = await createClient();

    const { data: comments, error } = await supabase
        .from("comments")
        .select(`
            *,
            author:profiles!comments_author_profile_id_fkey (
                id,
                display_name,
                avatar_url
            )
        `)
        .eq("target_submission_id", submissionId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Failed to fetch submission comments:", error);
        return [];
    }

    // Get like counts and user's likes
    const { data: { user } } = await supabase.auth.getUser();
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user?.id || "")
        .maybeSingle();

    const currentProfileId = appUser?.current_profile_id;

    const commentsWithLikes = await Promise.all(
        (comments || []).map(async (comment: any) => {
            const { count } = await supabase
                .from("comment_likes")
                .select("*", { count: "exact", head: true })
                .eq("comment_id", comment.id);

            let userHasLiked = false;
            if (currentProfileId) {
                const { data: like } = await supabase
                    .from("comment_likes")
                    .select("id")
                    .eq("comment_id", comment.id)
                    .eq("profile_id", currentProfileId)
                    .maybeSingle();
                userHasLiked = !!like;
            }

            return {
                ...comment,
                like_count: count || 0,
                user_has_liked: userHasLiked,
            };
        })
    );

    return commentsWithLikes;
}

// 履歴書コメント追加
export async function addSubmissionComment(submissionId: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("認証が必要です");

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) throw new Error("プロフィールが見つかりません");

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) throw new Error("店舗が見つかりません");

    const { error } = await supabase
        .from("comments")
        .insert({
            store_id: currentProfile.store_id,
            target_submission_id: submissionId,
            author_profile_id: appUser.current_profile_id,
            content: content,
        });

    if (error) {
        console.error("Failed to add submission comment:", error);
        throw new Error("コメントの追加に失敗しました");
    }

    revalidatePath("/app/resumes");
    return { success: true };
}

// 履歴書コメント更新
export async function updateSubmissionComment(commentId: string, content: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("comments")
        .update({ content })
        .eq("id", commentId);

    if (error) {
        console.error("Failed to update submission comment:", error);
        throw new Error("コメントの更新に失敗しました");
    }

    revalidatePath("/app/resumes");
    return { success: true };
}

// 履歴書コメント削除
export async function deleteSubmissionComment(commentId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

    if (error) {
        console.error("Failed to delete submission comment:", error);
        throw new Error("コメントの削除に失敗しました");
    }

    revalidatePath("/app/resumes");
    return { success: true };
}

// 履歴書コメントいいね切り替え
export async function toggleSubmissionCommentLike(commentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("認証が必要です");

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) throw new Error("プロフィールが見つかりません");

    // Check if already liked
    const { data: existingLike } = await supabase
        .from("comment_likes")
        .select("id")
        .eq("comment_id", commentId)
        .eq("profile_id", appUser.current_profile_id)
        .maybeSingle();

    if (existingLike) {
        // Unlike
        await supabase
            .from("comment_likes")
            .delete()
            .eq("id", existingLike.id);
    } else {
        // Like
        await supabase
            .from("comment_likes")
            .insert({
                comment_id: commentId,
                profile_id: appUser.current_profile_id,
            });
    }

    return { success: true };
}

// 現在のユーザーのプロフィール情報を取得
export async function getCurrentProfileInfo(): Promise<{ profileId: string | null; role: string | null }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { profileId: null, role: null };

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) return { profileId: null, role: null };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    return {
        profileId: appUser.current_profile_id,
        role: profile?.role || null,
    };
}
