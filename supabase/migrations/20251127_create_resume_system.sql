-- Add extended fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS emergency_phone_number text,
ADD COLUMN IF NOT EXISTS nearest_station text,
ADD COLUMN IF NOT EXISTS height integer;

COMMENT ON COLUMN public.profiles.emergency_phone_number IS '緊急連絡先';
COMMENT ON COLUMN public.profiles.nearest_station IS '最寄り駅';
COMMENT ON COLUMN public.profiles.height IS '身長';

-- Create resumes table
CREATE TABLE IF NOT EXISTS public.resumes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL,
    desired_cast_name text,
    desired_hourly_wage integer,
    desired_shift_days text,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT resumes_pkey PRIMARY KEY (id),
    CONSTRAINT resumes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.resumes IS '履歴書';
COMMENT ON COLUMN public.resumes.desired_cast_name IS '希望キャスト名';
COMMENT ON COLUMN public.resumes.desired_hourly_wage IS '希望時給';
COMMENT ON COLUMN public.resumes.desired_shift_days IS '希望シフト（週◯回）';
COMMENT ON COLUMN public.resumes.remarks IS '備考';

-- Create past_employments table (linked to resumes)
-- Drop first to ensure correct schema
DROP TABLE IF EXISTS public.past_employments CASCADE;

CREATE TABLE public.past_employments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    resume_id uuid NOT NULL,
    store_name text NOT NULL,
    period text,
    hourly_wage integer,
    sales_amount integer,
    customer_count integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT past_employments_pkey PRIMARY KEY (id),
    CONSTRAINT past_employments_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.past_employments IS '過去在籍店情報';

-- Create resume_questions table
CREATE TABLE IF NOT EXISTS public.resume_questions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL,
    content text NOT NULL,
    "order" integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT resume_questions_pkey PRIMARY KEY (id),
    CONSTRAINT resume_questions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.resume_questions IS '履歴書質問事項';

-- Create resume_answers table
CREATE TABLE IF NOT EXISTS public.resume_answers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    resume_id uuid NOT NULL,
    question_id uuid NOT NULL,
    answer text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT resume_answers_pkey PRIMARY KEY (id),
    CONSTRAINT resume_answers_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE,
    CONSTRAINT resume_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.resume_questions(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.resume_answers IS '履歴書回答';

-- RLS Policies

-- Resumes
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own resumes" ON public.resumes
    FOR SELECT
    USING (
        profile_id IN (
            SELECT current_profile_id FROM public.users WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT current_profile_id FROM public.users WHERE id = auth.uid())
            AND store_id = (SELECT store_id FROM public.profiles WHERE id = resumes.profile_id)
            AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Users can insert their own resumes" ON public.resumes
    FOR INSERT
    WITH CHECK (
        profile_id IN (
            SELECT current_profile_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own resumes" ON public.resumes
    FOR UPDATE
    USING (
        profile_id IN (
            SELECT current_profile_id FROM public.users WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT current_profile_id FROM public.users WHERE id = auth.uid())
            AND store_id = (SELECT store_id FROM public.profiles WHERE id = resumes.profile_id)
            AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Users can delete their own resumes" ON public.resumes
    FOR DELETE
    USING (
        profile_id IN (
            SELECT current_profile_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Past Employments
ALTER TABLE public.past_employments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own past employments" ON public.past_employments;
CREATE POLICY "Users can view their own past employments" ON public.past_employments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.resumes
            WHERE id = past_employments.resume_id
            AND (
                profile_id IN (
                    SELECT current_profile_id FROM public.users WHERE id = auth.uid()
                )
                OR
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = (SELECT current_profile_id FROM public.users WHERE id = auth.uid())
                    AND store_id = (SELECT store_id FROM public.profiles WHERE id = resumes.profile_id)
                    AND role IN ('admin', 'staff')
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can manage their own past employments" ON public.past_employments;
CREATE POLICY "Users can manage their own past employments" ON public.past_employments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.resumes
            WHERE id = past_employments.resume_id
            AND profile_id IN (
                SELECT current_profile_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

-- Resume Questions
ALTER TABLE public.resume_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resume questions are viewable by store members" ON public.resume_questions
    FOR SELECT
    USING (
        store_id IN (
            SELECT store_id FROM public.profiles
            WHERE id = (SELECT current_profile_id FROM public.users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Admins/Staff can manage resume questions" ON public.resume_questions
    FOR ALL
    USING (
        store_id IN (
            SELECT store_id FROM public.profiles
            WHERE id = (SELECT current_profile_id FROM public.users WHERE id = auth.uid())
            AND role IN ('admin', 'staff')
        )
    );

-- Resume Answers
ALTER TABLE public.resume_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own resume answers" ON public.resume_answers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.resumes
            WHERE id = resume_answers.resume_id
            AND (
                profile_id IN (
                    SELECT current_profile_id FROM public.users WHERE id = auth.uid()
                )
                OR
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = (SELECT current_profile_id FROM public.users WHERE id = auth.uid())
                    AND store_id = (SELECT store_id FROM public.profiles WHERE id = resumes.profile_id)
                    AND role IN ('admin', 'staff')
                )
            )
        )
    );

CREATE POLICY "Users can manage their own resume answers" ON public.resume_answers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.resumes
            WHERE id = resume_answers.resume_id
            AND profile_id IN (
                SELECT current_profile_id FROM public.users WHERE id = auth.uid()
            )
        )
    );
