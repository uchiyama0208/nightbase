-- =============================================
-- 従業員ポイント機能
-- =============================================

-- 1. 店舗ポイント設定
CREATE TABLE store_point_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    expiration_type TEXT NOT NULL DEFAULT 'none',
    -- 'none': 無期限
    -- 'fiscal_year_end': 年度末リセット（4月1日）
    -- 'calendar_year_end': 12月末リセット
    -- 'from_earned': 獲得から指定期間
    expiration_months INTEGER,
    sales_calculation_type TEXT DEFAULT 'amount',
    -- 'amount': 金額ベース
    -- 'target': 目標達成ベース
    -- 'both': 両方
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id)
);

-- 2. ポイント獲得ルール
CREATE TABLE point_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    target_type TEXT NOT NULL,
    -- 'staff': スタッフのみ
    -- 'cast': キャストのみ
    -- 'all': 全員
    trigger_type TEXT NOT NULL,
    -- スタッフ向け:
    -- 'clock_in': 出勤時
    -- 'no_late': 遅刻なし
    -- 'consecutive_days': 連勤ボーナス
    -- キャスト向け:
    -- 'sales_amount': 一定の売上金額達成
    -- 'sales_target': 売上目標達成
    -- 'douhan_count': 同伴数
    -- 'shimei_count': 指名数
    -- 'jounai_count': 場内数
    conditions JSONB DEFAULT '{}',
    -- 例: {"min_amount": 100000} for sales_amount
    -- 例: {"consecutive_days": 5} for consecutive_days
    -- 例: {"min_count": 3} for douhan_count
    points INTEGER NOT NULL,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    repeat_type TEXT DEFAULT 'daily',
    -- 'once': 一度のみ
    -- 'daily': 毎日
    -- 'weekly': 毎週
    -- 'monthly': 毎月
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 交換報酬
CREATE TABLE point_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    points_required INTEGER NOT NULL,
    has_stock BOOLEAN DEFAULT false,
    stock_count INTEGER DEFAULT 0,
    target_type TEXT DEFAULT 'all',
    -- 'staff': スタッフのみ
    -- 'cast': キャストのみ
    -- 'all': 全員
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 交換申請
CREATE TABLE point_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES point_rewards(id) ON DELETE CASCADE,
    points_used INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    -- 'pending': 申請中
    -- 'approved': 承認済み
    -- 'rejected': 却下
    -- 'completed': 受け渡し完了
    -- 'cancelled': キャンセル
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ポイント履歴
CREATE TABLE point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    -- 'earned': 獲得（ルールにより）
    -- 'redeemed': 交換使用
    -- 'expired': 有効期限切れ
    -- 'adjusted': 管理者による調整
    -- 'cancelled': キャンセル
    rule_id UUID REFERENCES point_rules(id) ON DELETE SET NULL,
    redemption_id UUID REFERENCES point_redemptions(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'approved',
    -- 'pending': 承認待ち
    -- 'approved': 承認済み
    -- 'rejected': 却下
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- インデックス
-- =============================================

CREATE INDEX idx_point_rules_store ON point_rules(store_id);
CREATE INDEX idx_point_rewards_store ON point_rewards(store_id);
CREATE INDEX idx_point_redemptions_profile ON point_redemptions(profile_id);
CREATE INDEX idx_point_redemptions_store ON point_redemptions(store_id);
CREATE INDEX idx_point_redemptions_status ON point_redemptions(status) WHERE status IN ('pending', 'approved');
CREATE INDEX idx_point_transactions_profile ON point_transactions(profile_id);
CREATE INDEX idx_point_transactions_store ON point_transactions(store_id);
CREATE INDEX idx_point_transactions_status ON point_transactions(status) WHERE status = 'pending';
CREATE INDEX idx_point_transactions_expires ON point_transactions(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================
-- RLS ポリシー
-- =============================================

ALTER TABLE store_point_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- store_point_settings: 同じ店舗のメンバーが参照・更新可能
CREATE POLICY "store_point_settings_select" ON store_point_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = store_point_settings.store_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "store_point_settings_insert" ON store_point_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = store_point_settings.store_id
            AND p.user_id = auth.uid()
            AND p.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "store_point_settings_update" ON store_point_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = store_point_settings.store_id
            AND p.user_id = auth.uid()
            AND p.role IN ('admin', 'owner')
        )
    );

-- point_rules: 同じ店舗のメンバーが参照、管理者が編集可能
CREATE POLICY "point_rules_select" ON point_rules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = point_rules.store_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "point_rules_insert" ON point_rules
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = point_rules.store_id
            AND p.user_id = auth.uid()
            AND p.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "point_rules_update" ON point_rules
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = point_rules.store_id
            AND p.user_id = auth.uid()
            AND p.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "point_rules_delete" ON point_rules
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = point_rules.store_id
            AND p.user_id = auth.uid()
            AND p.role IN ('admin', 'owner')
        )
    );

-- point_rewards: 同じ店舗のメンバーが参照、管理者が編集可能
CREATE POLICY "point_rewards_select" ON point_rewards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = point_rewards.store_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "point_rewards_insert" ON point_rewards
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = point_rewards.store_id
            AND p.user_id = auth.uid()
            AND p.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "point_rewards_update" ON point_rewards
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = point_rewards.store_id
            AND p.user_id = auth.uid()
            AND p.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "point_rewards_delete" ON point_rewards
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = point_rewards.store_id
            AND p.user_id = auth.uid()
            AND p.role IN ('admin', 'owner')
        )
    );

-- point_redemptions: 自分の申請を参照・作成、管理者は全て参照・更新可能
CREATE POLICY "point_redemptions_select" ON point_redemptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = point_redemptions.store_id
            AND p.user_id = auth.uid()
            AND (p.id = point_redemptions.profile_id OR p.role IN ('admin', 'owner'))
        )
    );

CREATE POLICY "point_redemptions_insert" ON point_redemptions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = point_redemptions.store_id
            AND p.user_id = auth.uid()
            AND p.id = point_redemptions.profile_id
        )
    );

CREATE POLICY "point_redemptions_update" ON point_redemptions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = point_redemptions.store_id
            AND p.user_id = auth.uid()
            AND p.role IN ('admin', 'owner')
        )
    );

-- point_transactions: 自分の履歴を参照、管理者は全て参照・挿入可能
CREATE POLICY "point_transactions_select" ON point_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = point_transactions.store_id
            AND p.user_id = auth.uid()
            AND (p.id = point_transactions.profile_id OR p.role IN ('admin', 'owner'))
        )
    );

CREATE POLICY "point_transactions_insert" ON point_transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = point_transactions.store_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "point_transactions_update" ON point_transactions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.store_id = point_transactions.store_id
            AND p.user_id = auth.uid()
            AND p.role IN ('admin', 'owner')
        )
    );
