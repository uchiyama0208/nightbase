-- メニューオプション機能
-- 店舗独自のオプションを作成し、複数メニューで共有可能

-- ============================================
-- 1. menu_options テーブル（店舗のオプション定義）
-- ============================================
CREATE TABLE menu_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,  -- 例: "濃さ", "割り方", "サイズ"
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_options_store_id ON menu_options(store_id);

-- ============================================
-- 2. menu_option_choices テーブル（オプションの選択肢）
-- ============================================
CREATE TABLE menu_option_choices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID NOT NULL REFERENCES menu_options(id) ON DELETE CASCADE,
    name TEXT NOT NULL,  -- 例: "薄め", "普通", "濃いめ"
    additional_price INTEGER NOT NULL DEFAULT 0,  -- 追加料金
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_option_choices_option_id ON menu_option_choices(option_id);

-- ============================================
-- 3. menu_option_links テーブル（メニューとオプションの紐付け）
-- ============================================
CREATE TABLE menu_option_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES menu_options(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(menu_id, option_id)
);

CREATE INDEX idx_menu_option_links_menu_id ON menu_option_links(menu_id);
CREATE INDEX idx_menu_option_links_option_id ON menu_option_links(option_id);

-- ============================================
-- 4. order_option_selections テーブル（注文時のオプション選択記録）
-- ============================================
CREATE TABLE order_option_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES menu_options(id) ON DELETE RESTRICT,
    choice_id UUID NOT NULL REFERENCES menu_option_choices(id) ON DELETE RESTRICT,
    choice_name TEXT NOT NULL,  -- 選択時の名前をスナップショット
    additional_price INTEGER NOT NULL DEFAULT 0,  -- 選択時の追加料金をスナップショット
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(order_id, option_id)  -- 1注文につき1オプション1選択
);

CREATE INDEX idx_order_option_selections_order_id ON order_option_selections(order_id);

-- ============================================
-- 5. RLS ポリシー
-- ============================================

-- menu_options
ALTER TABLE menu_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_options_select" ON menu_options
    FOR SELECT USING (
        store_id IN (
            SELECT store_id FROM profiles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "menu_options_insert" ON menu_options
    FOR INSERT WITH CHECK (
        store_id IN (
            SELECT store_id FROM profiles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "menu_options_update" ON menu_options
    FOR UPDATE USING (
        store_id IN (
            SELECT store_id FROM profiles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "menu_options_delete" ON menu_options
    FOR DELETE USING (
        store_id IN (
            SELECT store_id FROM profiles
            WHERE user_id = auth.uid()
        )
    );

-- menu_option_choices
ALTER TABLE menu_option_choices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_option_choices_select" ON menu_option_choices
    FOR SELECT USING (
        option_id IN (
            SELECT id FROM menu_options
            WHERE store_id IN (
                SELECT store_id FROM profiles
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "menu_option_choices_insert" ON menu_option_choices
    FOR INSERT WITH CHECK (
        option_id IN (
            SELECT id FROM menu_options
            WHERE store_id IN (
                SELECT store_id FROM profiles
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "menu_option_choices_update" ON menu_option_choices
    FOR UPDATE USING (
        option_id IN (
            SELECT id FROM menu_options
            WHERE store_id IN (
                SELECT store_id FROM profiles
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "menu_option_choices_delete" ON menu_option_choices
    FOR DELETE USING (
        option_id IN (
            SELECT id FROM menu_options
            WHERE store_id IN (
                SELECT store_id FROM profiles
                WHERE user_id = auth.uid()
            )
        )
    );

-- menu_option_links
ALTER TABLE menu_option_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_option_links_select" ON menu_option_links
    FOR SELECT USING (
        menu_id IN (
            SELECT id FROM menus
            WHERE store_id IN (
                SELECT store_id FROM profiles
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "menu_option_links_insert" ON menu_option_links
    FOR INSERT WITH CHECK (
        menu_id IN (
            SELECT id FROM menus
            WHERE store_id IN (
                SELECT store_id FROM profiles
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "menu_option_links_update" ON menu_option_links
    FOR UPDATE USING (
        menu_id IN (
            SELECT id FROM menus
            WHERE store_id IN (
                SELECT store_id FROM profiles
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "menu_option_links_delete" ON menu_option_links
    FOR DELETE USING (
        menu_id IN (
            SELECT id FROM menus
            WHERE store_id IN (
                SELECT store_id FROM profiles
                WHERE user_id = auth.uid()
            )
        )
    );

-- order_option_selections
ALTER TABLE order_option_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_option_selections_select" ON order_option_selections
    FOR SELECT USING (
        order_id IN (
            SELECT o.id FROM orders o
            JOIN table_sessions ts ON o.table_session_id = ts.id
            WHERE ts.store_id IN (
                SELECT store_id FROM profiles
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "order_option_selections_insert" ON order_option_selections
    FOR INSERT WITH CHECK (
        order_id IN (
            SELECT o.id FROM orders o
            JOIN table_sessions ts ON o.table_session_id = ts.id
            WHERE ts.store_id IN (
                SELECT store_id FROM profiles
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "order_option_selections_update" ON order_option_selections
    FOR UPDATE USING (
        order_id IN (
            SELECT o.id FROM orders o
            JOIN table_sessions ts ON o.table_session_id = ts.id
            WHERE ts.store_id IN (
                SELECT store_id FROM profiles
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "order_option_selections_delete" ON order_option_selections
    FOR DELETE USING (
        order_id IN (
            SELECT o.id FROM orders o
            JOIN table_sessions ts ON o.table_session_id = ts.id
            WHERE ts.store_id IN (
                SELECT store_id FROM profiles
                WHERE user_id = auth.uid()
            )
        )
    );
