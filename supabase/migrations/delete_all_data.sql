-- WARNING: This script will DELETE ALL DATA from all tables
-- Use with extreme caution!

-- Disable triggers temporarily to avoid constraint issues
SET session_replication_role = 'replica';

-- Delete data from all tables (in reverse dependency order)

-- Resume system
DELETE FROM public.resume_answers;
DELETE FROM public.past_employments;
DELETE FROM public.resume_questions;
DELETE FROM public.resumes;

-- Comments and likes
DELETE FROM public.comment_likes;
DELETE FROM public.comments;

-- Bottle keeps
DELETE FROM public.bottle_keeps;

-- Menus
DELETE FROM public.menus;

-- Profile relationships
DELETE FROM public.profile_relationships;

-- Time cards
DELETE FROM public.time_cards;

-- Profiles (will cascade to many related tables)
DELETE FROM public.profiles;

-- Users (will cascade to profiles if configured)
DELETE FROM public.users;

-- Store roles
DELETE FROM public.store_roles;

-- Stores (will cascade to many related tables)
DELETE FROM public.stores;

-- Delete authentication users (this will cascade to public.users)
DELETE FROM auth.users;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Reset sequences (optional - uncomment if needed)
-- This will reset auto-incrementing IDs to 1
-- ALTER SEQUENCE IF EXISTS <sequence_name> RESTART WITH 1;

SELECT 'All data deleted successfully' as result;
