-- タイムカードカスタム質問テーブル
CREATE TABLE IF NOT EXISTS public.timecard_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    label text NOT NULL,
    field_type text NOT NULL DEFAULT 'text', -- text, textarea, number, select, checkbox
    options jsonb DEFAULT NULL, -- select型の場合の選択肢
    is_required boolean NOT NULL DEFAULT false,
    target_role text NOT NULL DEFAULT 'both', -- cast, staff, both
    timing text NOT NULL DEFAULT 'clock_in', -- clock_in, clock_out, both
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- タイムカード質問回答テーブル
CREATE TABLE IF NOT EXISTS public.timecard_question_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    work_record_id uuid NOT NULL REFERENCES public.work_records(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES public.timecard_questions(id) ON DELETE CASCADE,
    value text,
    timing text NOT NULL, -- clock_in, clock_out (回答したタイミング)
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(work_record_id, question_id, timing)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_timecard_questions_store_id ON public.timecard_questions(store_id);
CREATE INDEX IF NOT EXISTS idx_timecard_questions_active ON public.timecard_questions(store_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_timecard_question_answers_work_record ON public.timecard_question_answers(work_record_id);
CREATE INDEX IF NOT EXISTS idx_timecard_question_answers_question ON public.timecard_question_answers(question_id);

-- RLS有効化
ALTER TABLE public.timecard_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timecard_question_answers ENABLE ROW LEVEL SECURITY;

-- timecard_questions RLSポリシー
CREATE POLICY "timecard_questions_select" ON public.timecard_questions
    FOR SELECT USING (
        store_id IN (
            SELECT store_id FROM public.profiles WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "timecard_questions_insert" ON public.timecard_questions
    FOR INSERT WITH CHECK (
        store_id IN (
            SELECT store_id FROM public.profiles
            WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "timecard_questions_update" ON public.timecard_questions
    FOR UPDATE USING (
        store_id IN (
            SELECT store_id FROM public.profiles
            WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "timecard_questions_delete" ON public.timecard_questions
    FOR DELETE USING (
        store_id IN (
            SELECT store_id FROM public.profiles
            WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'staff')
        )
    );

-- timecard_question_answers RLSポリシー
CREATE POLICY "timecard_question_answers_select" ON public.timecard_question_answers
    FOR SELECT USING (
        work_record_id IN (
            SELECT wr.id FROM public.work_records wr
            JOIN public.profiles p ON wr.profile_id = p.id
            WHERE p.store_id IN (
                SELECT store_id FROM public.profiles WHERE user_id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "timecard_question_answers_insert" ON public.timecard_question_answers
    FOR INSERT WITH CHECK (
        work_record_id IN (
            SELECT wr.id FROM public.work_records wr
            JOIN public.profiles p ON wr.profile_id = p.id
            WHERE p.store_id IN (
                SELECT store_id FROM public.profiles WHERE user_id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "timecard_question_answers_update" ON public.timecard_question_answers
    FOR UPDATE USING (
        work_record_id IN (
            SELECT wr.id FROM public.work_records wr
            JOIN public.profiles p ON wr.profile_id = p.id
            WHERE p.store_id IN (
                SELECT store_id FROM public.profiles WHERE user_id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "timecard_question_answers_delete" ON public.timecard_question_answers
    FOR DELETE USING (
        work_record_id IN (
            SELECT wr.id FROM public.work_records wr
            JOIN public.profiles p ON wr.profile_id = p.id
            WHERE p.store_id IN (
                SELECT store_id FROM public.profiles WHERE user_id = (SELECT auth.uid())
            )
        )
    );
