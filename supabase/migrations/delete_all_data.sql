-- WARNING: This script will DELETE ALL DATA from all tables
-- Use with extreme caution!

-- Disable triggers temporarily to avoid constraint issues
SET session_replication_role = 'replica';

-- Delete data from all tables (in reverse dependency order)

-- Floor management system
DELETE FROM public.orders;
DELETE FROM public.cast_assignments;
DELETE FROM public.table_sessions;
DELETE FROM public.tables;
DELETE FROM public.table_types;
DELETE FROM public.pricing_systems;
DELETE FROM public.bill_settings;

-- Resume system
DELETE FROM public.past_employments;

-- Comments and likes
DELETE FROM public.comment_likes;
DELETE FROM public.comments;

-- Bottle keeps
DELETE FROM public.bottle_keep_holders;
DELETE FROM public.bottle_keeps;

-- Menus and categories
DELETE FROM public.menus;
DELETE FROM public.menu_categories;

-- CMS
DELETE FROM public.cms_entries;

-- Profile relationships
DELETE FROM public.profile_relationships;

-- Time cards
DELETE FROM public.time_cards;

-- Profiles
DELETE FROM public.profiles;

-- Users
DELETE FROM public.users;

-- Store roles
DELETE FROM public.store_roles;

-- Stores
DELETE FROM public.stores;

-- Delete authentication users
DELETE FROM auth.users;

-- Re-enable triggers
SET session_replication_role = 'origin';

SELECT 'All data deleted successfully' as result;
