-- シフト管理機能のスキーマ

-- 1. storesテーブルにシフト関連カラムを追加
ALTER TABLE stores ADD COLUMN IF NOT EXISTS default_cast_start_time TIME DEFAULT '20:00';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS default_cast_end_time TIME DEFAULT '01:00';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS default_staff_start_time TIME DEFAULT '19:00';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS default_staff_end_time TIME DEFAULT '02:00';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS show_shifts BOOLEAN DEFAULT true;

-- 2. シフト募集テーブル
CREATE TABLE IF NOT EXISTS public.shift_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    deadline TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    target_roles TEXT[] DEFAULT '{cast,staff}',
    target_profile_ids UUID[],
    line_notification_sent BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.shift_requests IS 'シフト募集。1募集に複数の対象日付を含む';

-- 3. 募集対象日付テーブル
CREATE TABLE IF NOT EXISTS public.shift_request_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_request_id UUID NOT NULL REFERENCES shift_requests(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    default_start_time TIME,
    default_end_time TIME,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_request_date UNIQUE(shift_request_id, target_date)
);

COMMENT ON TABLE public.shift_request_dates IS 'シフト募集の対象日付リスト';

-- 4. 希望シフト提出テーブル（承認済み=確定シフト）
CREATE TABLE IF NOT EXISTS public.shift_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_request_id UUID NOT NULL REFERENCES shift_requests(id) ON DELETE CASCADE,
    shift_request_date_id UUID NOT NULL REFERENCES shift_request_dates(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    availability TEXT NOT NULL CHECK (availability IN ('available', 'unavailable')),
    preferred_start_time TIME,
    preferred_end_time TIME,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_start_time TIME,
    approved_end_time TIME,
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_submission UNIQUE(shift_request_date_id, profile_id)
);

COMMENT ON TABLE public.shift_submissions IS 'スタッフからの希望シフト提出。承認済み=確定シフト';

-- 5. シフト自動化設定テーブル
CREATE TABLE IF NOT EXISTS public.shift_automation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN DEFAULT false,
    target_roles TEXT[] DEFAULT '{cast,staff}',
    period_type TEXT CHECK (period_type IN ('week', 'half_month', 'month')),
    send_day_offset INTEGER DEFAULT 7,
    send_hour INTEGER DEFAULT 10,
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_day_offset INTEGER DEFAULT 1,
    reminder_hour INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.shift_automation_settings IS 'シフト募集の自動化設定';

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_shift_requests_store_id ON shift_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_shift_requests_status ON shift_requests(status);
CREATE INDEX IF NOT EXISTS idx_shift_requests_deadline ON shift_requests(deadline);
CREATE INDEX IF NOT EXISTS idx_shift_request_dates_request_id ON shift_request_dates(shift_request_id);
CREATE INDEX IF NOT EXISTS idx_shift_request_dates_target_date ON shift_request_dates(target_date);
CREATE INDEX IF NOT EXISTS idx_shift_submissions_request_id ON shift_submissions(shift_request_id);
CREATE INDEX IF NOT EXISTS idx_shift_submissions_date_id ON shift_submissions(shift_request_date_id);
CREATE INDEX IF NOT EXISTS idx_shift_submissions_profile_id ON shift_submissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_shift_submissions_status ON shift_submissions(status);

-- RLSを有効化
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_request_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_automation_settings ENABLE ROW LEVEL SECURITY;

-- shift_requests RLSポリシー
CREATE POLICY "shift_requests_select" ON shift_requests
    FOR SELECT USING (
        store_id IN (
            SELECT store_id FROM profiles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "shift_requests_insert" ON shift_requests
    FOR INSERT WITH CHECK (
        store_id IN (
            SELECT store_id FROM profiles
            WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "shift_requests_update" ON shift_requests
    FOR UPDATE USING (
        store_id IN (
            SELECT store_id FROM profiles
            WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "shift_requests_delete" ON shift_requests
    FOR DELETE USING (
        store_id IN (
            SELECT store_id FROM profiles
            WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- shift_request_dates RLSポリシー
CREATE POLICY "shift_request_dates_select" ON shift_request_dates
    FOR SELECT USING (
        shift_request_id IN (
            SELECT id FROM shift_requests sr
            WHERE sr.store_id IN (
                SELECT store_id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "shift_request_dates_insert" ON shift_request_dates
    FOR INSERT WITH CHECK (
        shift_request_id IN (
            SELECT id FROM shift_requests sr
            WHERE sr.store_id IN (
                SELECT store_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
            )
        )
    );

CREATE POLICY "shift_request_dates_update" ON shift_request_dates
    FOR UPDATE USING (
        shift_request_id IN (
            SELECT id FROM shift_requests sr
            WHERE sr.store_id IN (
                SELECT store_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
            )
        )
    );

CREATE POLICY "shift_request_dates_delete" ON shift_request_dates
    FOR DELETE USING (
        shift_request_id IN (
            SELECT id FROM shift_requests sr
            WHERE sr.store_id IN (
                SELECT store_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
            )
        )
    );

-- shift_submissions RLSポリシー
CREATE POLICY "shift_submissions_select" ON shift_submissions
    FOR SELECT USING (
        -- 自分の提出は見れる
        profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
        OR
        -- admin/staffは店舗の全提出を見れる
        shift_request_id IN (
            SELECT id FROM shift_requests sr
            WHERE sr.store_id IN (
                SELECT store_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
            )
        )
    );

CREATE POLICY "shift_submissions_insert" ON shift_submissions
    FOR INSERT WITH CHECK (
        -- 自分のプロフィールで提出
        profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "shift_submissions_update" ON shift_submissions
    FOR UPDATE USING (
        -- 自分の提出を更新
        profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
        OR
        -- admin/staffは承認のために更新可能
        shift_request_id IN (
            SELECT id FROM shift_requests sr
            WHERE sr.store_id IN (
                SELECT store_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
            )
        )
    );

CREATE POLICY "shift_submissions_delete" ON shift_submissions
    FOR DELETE USING (
        -- 自分の提出を削除
        profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
        OR
        -- admin/staffは削除可能
        shift_request_id IN (
            SELECT id FROM shift_requests sr
            WHERE sr.store_id IN (
                SELECT store_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
            )
        )
    );

-- shift_automation_settings RLSポリシー
CREATE POLICY "shift_automation_settings_select" ON shift_automation_settings
    FOR SELECT USING (
        store_id IN (
            SELECT store_id FROM profiles
            WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "shift_automation_settings_insert" ON shift_automation_settings
    FOR INSERT WITH CHECK (
        store_id IN (
            SELECT store_id FROM profiles
            WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "shift_automation_settings_update" ON shift_automation_settings
    FOR UPDATE USING (
        store_id IN (
            SELECT store_id FROM profiles
            WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "shift_automation_settings_delete" ON shift_automation_settings
    FOR DELETE USING (
        store_id IN (
            SELECT store_id FROM profiles
            WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
    );
