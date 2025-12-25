-- Fix RLS policies to use (select auth.uid()) instead of auth.uid() for better performance
-- This prevents re-evaluation of auth functions for each row

-- ============================================
-- photo_nomination_selections
-- ============================================
DROP POLICY IF EXISTS "photo_nomination_selections_select" ON photo_nomination_selections;
DROP POLICY IF EXISTS "photo_nomination_selections_insert" ON photo_nomination_selections;
DROP POLICY IF EXISTS "photo_nomination_selections_delete" ON photo_nomination_selections;

CREATE POLICY "photo_nomination_selections_select" ON photo_nomination_selections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = photo_nomination_selections.store_id
        )
    );

CREATE POLICY "photo_nomination_selections_insert" ON photo_nomination_selections
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = photo_nomination_selections.store_id
        )
    );

CREATE POLICY "photo_nomination_selections_delete" ON photo_nomination_selections
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = photo_nomination_selections.store_id
        )
    );

-- ============================================
-- menu_options
-- ============================================
DROP POLICY IF EXISTS "menu_options_select" ON menu_options;
DROP POLICY IF EXISTS "menu_options_insert" ON menu_options;
DROP POLICY IF EXISTS "menu_options_update" ON menu_options;
DROP POLICY IF EXISTS "menu_options_delete" ON menu_options;

CREATE POLICY "menu_options_select" ON menu_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = menu_options.store_id
        )
    );

CREATE POLICY "menu_options_insert" ON menu_options
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = menu_options.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

CREATE POLICY "menu_options_update" ON menu_options
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = menu_options.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

CREATE POLICY "menu_options_delete" ON menu_options
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = menu_options.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

-- ============================================
-- menu_option_choices
-- ============================================
DROP POLICY IF EXISTS "menu_option_choices_select" ON menu_option_choices;
DROP POLICY IF EXISTS "menu_option_choices_insert" ON menu_option_choices;
DROP POLICY IF EXISTS "menu_option_choices_update" ON menu_option_choices;
DROP POLICY IF EXISTS "menu_option_choices_delete" ON menu_option_choices;

CREATE POLICY "menu_option_choices_select" ON menu_option_choices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM menu_options mo
            JOIN profiles p ON p.store_id = mo.store_id
            WHERE mo.id = menu_option_choices.option_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "menu_option_choices_insert" ON menu_option_choices
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM menu_options mo
            JOIN profiles p ON p.store_id = mo.store_id
            WHERE mo.id = menu_option_choices.option_id
            AND p.user_id = (select auth.uid())
            AND p.role IN ('admin', 'staff')
        )
    );

CREATE POLICY "menu_option_choices_update" ON menu_option_choices
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM menu_options mo
            JOIN profiles p ON p.store_id = mo.store_id
            WHERE mo.id = menu_option_choices.option_id
            AND p.user_id = (select auth.uid())
            AND p.role IN ('admin', 'staff')
        )
    );

CREATE POLICY "menu_option_choices_delete" ON menu_option_choices
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM menu_options mo
            JOIN profiles p ON p.store_id = mo.store_id
            WHERE mo.id = menu_option_choices.option_id
            AND p.user_id = (select auth.uid())
            AND p.role IN ('admin', 'staff')
        )
    );

-- ============================================
-- menu_option_links
-- ============================================
DROP POLICY IF EXISTS "menu_option_links_select" ON menu_option_links;
DROP POLICY IF EXISTS "menu_option_links_insert" ON menu_option_links;
DROP POLICY IF EXISTS "menu_option_links_update" ON menu_option_links;
DROP POLICY IF EXISTS "menu_option_links_delete" ON menu_option_links;

CREATE POLICY "menu_option_links_select" ON menu_option_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM menus m
            JOIN profiles p ON p.store_id = m.store_id
            WHERE m.id = menu_option_links.menu_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "menu_option_links_insert" ON menu_option_links
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM menus m
            JOIN profiles p ON p.store_id = m.store_id
            WHERE m.id = menu_option_links.menu_id
            AND p.user_id = (select auth.uid())
            AND p.role IN ('admin', 'staff')
        )
    );

CREATE POLICY "menu_option_links_update" ON menu_option_links
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM menus m
            JOIN profiles p ON p.store_id = m.store_id
            WHERE m.id = menu_option_links.menu_id
            AND p.user_id = (select auth.uid())
            AND p.role IN ('admin', 'staff')
        )
    );

CREATE POLICY "menu_option_links_delete" ON menu_option_links
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM menus m
            JOIN profiles p ON p.store_id = m.store_id
            WHERE m.id = menu_option_links.menu_id
            AND p.user_id = (select auth.uid())
            AND p.role IN ('admin', 'staff')
        )
    );

-- ============================================
-- order_option_selections
-- ============================================
DROP POLICY IF EXISTS "order_option_selections_select" ON order_option_selections;
DROP POLICY IF EXISTS "order_option_selections_insert" ON order_option_selections;
DROP POLICY IF EXISTS "order_option_selections_update" ON order_option_selections;
DROP POLICY IF EXISTS "order_option_selections_delete" ON order_option_selections;

CREATE POLICY "order_option_selections_select" ON order_option_selections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN profiles p ON p.store_id = o.store_id
            WHERE o.id = order_option_selections.order_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "order_option_selections_insert" ON order_option_selections
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN profiles p ON p.store_id = o.store_id
            WHERE o.id = order_option_selections.order_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "order_option_selections_update" ON order_option_selections
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN profiles p ON p.store_id = o.store_id
            WHERE o.id = order_option_selections.order_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "order_option_selections_delete" ON order_option_selections
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN profiles p ON p.store_id = o.store_id
            WHERE o.id = order_option_selections.order_id
            AND p.user_id = (select auth.uid())
        )
    );

-- ============================================
-- join_requests - Consolidate multiple permissive policies
-- ============================================
DROP POLICY IF EXISTS "Users can create own join requests" ON join_requests;
DROP POLICY IF EXISTS "Users can view own join requests" ON join_requests;
DROP POLICY IF EXISTS "Store staff can view join requests" ON join_requests;
DROP POLICY IF EXISTS "Store staff can update join requests" ON join_requests;
DROP POLICY IF EXISTS "Store staff can delete join requests" ON join_requests;

CREATE POLICY "join_requests_insert" ON join_requests
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "join_requests_select" ON join_requests
    FOR SELECT USING (
        user_id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = join_requests.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

CREATE POLICY "join_requests_update" ON join_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = join_requests.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

CREATE POLICY "join_requests_delete" ON join_requests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = join_requests.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

-- ============================================
-- ai_generated_images - Consolidate and fix
-- ============================================
DROP POLICY IF EXISTS "ai_generated_images_select_policy" ON ai_generated_images;
DROP POLICY IF EXISTS "ai_generated_images_insert_policy" ON ai_generated_images;
DROP POLICY IF EXISTS "ai_generated_images_delete_policy" ON ai_generated_images;
DROP POLICY IF EXISTS "Staff can view store images" ON ai_generated_images;
DROP POLICY IF EXISTS "Staff can create images" ON ai_generated_images;
DROP POLICY IF EXISTS "Staff can delete own store images" ON ai_generated_images;

CREATE POLICY "ai_generated_images_select" ON ai_generated_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = ai_generated_images.store_id
        )
    );

CREATE POLICY "ai_generated_images_insert" ON ai_generated_images
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = ai_generated_images.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

CREATE POLICY "ai_generated_images_delete" ON ai_generated_images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = ai_generated_images.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

-- ============================================
-- store_settings
-- ============================================
DROP POLICY IF EXISTS "store_settings_select" ON store_settings;
DROP POLICY IF EXISTS "store_settings_insert" ON store_settings;
DROP POLICY IF EXISTS "store_settings_update" ON store_settings;
DROP POLICY IF EXISTS "store_settings_delete" ON store_settings;

CREATE POLICY "store_settings_select" ON store_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = store_settings.store_id
        )
    );

CREATE POLICY "store_settings_insert" ON store_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = store_settings.store_id
            AND p.role = 'admin'
        )
    );

CREATE POLICY "store_settings_update" ON store_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = store_settings.store_id
            AND p.role = 'admin'
        )
    );

CREATE POLICY "store_settings_delete" ON store_settings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = store_settings.store_id
            AND p.role = 'admin'
        )
    );

-- ============================================
-- push_subscriptions
-- ============================================
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON push_subscriptions;

CREATE POLICY "push_subscriptions_select" ON push_subscriptions
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "push_subscriptions_insert" ON push_subscriptions
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "push_subscriptions_delete" ON push_subscriptions
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- push_notification_settings
-- ============================================
DROP POLICY IF EXISTS "Users can view own notification settings" ON push_notification_settings;
DROP POLICY IF EXISTS "Users can insert own notification settings" ON push_notification_settings;
DROP POLICY IF EXISTS "Users can update own notification settings" ON push_notification_settings;

CREATE POLICY "push_notification_settings_select" ON push_notification_settings
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "push_notification_settings_insert" ON push_notification_settings
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "push_notification_settings_update" ON push_notification_settings
    FOR UPDATE USING (user_id = (select auth.uid()));

-- ============================================
-- line_notification_settings
-- ============================================
DROP POLICY IF EXISTS "Users can view own line notification settings" ON line_notification_settings;
DROP POLICY IF EXISTS "Users can insert own line notification settings" ON line_notification_settings;
DROP POLICY IF EXISTS "Users can update own line notification settings" ON line_notification_settings;

CREATE POLICY "line_notification_settings_select" ON line_notification_settings
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "line_notification_settings_insert" ON line_notification_settings
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "line_notification_settings_update" ON line_notification_settings
    FOR UPDATE USING (user_id = (select auth.uid()));

-- ============================================
-- store_point_settings
-- ============================================
DROP POLICY IF EXISTS "store_point_settings_select" ON store_point_settings;
DROP POLICY IF EXISTS "store_point_settings_insert" ON store_point_settings;
DROP POLICY IF EXISTS "store_point_settings_update" ON store_point_settings;

CREATE POLICY "store_point_settings_select" ON store_point_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = store_point_settings.store_id
        )
    );

CREATE POLICY "store_point_settings_insert" ON store_point_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = store_point_settings.store_id
            AND p.role = 'admin'
        )
    );

CREATE POLICY "store_point_settings_update" ON store_point_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = store_point_settings.store_id
            AND p.role = 'admin'
        )
    );

-- ============================================
-- point_rules
-- ============================================
DROP POLICY IF EXISTS "point_rules_select" ON point_rules;
DROP POLICY IF EXISTS "point_rules_insert" ON point_rules;
DROP POLICY IF EXISTS "point_rules_update" ON point_rules;
DROP POLICY IF EXISTS "point_rules_delete" ON point_rules;

CREATE POLICY "point_rules_select" ON point_rules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = point_rules.store_id
        )
    );

CREATE POLICY "point_rules_insert" ON point_rules
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = point_rules.store_id
            AND p.role = 'admin'
        )
    );

CREATE POLICY "point_rules_update" ON point_rules
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = point_rules.store_id
            AND p.role = 'admin'
        )
    );

CREATE POLICY "point_rules_delete" ON point_rules
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = point_rules.store_id
            AND p.role = 'admin'
        )
    );

-- ============================================
-- point_rewards
-- ============================================
DROP POLICY IF EXISTS "point_rewards_select" ON point_rewards;
DROP POLICY IF EXISTS "point_rewards_insert" ON point_rewards;
DROP POLICY IF EXISTS "point_rewards_update" ON point_rewards;
DROP POLICY IF EXISTS "point_rewards_delete" ON point_rewards;

CREATE POLICY "point_rewards_select" ON point_rewards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = point_rewards.store_id
        )
    );

CREATE POLICY "point_rewards_insert" ON point_rewards
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = point_rewards.store_id
            AND p.role = 'admin'
        )
    );

CREATE POLICY "point_rewards_update" ON point_rewards
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = point_rewards.store_id
            AND p.role = 'admin'
        )
    );

CREATE POLICY "point_rewards_delete" ON point_rewards
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = point_rewards.store_id
            AND p.role = 'admin'
        )
    );

-- ============================================
-- point_redemptions
-- ============================================
DROP POLICY IF EXISTS "point_redemptions_select" ON point_redemptions;
DROP POLICY IF EXISTS "point_redemptions_insert" ON point_redemptions;
DROP POLICY IF EXISTS "point_redemptions_update" ON point_redemptions;

CREATE POLICY "point_redemptions_select" ON point_redemptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = point_redemptions.store_id
        )
    );

CREATE POLICY "point_redemptions_insert" ON point_redemptions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = point_redemptions.store_id
        )
    );

CREATE POLICY "point_redemptions_update" ON point_redemptions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = point_redemptions.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

-- ============================================
-- point_transactions
-- ============================================
DROP POLICY IF EXISTS "point_transactions_select" ON point_transactions;
DROP POLICY IF EXISTS "point_transactions_insert" ON point_transactions;
DROP POLICY IF EXISTS "point_transactions_update" ON point_transactions;

CREATE POLICY "point_transactions_select" ON point_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = point_transactions.store_id
        )
    );

CREATE POLICY "point_transactions_insert" ON point_transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = point_transactions.store_id
        )
    );

CREATE POLICY "point_transactions_update" ON point_transactions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = point_transactions.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

-- ============================================
-- photo_nomination_photos
-- ============================================
DROP POLICY IF EXISTS "photo_nomination_photos_select" ON photo_nomination_photos;
DROP POLICY IF EXISTS "photo_nomination_photos_insert" ON photo_nomination_photos;
DROP POLICY IF EXISTS "photo_nomination_photos_update" ON photo_nomination_photos;
DROP POLICY IF EXISTS "photo_nomination_photos_delete" ON photo_nomination_photos;

CREATE POLICY "photo_nomination_photos_select" ON photo_nomination_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = photo_nomination_photos.store_id
        )
    );

CREATE POLICY "photo_nomination_photos_insert" ON photo_nomination_photos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = photo_nomination_photos.store_id
        )
    );

CREATE POLICY "photo_nomination_photos_update" ON photo_nomination_photos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = photo_nomination_photos.store_id
        )
    );

CREATE POLICY "photo_nomination_photos_delete" ON photo_nomination_photos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = photo_nomination_photos.store_id
        )
    );

-- ============================================
-- photo_nomination_settings
-- ============================================
DROP POLICY IF EXISTS "photo_nomination_settings_select" ON photo_nomination_settings;
DROP POLICY IF EXISTS "photo_nomination_settings_insert" ON photo_nomination_settings;
DROP POLICY IF EXISTS "photo_nomination_settings_update" ON photo_nomination_settings;

CREATE POLICY "photo_nomination_settings_select" ON photo_nomination_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = photo_nomination_settings.store_id
        )
    );

CREATE POLICY "photo_nomination_settings_insert" ON photo_nomination_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = photo_nomination_settings.store_id
            AND p.role = 'admin'
        )
    );

CREATE POLICY "photo_nomination_settings_update" ON photo_nomination_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = photo_nomination_settings.store_id
            AND p.role = 'admin'
        )
    );

-- ============================================
-- photo_nomination_sessions
-- ============================================
DROP POLICY IF EXISTS "photo_nomination_sessions_select" ON photo_nomination_sessions;
DROP POLICY IF EXISTS "photo_nomination_sessions_insert" ON photo_nomination_sessions;
DROP POLICY IF EXISTS "photo_nomination_sessions_delete" ON photo_nomination_sessions;

CREATE POLICY "photo_nomination_sessions_select" ON photo_nomination_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = photo_nomination_sessions.store_id
        )
    );

CREATE POLICY "photo_nomination_sessions_insert" ON photo_nomination_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = photo_nomination_sessions.store_id
        )
    );

CREATE POLICY "photo_nomination_sessions_delete" ON photo_nomination_sessions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = photo_nomination_sessions.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

-- ============================================
-- reservation_custom_fields
-- ============================================
DROP POLICY IF EXISTS "custom_fields_select" ON reservation_custom_fields;
DROP POLICY IF EXISTS "custom_fields_insert" ON reservation_custom_fields;
DROP POLICY IF EXISTS "custom_fields_update" ON reservation_custom_fields;
DROP POLICY IF EXISTS "custom_fields_delete" ON reservation_custom_fields;

CREATE POLICY "reservation_custom_fields_select" ON reservation_custom_fields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = reservation_custom_fields.store_id
        )
    );

CREATE POLICY "reservation_custom_fields_insert" ON reservation_custom_fields
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = reservation_custom_fields.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

CREATE POLICY "reservation_custom_fields_update" ON reservation_custom_fields
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = reservation_custom_fields.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

CREATE POLICY "reservation_custom_fields_delete" ON reservation_custom_fields
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = reservation_custom_fields.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

-- ============================================
-- reservation_custom_answers
-- ============================================
DROP POLICY IF EXISTS "custom_answers_select" ON reservation_custom_answers;
DROP POLICY IF EXISTS "custom_answers_delete" ON reservation_custom_answers;

CREATE POLICY "reservation_custom_answers_select" ON reservation_custom_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reservations r
            JOIN profiles p ON p.store_id = r.store_id
            WHERE r.id = reservation_custom_answers.reservation_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "reservation_custom_answers_delete" ON reservation_custom_answers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM reservations r
            JOIN profiles p ON p.store_id = r.store_id
            WHERE r.id = reservation_custom_answers.reservation_id
            AND p.user_id = (select auth.uid())
            AND p.role IN ('admin', 'staff')
        )
    );

-- ============================================
-- queue_custom_fields
-- ============================================
DROP POLICY IF EXISTS "Store members can view queue custom fields" ON queue_custom_fields;
DROP POLICY IF EXISTS "Store members can insert queue custom fields" ON queue_custom_fields;
DROP POLICY IF EXISTS "Store members can update queue custom fields" ON queue_custom_fields;
DROP POLICY IF EXISTS "Store members can delete queue custom fields" ON queue_custom_fields;

CREATE POLICY "queue_custom_fields_select" ON queue_custom_fields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = queue_custom_fields.store_id
        )
    );

CREATE POLICY "queue_custom_fields_insert" ON queue_custom_fields
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = queue_custom_fields.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

CREATE POLICY "queue_custom_fields_update" ON queue_custom_fields
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = queue_custom_fields.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

CREATE POLICY "queue_custom_fields_delete" ON queue_custom_fields
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = queue_custom_fields.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

-- ============================================
-- queue_custom_answers
-- ============================================
DROP POLICY IF EXISTS "Store members can view queue custom answers" ON queue_custom_answers;
DROP POLICY IF EXISTS "Store members can insert queue custom answers" ON queue_custom_answers;
DROP POLICY IF EXISTS "Store members can update queue custom answers" ON queue_custom_answers;
DROP POLICY IF EXISTS "Store members can delete queue custom answers" ON queue_custom_answers;

CREATE POLICY "queue_custom_answers_select" ON queue_custom_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM queue_entries qe
            JOIN profiles p ON p.store_id = qe.store_id
            WHERE qe.id = queue_custom_answers.queue_entry_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "queue_custom_answers_insert" ON queue_custom_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM queue_entries qe
            JOIN profiles p ON p.store_id = qe.store_id
            WHERE qe.id = queue_custom_answers.queue_entry_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "queue_custom_answers_update" ON queue_custom_answers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM queue_entries qe
            JOIN profiles p ON p.store_id = qe.store_id
            WHERE qe.id = queue_custom_answers.queue_entry_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "queue_custom_answers_delete" ON queue_custom_answers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM queue_entries qe
            JOIN profiles p ON p.store_id = qe.store_id
            WHERE qe.id = queue_custom_answers.queue_entry_id
            AND p.user_id = (select auth.uid())
        )
    );

-- ============================================
-- Remove duplicate index
-- ============================================
DROP INDEX IF EXISTS idx_ai_generated_images_store;
-- Keep idx_ai_generated_images_store_id
