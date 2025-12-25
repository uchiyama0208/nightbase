-- Fix RLS policies for tables that use profile_id instead of user_id

-- ============================================
-- photo_nomination_selections (needs to go through session to get store_id)
-- ============================================
DROP POLICY IF EXISTS "photo_nomination_selections_select" ON photo_nomination_selections;
DROP POLICY IF EXISTS "photo_nomination_selections_insert" ON photo_nomination_selections;
DROP POLICY IF EXISTS "photo_nomination_selections_delete" ON photo_nomination_selections;

CREATE POLICY "photo_nomination_selections_select" ON photo_nomination_selections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM photo_nomination_sessions pns
            JOIN profiles p ON p.store_id = pns.store_id
            WHERE pns.id = photo_nomination_selections.session_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "photo_nomination_selections_insert" ON photo_nomination_selections
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM photo_nomination_sessions pns
            JOIN profiles p ON p.store_id = pns.store_id
            WHERE pns.id = photo_nomination_selections.session_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "photo_nomination_selections_delete" ON photo_nomination_selections
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM photo_nomination_sessions pns
            JOIN profiles p ON p.store_id = pns.store_id
            WHERE pns.id = photo_nomination_selections.session_id
            AND p.user_id = (select auth.uid())
        )
    );

-- ============================================
-- join_requests (uses profile_id, not user_id)
-- ============================================
DROP POLICY IF EXISTS "join_requests_insert" ON join_requests;
DROP POLICY IF EXISTS "join_requests_select" ON join_requests;

CREATE POLICY "join_requests_insert" ON join_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = join_requests.profile_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "join_requests_select" ON join_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = join_requests.profile_id
            AND p.user_id = (select auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = (select auth.uid())
            AND p.store_id = join_requests.store_id
            AND p.role IN ('admin', 'staff')
        )
    );

-- ============================================
-- push_subscriptions (uses profile_id, not user_id)
-- ============================================
DROP POLICY IF EXISTS "push_subscriptions_select" ON push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert" ON push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_delete" ON push_subscriptions;

CREATE POLICY "push_subscriptions_select" ON push_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = push_subscriptions.profile_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "push_subscriptions_insert" ON push_subscriptions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = push_subscriptions.profile_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "push_subscriptions_delete" ON push_subscriptions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = push_subscriptions.profile_id
            AND p.user_id = (select auth.uid())
        )
    );

-- ============================================
-- push_notification_settings (uses profile_id, not user_id)
-- ============================================
DROP POLICY IF EXISTS "push_notification_settings_select" ON push_notification_settings;
DROP POLICY IF EXISTS "push_notification_settings_insert" ON push_notification_settings;
DROP POLICY IF EXISTS "push_notification_settings_update" ON push_notification_settings;

CREATE POLICY "push_notification_settings_select" ON push_notification_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = push_notification_settings.profile_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "push_notification_settings_insert" ON push_notification_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = push_notification_settings.profile_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "push_notification_settings_update" ON push_notification_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = push_notification_settings.profile_id
            AND p.user_id = (select auth.uid())
        )
    );

-- ============================================
-- line_notification_settings (uses profile_id, not user_id)
-- ============================================
DROP POLICY IF EXISTS "line_notification_settings_select" ON line_notification_settings;
DROP POLICY IF EXISTS "line_notification_settings_insert" ON line_notification_settings;
DROP POLICY IF EXISTS "line_notification_settings_update" ON line_notification_settings;

CREATE POLICY "line_notification_settings_select" ON line_notification_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = line_notification_settings.profile_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "line_notification_settings_insert" ON line_notification_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = line_notification_settings.profile_id
            AND p.user_id = (select auth.uid())
        )
    );

CREATE POLICY "line_notification_settings_update" ON line_notification_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = line_notification_settings.profile_id
            AND p.user_id = (select auth.uid())
        )
    );
