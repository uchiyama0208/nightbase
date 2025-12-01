-- Fix RLS performance issues by using (select auth.uid()) instead of auth.uid()
-- This prevents re-evaluation for each row

-- =============================================
-- PROFILES TABLE - Consolidate and fix policies
-- =============================================

-- Drop duplicate/overlapping policies
DROP POLICY IF EXISTS "Allow users to read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
DROP POLICY IF EXISTS "Allow staff to update role_id in same store" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Staff can delete profiles in their store" ON profiles;

-- Recreate consolidated policies with (select auth.uid())
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "profiles_delete_staff" ON profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = profiles.store_id
      AND p.role IN ('admin', 'staff')
    )
  );

-- =============================================
-- USERS TABLE - Fix policies
-- =============================================

DROP POLICY IF EXISTS "Users can insert their own row" ON users;
DROP POLICY IF EXISTS "Users can update their own row" ON users;

CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (id = (select auth.uid()));

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = (select auth.uid()));

-- =============================================
-- STORES TABLE - Consolidate and fix policies
-- =============================================

DROP POLICY IF EXISTS "Admins can delete stores" ON stores;
DROP POLICY IF EXISTS "Admins can insert/update stores" ON stores;
DROP POLICY IF EXISTS "Admins can update stores" ON stores;
DROP POLICY IF EXISTS "Authenticated users can create stores" ON stores;

CREATE POLICY "stores_insert_authenticated" ON stores
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "stores_update_admin" ON stores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = stores.id
      AND p.role = 'admin'
    )
  );

CREATE POLICY "stores_delete_admin" ON stores
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = stores.id
      AND p.role = 'admin'
    )
  );

-- =============================================
-- TIME_CARDS TABLE - Consolidate and fix policies
-- =============================================

DROP POLICY IF EXISTS "Admins and Staff can view all time cards" ON time_cards;
DROP POLICY IF EXISTS "Users can view own time cards" ON time_cards;
DROP POLICY IF EXISTS "Users can view their own time cards" ON time_cards;
DROP POLICY IF EXISTS "Users can insert their own time cards" ON time_cards;
DROP POLICY IF EXISTS "Users can insert/update their own time cards" ON time_cards;
DROP POLICY IF EXISTS "Users can manage own time cards" ON time_cards;
DROP POLICY IF EXISTS "Users can delete time cards" ON time_cards;
DROP POLICY IF EXISTS "time_cards_select_via_profile" ON time_cards;
DROP POLICY IF EXISTS "time_cards_insert_via_profile" ON time_cards;
DROP POLICY IF EXISTS "time_cards_update_via_profile" ON time_cards;

CREATE POLICY "time_cards_select" ON time_cards
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN profiles tc_profile ON tc_profile.id = time_cards.profile_id
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = tc_profile.store_id
      AND p.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "time_cards_insert" ON time_cards
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "time_cards_update" ON time_cards
  FOR UPDATE USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "time_cards_delete" ON time_cards
  FOR DELETE USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = (select auth.uid())
    )
  );

-- =============================================
-- MENUS TABLE - Fix policies
-- =============================================

DROP POLICY IF EXISTS "Users can insert menus to their store" ON menus;
DROP POLICY IF EXISTS "Users can update menus of their store" ON menus;
DROP POLICY IF EXISTS "Users can delete menus of their store" ON menus;

CREATE POLICY "menus_insert" ON menus
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = menus.store_id
    )
  );

CREATE POLICY "menus_update" ON menus
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = menus.store_id
    )
  );

CREATE POLICY "menus_delete" ON menus
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = menus.store_id
    )
  );

-- =============================================
-- MENU_CATEGORIES TABLE - Fix policies
-- =============================================

DROP POLICY IF EXISTS "Enable delete for staff" ON menu_categories;
DROP POLICY IF EXISTS "Enable insert for staff" ON menu_categories;
DROP POLICY IF EXISTS "Enable update for staff" ON menu_categories;

CREATE POLICY "menu_categories_insert" ON menu_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = menu_categories.store_id
    )
  );

CREATE POLICY "menu_categories_update" ON menu_categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = menu_categories.store_id
    )
  );

CREATE POLICY "menu_categories_delete" ON menu_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = menu_categories.store_id
    )
  );

-- =============================================
-- COMMENTS TABLE - Fix policies
-- =============================================

DROP POLICY IF EXISTS "Users can insert comments in their store" ON comments;
DROP POLICY IF EXISTS "Users can view comments in their store" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = comments.store_id
    )
  );

CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (
    author_id IN (SELECT id FROM profiles WHERE user_id = (select auth.uid()))
  );

CREATE POLICY "comments_update" ON comments
  FOR UPDATE USING (
    author_id IN (SELECT id FROM profiles WHERE user_id = (select auth.uid()))
  );

CREATE POLICY "comments_delete" ON comments
  FOR DELETE USING (
    author_id IN (SELECT id FROM profiles WHERE user_id = (select auth.uid()))
  );

-- =============================================
-- COMMENT_LIKES TABLE - Fix policies
-- =============================================

DROP POLICY IF EXISTS "Users can insert likes in their store" ON comment_likes;
DROP POLICY IF EXISTS "Users can view likes in their store" ON comment_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON comment_likes;

CREATE POLICY "comment_likes_select" ON comment_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN comments c ON c.id = comment_likes.comment_id
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = c.store_id
    )
  );

CREATE POLICY "comment_likes_insert" ON comment_likes
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = (select auth.uid()))
  );

CREATE POLICY "comment_likes_delete" ON comment_likes
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = (select auth.uid()))
  );

-- =============================================
-- BOTTLE_KEEPS TABLE - Fix policies
-- =============================================

DROP POLICY IF EXISTS "Users can view bottle keeps of their store" ON bottle_keeps;
DROP POLICY IF EXISTS "Users can insert bottle keeps to their store" ON bottle_keeps;
DROP POLICY IF EXISTS "Users can update bottle keeps of their store" ON bottle_keeps;
DROP POLICY IF EXISTS "Users can delete bottle keeps of their store" ON bottle_keeps;

CREATE POLICY "bottle_keeps_select" ON bottle_keeps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = bottle_keeps.store_id
    )
  );

CREATE POLICY "bottle_keeps_insert" ON bottle_keeps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = bottle_keeps.store_id
    )
  );

CREATE POLICY "bottle_keeps_update" ON bottle_keeps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = bottle_keeps.store_id
    )
  );

CREATE POLICY "bottle_keeps_delete" ON bottle_keeps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = bottle_keeps.store_id
    )
  );

-- =============================================
-- BOTTLE_KEEP_HOLDERS TABLE - Fix policies
-- =============================================

DROP POLICY IF EXISTS "Users can view bottle keep holders of their store" ON bottle_keep_holders;
DROP POLICY IF EXISTS "Users can insert bottle keep holders to their store" ON bottle_keep_holders;
DROP POLICY IF EXISTS "Users can delete bottle keep holders of their store" ON bottle_keep_holders;

CREATE POLICY "bottle_keep_holders_select" ON bottle_keep_holders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN bottle_keeps bk ON bk.id = bottle_keep_holders.bottle_keep_id
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = bk.store_id
    )
  );

CREATE POLICY "bottle_keep_holders_insert" ON bottle_keep_holders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN bottle_keeps bk ON bk.id = bottle_keep_holders.bottle_keep_id
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = bk.store_id
    )
  );

CREATE POLICY "bottle_keep_holders_delete" ON bottle_keep_holders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN bottle_keeps bk ON bk.id = bottle_keep_holders.bottle_keep_id
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = bk.store_id
    )
  );

-- =============================================
-- PROFILE_RELATIONSHIPS TABLE - Fix policies
-- =============================================

DROP POLICY IF EXISTS "Users can insert relationships in their store" ON profile_relationships;
DROP POLICY IF EXISTS "Users can delete relationships in their store" ON profile_relationships;

CREATE POLICY "profile_relationships_insert" ON profile_relationships
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = profile_relationships.store_id
    )
  );

CREATE POLICY "profile_relationships_delete" ON profile_relationships
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = profile_relationships.store_id
    )
  );

-- =============================================
-- STORE_ROLES TABLE - Consolidate and fix policies
-- =============================================

DROP POLICY IF EXISTS "Store members can view roles" ON store_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON store_roles;

CREATE POLICY "store_roles_select" ON store_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = store_roles.store_id
    )
  );

CREATE POLICY "store_roles_all_admin" ON store_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = store_roles.store_id
      AND p.role = 'admin'
    )
  );

-- =============================================
-- ORDERS TABLE - Consolidate policies
-- =============================================

DROP POLICY IF EXISTS "Users can manage orders in their store" ON orders;
DROP POLICY IF EXISTS "Users can view orders in their store" ON orders;

CREATE POLICY "orders_all" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN table_sessions ts ON ts.id = orders.table_session_id
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = ts.store_id
    )
  );

-- =============================================
-- CMS_ENTRIES TABLE - Consolidate policies
-- =============================================

DROP POLICY IF EXISTS "Admin/editor manage cms_entries" ON cms_entries;
DROP POLICY IF EXISTS "Public read published cms_entries" ON cms_entries;

CREATE POLICY "cms_entries_public_read" ON cms_entries
  FOR SELECT USING (status = 'published');

CREATE POLICY "cms_entries_admin_all" ON cms_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = cms_entries.store_id
      AND p.role IN ('admin', 'staff')
    )
  );

-- =============================================
-- PAST_EMPLOYMENTS TABLE - Consolidate policies
-- =============================================

DROP POLICY IF EXISTS "Staff can view all past employments in their store" ON past_employments;
DROP POLICY IF EXISTS "Users can manage their own past employments" ON past_employments;
DROP POLICY IF EXISTS "Users can view their own past employments" ON past_employments;

CREATE POLICY "past_employments_select" ON past_employments
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = (select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN profiles pe_profile ON pe_profile.id = past_employments.profile_id
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = pe_profile.store_id
      AND p.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "past_employments_manage_own" ON past_employments
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = (select auth.uid()))
  );
