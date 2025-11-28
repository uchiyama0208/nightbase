--
-- PostgreSQL database dump
--

\restrict 9e1zv4VH4VFJDMT1Wab56kR1vNzmi6eIsiNiWWfzMqUbadkgW3zaQgm1bbjbEGg

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: profile_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.profile_status AS ENUM (
    '通常',
    '未面接',
    '保留',
    '不合格',
    '体入',
    '休職中',
    '退店済み'
);


--
-- Name: accept_invitation(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_invitation(invitation_id uuid, target_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    target_profile_id UUID;
    target_role_id UUID;
BEGIN
    -- Get invitation details and lock the row
    SELECT profile_id, role_id INTO target_profile_id, target_role_id
    FROM invitations
    WHERE id = invitation_id AND status = 'pending'
    FOR UPDATE;

    IF target_profile_id IS NULL THEN
        RAISE EXCEPTION 'Invitation not found or invalid';
    END IF;

    -- Update profile with user_id
    -- Also update role if specified in invitation
    UPDATE profiles
    SET 
        user_id = target_user_id,
        role_id = COALESCE(target_role_id, role_id), -- Update role if provided, else keep existing
        updated_at = NOW()
    WHERE id = target_profile_id;

    -- Update invitation status
    UPDATE invitations
    SET 
        status = 'accepted',
        updated_at = NOW()
    WHERE id = invitation_id;

    -- If role_id was provided, we might need to ensure the role exists or do other checks, but FK handles existence.
    -- The profile update handles the role assignment.

END;
$$;


--
-- Name: get_invitation_by_token(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_invitation_by_token(lookup_token uuid) RETURNS TABLE(id uuid, store_id uuid, profile_id uuid, role_id uuid, status text, expires_at timestamp with time zone, password_hash text, store_name text, profile_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.store_id,
        i.profile_id,
        i.role_id,
        i.status,
        i.expires_at,
        i.password_hash,
        s.name AS store_name,
        p.display_name AS profile_name
    FROM invitations i
    JOIN stores s ON i.store_id = s.id
    JOIN profiles p ON i.profile_id = p.id
    WHERE i.token = lookup_token
    AND i.status = 'pending'
    AND i.expires_at > NOW();
END;
$$;


--
-- Name: get_profile_by_id_for_invite(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_profile_by_id_for_invite(lookup_id uuid) RETURNS TABLE(id uuid, store_id uuid, user_id uuid, role text, invite_status text, invite_expires_at timestamp with time zone, invite_password_hash text, store_name text, profile_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.store_id,
        p.user_id,
        p.role::TEXT,
        p.invite_status,
        p.invite_expires_at,
        p.invite_password_hash,
        s.name AS store_name,
        p.display_name AS profile_name
    FROM profiles p
    JOIN stores s ON p.store_id = s.id
    WHERE p.id = lookup_id
    AND p.invite_status = 'pending'
    AND (p.invite_expires_at IS NULL OR p.invite_expires_at > NOW());
END;
$$;


--
-- Name: get_profile_by_invite_token(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_profile_by_invite_token(lookup_token uuid) RETURNS TABLE(id uuid, store_id uuid, user_id uuid, role text, invite_status text, invite_expires_at timestamp with time zone, invite_password_hash text, store_name text, profile_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.store_id,
        p.user_id,
        p.role::TEXT,
        p.invite_status,
        p.invite_expires_at,
        p.invite_password_hash,
        s.name AS store_name,
        p.display_name AS profile_name
    FROM profiles p
    JOIN stores s ON p.store_id = s.id
    WHERE p.invite_token = lookup_token
    AND p.invite_status = 'pending'
    AND (p.invite_expires_at IS NULL OR p.invite_expires_at > NOW());
END;
$$;


--
-- Name: handle_new_auth_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_auth_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;


--
-- Name: has_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_permission(_store_id uuid, _permission text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  _has_permission boolean;
begin
  select (
    p.role = 'admin'
    or (sr.permissions->>_permission)::boolean = true
  )
  into _has_permission
  from profiles p
  left join store_roles sr on p.role_id = sr.id
  where p.user_id = auth.uid()
  and p.store_id = _store_id;

  return coalesce(_has_permission, false);
end;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bottle_keep_holders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bottle_keep_holders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bottle_keep_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: bottle_keeps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bottle_keeps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    menu_id uuid NOT NULL,
    remaining_amount integer DEFAULT 100 NOT NULL,
    opened_at date DEFAULT CURRENT_DATE NOT NULL,
    expiration_date date,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT bottle_keeps_remaining_amount_check CHECK (((remaining_amount >= 0) AND (remaining_amount <= 100)))
);


--
-- Name: cms_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    body text,
    excerpt text,
    tags text[] DEFAULT '{}'::text[],
    cover_image_url text,
    status text DEFAULT 'draft'::text NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb,
    CONSTRAINT cms_entries_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text]))),
    CONSTRAINT cms_entries_type_check CHECK ((type = ANY (ARRAY['blog'::text, 'case_study'::text, 'manual'::text])))
);


--
-- Name: comment_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    target_profile_id uuid,
    author_profile_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    target_bottle_keep_id uuid,
    CONSTRAINT check_comment_target CHECK ((((target_profile_id IS NOT NULL) AND (target_bottle_keep_id IS NULL)) OR ((target_profile_id IS NULL) AND (target_bottle_keep_id IS NOT NULL))))
);


--
-- Name: menu_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: menus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menus (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    price integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    category_id uuid NOT NULL
);


--
-- Name: past_employments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.past_employments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_name text NOT NULL,
    period text,
    hourly_wage integer,
    sales_amount integer,
    customer_count integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    profile_id uuid NOT NULL
);


--
-- Name: TABLE past_employments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.past_employments IS '過去在籍店情報';


--
-- Name: profile_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    source_profile_id uuid NOT NULL,
    target_profile_id uuid NOT NULL,
    relationship_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_bidirectional_order CHECK ((source_profile_id < target_profile_id)),
    CONSTRAINT profile_relationships_relationship_type_check CHECK ((relationship_type = ANY (ARRAY['compatibility_good'::text, 'compatibility_bad'::text, 'nomination'::text, 'in_charge'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT gen_random_uuid(),
    display_name text,
    role text DEFAULT 'guest'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    avatar_url text,
    phone_number text,
    real_name text,
    real_name_kana text,
    store_id uuid,
    role_id uuid,
    display_name_kana text,
    theme text DEFAULT 'light'::text,
    guest_addressee text,
    guest_receipt_type text DEFAULT 'none'::text,
    approval_status text DEFAULT 'approved'::text,
    line_user_id text,
    invite_token uuid DEFAULT gen_random_uuid(),
    invite_status text DEFAULT 'pending'::text,
    invite_expires_at timestamp with time zone,
    invite_password_hash text,
    last_name text,
    first_name text,
    last_name_kana text,
    first_name_kana text,
    zip_code text,
    prefecture text,
    city text,
    street text,
    building text,
    emergency_phone_number text,
    nearest_station text,
    height integer,
    desired_cast_name text,
    desired_hourly_wage integer,
    desired_shift_days text,
    status public.profile_status DEFAULT '通常'::public.profile_status,
    CONSTRAINT profiles_approval_status_check CHECK ((approval_status = ANY (ARRAY['approved'::text, 'pending'::text, 'rejected'::text]))),
    CONSTRAINT profiles_invite_status_check CHECK ((invite_status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'canceled'::text]))),
    CONSTRAINT theme_check CHECK ((theme = ANY (ARRAY['light'::text, 'dark'::text])))
);


--
-- Name: COLUMN profiles.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.user_id IS 'References auth.users(id). No FK constraint due to Supabase limitations. Maintained by application logic.';


--
-- Name: COLUMN profiles.phone_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.phone_number IS '電話番号';


--
-- Name: COLUMN profiles.guest_addressee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.guest_addressee IS 'Addressee (宛名) used mainly for guest profiles.';


--
-- Name: COLUMN profiles.guest_receipt_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.guest_receipt_type IS 'Receipt preference for guests: none, amount_only, with_date.';


--
-- Name: COLUMN profiles.approval_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.approval_status IS 'Approval status for join requests: approved, pending, rejected';


--
-- Name: COLUMN profiles.line_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.line_user_id IS 'LINE user ID for LINE login integration';


--
-- Name: COLUMN profiles.last_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.last_name IS '姓';


--
-- Name: COLUMN profiles.first_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.first_name IS '名';


--
-- Name: COLUMN profiles.last_name_kana; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.last_name_kana IS '姓（かな）';


--
-- Name: COLUMN profiles.first_name_kana; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.first_name_kana IS '名（かな）';


--
-- Name: COLUMN profiles.zip_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.zip_code IS '郵便番号';


--
-- Name: COLUMN profiles.prefecture; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.prefecture IS '都道府県';


--
-- Name: COLUMN profiles.city; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.city IS '市区町村';


--
-- Name: COLUMN profiles.street; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.street IS '番地';


--
-- Name: COLUMN profiles.building; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.building IS '建物名';


--
-- Name: COLUMN profiles.emergency_phone_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.emergency_phone_number IS '緊急連絡先';


--
-- Name: COLUMN profiles.nearest_station; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.nearest_station IS '最寄り駅';


--
-- Name: COLUMN profiles.height; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.height IS '身長';


--
-- Name: COLUMN profiles.desired_cast_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.desired_cast_name IS '希望キャスト名';


--
-- Name: COLUMN profiles.desired_hourly_wage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.desired_hourly_wage IS '希望時給';


--
-- Name: COLUMN profiles.desired_shift_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.desired_shift_days IS '希望シフト（週◯回）';


--
-- Name: COLUMN profiles.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.status IS 'プロフィールの状態';


--
-- Name: store_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_system_role boolean DEFAULT false
);


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stores (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    show_break_columns boolean DEFAULT true,
    latitude double precision,
    longitude double precision,
    location_radius integer DEFAULT 50,
    location_check_enabled boolean DEFAULT false,
    show_dashboard boolean DEFAULT true NOT NULL,
    show_attendance boolean DEFAULT true NOT NULL,
    show_timecard boolean DEFAULT true NOT NULL,
    show_users boolean DEFAULT true NOT NULL,
    show_roles boolean DEFAULT true NOT NULL,
    tablet_timecard_enabled boolean DEFAULT false NOT NULL,
    tablet_acceptance_start_time time without time zone,
    tablet_acceptance_end_time time without time zone,
    tablet_allowed_roles text[] DEFAULT ARRAY['staff'::text, 'cast'::text],
    tablet_theme text DEFAULT 'light'::text,
    time_rounding_enabled boolean DEFAULT false,
    time_rounding_method text DEFAULT 'round'::text,
    time_rounding_minutes integer DEFAULT 15,
    auto_clockout_enabled boolean DEFAULT false,
    show_menus boolean DEFAULT false,
    allow_join_requests boolean DEFAULT false,
    icon_url text,
    business_start_time time without time zone,
    business_end_time time without time zone,
    day_switch_time time without time zone,
    industry text,
    closed_days text[],
    prefecture text,
    referral_source text,
    CONSTRAINT stores_tablet_theme_check CHECK ((tablet_theme = ANY (ARRAY['light'::text, 'dark'::text])))
);


--
-- Name: COLUMN stores.tablet_acceptance_start_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stores.tablet_acceptance_start_time IS 'Start time for tablet timecard acceptance (e.g., 18:00)';


--
-- Name: COLUMN stores.tablet_acceptance_end_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stores.tablet_acceptance_end_time IS 'End time for tablet timecard acceptance (e.g., 05:00 next day)';


--
-- Name: COLUMN stores.tablet_allowed_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stores.tablet_allowed_roles IS 'Roles allowed to use tablet timecard: staff, cast, or both';


--
-- Name: COLUMN stores.tablet_theme; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stores.tablet_theme IS 'Theme for tablet timecard: light or dark';


--
-- Name: COLUMN stores.time_rounding_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stores.time_rounding_enabled IS '打刻時間の自動修正を有効にするか';


--
-- Name: COLUMN stores.time_rounding_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stores.time_rounding_method IS '修正方法: round (四捨五入), floor (繰り下げ), ceil (繰り上げ)';


--
-- Name: COLUMN stores.time_rounding_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stores.time_rounding_minutes IS '修正する時間の単位（分）: 5, 10, 15, 20, 30, 60';


--
-- Name: COLUMN stores.auto_clockout_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stores.auto_clockout_enabled IS '退勤忘れ時の自動退勤処理を有効にするかどうか';


--
-- Name: COLUMN stores.allow_join_requests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stores.allow_join_requests IS 'Whether the store allows users to request to join via store ID search';


--
-- Name: COLUMN stores.day_switch_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stores.day_switch_time IS 'Time when the business day switches (e.g., 05:00)';


--
-- Name: time_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_cards (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    work_date date NOT NULL,
    clock_in timestamp with time zone,
    clock_out timestamp with time zone,
    break_start timestamp with time zone,
    break_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pickup_required boolean DEFAULT false,
    pickup_destination text,
    scheduled_start_time timestamp with time zone,
    scheduled_end_time timestamp with time zone,
    forgot_clockout boolean DEFAULT false
);


--
-- Name: COLUMN time_cards.clock_in; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.time_cards.clock_in IS '実際の打刻出勤時刻';


--
-- Name: COLUMN time_cards.clock_out; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.time_cards.clock_out IS '実際の打刻退勤時刻';


--
-- Name: COLUMN time_cards.scheduled_start_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.time_cards.scheduled_start_time IS '自動修正された開始時間（打刻時間の丸め処理後）';


--
-- Name: COLUMN time_cards.scheduled_end_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.time_cards.scheduled_end_time IS '自動修正された終了時間（打刻時間の丸め処理後）';


--
-- Name: COLUMN time_cards.forgot_clockout; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.time_cards.forgot_clockout IS '退勤打刻を忘れて自動的に退勤処理された場合true';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    current_profile_id uuid,
    primary_email text,
    hide_line_friendship_prompt boolean DEFAULT false
);


--
-- Name: COLUMN users.primary_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.primary_email IS 'User-specified email address for login and display. NULL for LINE-only users who have not set an email.';


--
-- Name: COLUMN users.hide_line_friendship_prompt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.hide_line_friendship_prompt IS 'ユーザーがLINE友だち追加プロンプトを非表示にするかどうか';


--
-- Data for Name: bottle_keep_holders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bottle_keep_holders (id, bottle_keep_id, profile_id, created_at) FROM stdin;
\.


--
-- Data for Name: bottle_keeps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bottle_keeps (id, store_id, menu_id, remaining_amount, opened_at, expiration_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cms_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cms_entries (id, type, slug, title, body, excerpt, tags, cover_image_url, status, published_at, created_at, updated_at, metadata) FROM stdin;
\.


--
-- Data for Name: comment_likes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comment_likes (id, comment_id, profile_id, created_at) FROM stdin;
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comments (id, store_id, target_profile_id, author_profile_id, content, created_at, updated_at, target_bottle_keep_id) FROM stdin;
\.


--
-- Data for Name: menu_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menu_categories (id, store_id, name, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: menus; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menus (id, store_id, name, price, created_at, updated_at, category_id) FROM stdin;
\.


--
-- Data for Name: past_employments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.past_employments (id, store_name, period, hourly_wage, sales_amount, customer_count, created_at, updated_at, profile_id) FROM stdin;
\.


--
-- Data for Name: profile_relationships; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profile_relationships (id, store_id, source_profile_id, target_profile_id, relationship_type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, user_id, display_name, role, created_at, updated_at, avatar_url, phone_number, real_name, real_name_kana, store_id, role_id, display_name_kana, theme, guest_addressee, guest_receipt_type, approval_status, line_user_id, invite_token, invite_status, invite_expires_at, invite_password_hash, last_name, first_name, last_name_kana, first_name_kana, zip_code, prefecture, city, street, building, emergency_phone_number, nearest_station, height, desired_cast_name, desired_hourly_wage, desired_shift_days, status) FROM stdin;
e0e16b34-54a1-48df-953f-50f17cd8a4a9	e22e5ae8-a0ce-42f9-8e64-663b032c65a5	りょうじ	staff	2025-11-28 15:32:54.448932+00	2025-11-28 15:32:54.448932+00	https://profile.line-scdn.net/0hSDY4z3yNDGt0TRlvpDZyFAQdDwFXPFV5XykUDUBJVA8Ze09qXywTDRRIAFNKLks8DH4QWBFMV1t4XnsNahvwX3N9UVpIdE84XitLhQ	\N			62ed9486-6e84-4aff-ba52-b75520ec273f	2eea2bc1-ed40-4666-b6cc-1fe17e15535b	りょうじ	light	\N	none	approved	U3e18e1944fec2b61f23d764e24260fc2	1754d6f1-f47b-4428-bfc7-67c0196985a6	pending	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	通常
\.


--
-- Data for Name: store_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.store_roles (id, store_id, name, permissions, created_at, updated_at, is_system_role) FROM stdin;
2eea2bc1-ed40-4666-b6cc-1fe17e15535b	62ed9486-6e84-4aff-ba52-b75520ec273f	デフォルトスタッフ	{"can_manage_menus": true, "can_manage_roles": true, "can_manage_users": true, "can_view_reports": true, "can_manage_bottles": true, "can_manage_settings": true, "can_manage_attendance": true}	2025-11-28 15:33:38.027753+00	2025-11-28 15:33:38.027753+00	t
619cd3e7-fa84-49f5-9406-f0728b9f528c	62ed9486-6e84-4aff-ba52-b75520ec273f	デフォルトキャスト	{"target": "cast"}	2025-11-28 15:33:38.079825+00	2025-11-28 15:33:38.079825+00	t
\.


--
-- Data for Name: stores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stores (id, name, created_at, updated_at, show_break_columns, latitude, longitude, location_radius, location_check_enabled, show_dashboard, show_attendance, show_timecard, show_users, show_roles, tablet_timecard_enabled, tablet_acceptance_start_time, tablet_acceptance_end_time, tablet_allowed_roles, tablet_theme, time_rounding_enabled, time_rounding_method, time_rounding_minutes, auto_clockout_enabled, show_menus, allow_join_requests, icon_url, business_start_time, business_end_time, day_switch_time, industry, closed_days, prefecture, referral_source) FROM stdin;
62ed9486-6e84-4aff-ba52-b75520ec273f	Three	2025-11-28 15:33:37.943053+00	2025-11-28 15:33:37.943053+00	t	\N	\N	50	f	t	t	t	t	t	f	\N	\N	{staff,cast}	light	f	round	15	f	t	f	\N	19:00:00	01:00:00	05:00:00	ラウンジ	{sunday}	東京都	その他
\.


--
-- Data for Name: time_cards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.time_cards (id, user_id, work_date, clock_in, clock_out, break_start, break_end, created_at, updated_at, pickup_required, pickup_destination, scheduled_start_time, scheduled_end_time, forgot_clockout) FROM stdin;
7cff54e3-0e41-4af4-8984-1285804f1c1d	e0e16b34-54a1-48df-953f-50f17cd8a4a9	2025-11-29	2025-11-28 15:34:03.173+00	2025-11-28 15:34:07.765+00	\N	\N	2025-11-28 15:34:03.293494+00	2025-11-28 15:34:03.293494+00	f	\N	2025-11-28 15:34:03.173+00	2025-11-28 15:34:07.765+00	f
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, created_at, updated_at, current_profile_id, primary_email, hide_line_friendship_prompt) FROM stdin;
e22e5ae8-a0ce-42f9-8e64-663b032c65a5	U3e18e1944fec2b61f23d764e24260fc2-1764343973925@line.nightbase.app	2025-11-28 15:32:54.566347+00	2025-11-28 15:32:54.566347+00	e0e16b34-54a1-48df-953f-50f17cd8a4a9	\N	f
\.


--
-- Name: bottle_keep_holders bottle_keep_holders_bottle_keep_id_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bottle_keep_holders
    ADD CONSTRAINT bottle_keep_holders_bottle_keep_id_profile_id_key UNIQUE (bottle_keep_id, profile_id);


--
-- Name: bottle_keep_holders bottle_keep_holders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bottle_keep_holders
    ADD CONSTRAINT bottle_keep_holders_pkey PRIMARY KEY (id);


--
-- Name: bottle_keeps bottle_keeps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bottle_keeps
    ADD CONSTRAINT bottle_keeps_pkey PRIMARY KEY (id);


--
-- Name: cms_entries cms_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entries
    ADD CONSTRAINT cms_entries_pkey PRIMARY KEY (id);


--
-- Name: menu_categories menu_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_pkey PRIMARY KEY (id);


--
-- Name: menu_categories menu_categories_store_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_store_id_name_key UNIQUE (store_id, name);


--
-- Name: menus menus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_pkey PRIMARY KEY (id);


--
-- Name: past_employments past_employments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.past_employments
    ADD CONSTRAINT past_employments_pkey PRIMARY KEY (id);


--
-- Name: comment_likes profile_comment_likes_comment_id_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT profile_comment_likes_comment_id_profile_id_key UNIQUE (comment_id, profile_id);


--
-- Name: comment_likes profile_comment_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT profile_comment_likes_pkey PRIMARY KEY (id);


--
-- Name: comments profile_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT profile_comments_pkey PRIMARY KEY (id);


--
-- Name: profile_relationships profile_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_relationships
    ADD CONSTRAINT profile_relationships_pkey PRIMARY KEY (id);


--
-- Name: profile_relationships profile_relationships_source_profile_id_target_profile_id_r_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_relationships
    ADD CONSTRAINT profile_relationships_source_profile_id_target_profile_id_r_key UNIQUE (source_profile_id, target_profile_id, relationship_type);


--
-- Name: profiles profiles_invite_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_invite_token_key UNIQUE (invite_token);


--
-- Name: profiles profiles_line_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_line_user_id_key UNIQUE (line_user_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_store_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_store_id_key UNIQUE (user_id, store_id);


--
-- Name: store_roles store_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_roles
    ADD CONSTRAINT store_roles_pkey PRIMARY KEY (id);


--
-- Name: store_roles store_roles_store_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_roles
    ADD CONSTRAINT store_roles_store_id_name_key UNIQUE (store_id, name);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: time_cards time_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_cards
    ADD CONSTRAINT time_cards_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: cms_entries_status_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_entries_status_published_at_idx ON public.cms_entries USING btree (status, published_at DESC);


--
-- Name: cms_entries_type_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cms_entries_type_slug_key ON public.cms_entries USING btree (type, slug);


--
-- Name: cms_entries_type_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_entries_type_status_idx ON public.cms_entries USING btree (type, status);


--
-- Name: idx_bottle_keep_holders_bottle_keep_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bottle_keep_holders_bottle_keep_id ON public.bottle_keep_holders USING btree (bottle_keep_id);


--
-- Name: idx_bottle_keep_holders_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bottle_keep_holders_profile_id ON public.bottle_keep_holders USING btree (profile_id);


--
-- Name: idx_bottle_keeps_menu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bottle_keeps_menu_id ON public.bottle_keeps USING btree (menu_id);


--
-- Name: idx_bottle_keeps_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bottle_keeps_store_id ON public.bottle_keeps USING btree (store_id);


--
-- Name: idx_comment_likes_comment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes USING btree (comment_id);


--
-- Name: idx_comment_likes_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_likes_profile_id ON public.comment_likes USING btree (profile_id);


--
-- Name: idx_comments_bottle_keep_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_bottle_keep_id ON public.comments USING btree (target_bottle_keep_id);


--
-- Name: idx_menu_categories_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_categories_store_id ON public.menu_categories USING btree (store_id);


--
-- Name: idx_menus_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menus_store_id ON public.menus USING btree (store_id);


--
-- Name: idx_profiles_approval_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_approval_status ON public.profiles USING btree (approval_status);


--
-- Name: idx_profiles_invite_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_invite_token ON public.profiles USING btree (invite_token);


--
-- Name: idx_profiles_line_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_line_user_id ON public.profiles USING btree (line_user_id);


--
-- Name: idx_profiles_store_approval; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_store_approval ON public.profiles USING btree (store_id, approval_status);


--
-- Name: idx_users_current_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_current_profile_id ON public.users USING btree (current_profile_id);


--
-- Name: idx_users_primary_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_primary_email ON public.users USING btree (primary_email);


--
-- Name: cms_entries set_cms_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_cms_entries_updated_at BEFORE UPDATE ON public.cms_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bottle_keep_holders bottle_keep_holders_bottle_keep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bottle_keep_holders
    ADD CONSTRAINT bottle_keep_holders_bottle_keep_id_fkey FOREIGN KEY (bottle_keep_id) REFERENCES public.bottle_keeps(id) ON DELETE CASCADE;


--
-- Name: bottle_keep_holders bottle_keep_holders_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bottle_keep_holders
    ADD CONSTRAINT bottle_keep_holders_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: bottle_keeps bottle_keeps_menu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bottle_keeps
    ADD CONSTRAINT bottle_keeps_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES public.menus(id) ON DELETE CASCADE;


--
-- Name: bottle_keeps bottle_keeps_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bottle_keeps
    ADD CONSTRAINT bottle_keeps_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: comment_likes comment_likes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: comments comments_author_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_profile_id_fkey FOREIGN KEY (author_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: comments comments_target_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_target_profile_id_fkey FOREIGN KEY (target_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: menu_categories menu_categories_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: menus menus_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.menu_categories(id) ON DELETE SET NULL;


--
-- Name: menus menus_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: past_employments past_employments_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.past_employments
    ADD CONSTRAINT past_employments_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: comment_likes profile_comment_likes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT profile_comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comment_likes profile_comment_likes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT profile_comment_likes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: comments profile_comments_author_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT profile_comments_author_profile_id_fkey FOREIGN KEY (author_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: comments profile_comments_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT profile_comments_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: comments profile_comments_target_bottle_keep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT profile_comments_target_bottle_keep_id_fkey FOREIGN KEY (target_bottle_keep_id) REFERENCES public.bottle_keeps(id) ON DELETE CASCADE;


--
-- Name: comments profile_comments_target_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT profile_comments_target_profile_id_fkey FOREIGN KEY (target_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profile_relationships profile_relationships_source_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_relationships
    ADD CONSTRAINT profile_relationships_source_profile_id_fkey FOREIGN KEY (source_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profile_relationships profile_relationships_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_relationships
    ADD CONSTRAINT profile_relationships_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: profile_relationships profile_relationships_target_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_relationships
    ADD CONSTRAINT profile_relationships_target_profile_id_fkey FOREIGN KEY (target_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.store_roles(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: store_roles store_roles_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_roles
    ADD CONSTRAINT store_roles_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: time_cards time_cards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_cards
    ADD CONSTRAINT time_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: users users_current_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_current_profile_id_fkey FOREIGN KEY (current_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: CONSTRAINT users_current_profile_id_fkey ON users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT users_current_profile_id_fkey ON public.users IS 'Set current_profile_id to null when profile is deleted';


--
-- Name: cms_entries Admin/editor manage cms_entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/editor manage cms_entries" ON public.cms_entries USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::text, 'editor'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::text, 'editor'::text]))))));


--
-- Name: time_cards Admins and Staff can view all time cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Staff can view all time cards" ON public.time_cards FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'staff'::text]))))));


--
-- Name: stores Admins can delete stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete stores" ON public.stores FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.store_id = stores.id) AND (profiles.role = 'admin'::text)))));


--
-- Name: stores Admins can insert/update stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert/update stores" ON public.stores FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.profiles
     LEFT JOIN public.store_roles ON ((profiles.role_id = store_roles.id)))
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.store_id = stores.id) AND ((profiles.role = 'admin'::text) OR (((store_roles.permissions ->> 'can_manage_settings'::text))::boolean = true))))));


--
-- Name: store_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.store_roles USING (public.has_permission(store_id, 'can_manage_roles'::text));


--
-- Name: stores Admins can update stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update stores" ON public.stores FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.store_id = stores.id) AND (profiles.role = 'admin'::text)))));


--
-- Name: profiles Allow staff to update role_id in same store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow staff to update role_id in same store" ON public.profiles FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles current_user_profile
  WHERE ((current_user_profile.user_id = auth.uid()) AND (current_user_profile.store_id = profiles.store_id) AND (current_user_profile.role = 'staff'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles current_user_profile
  WHERE ((current_user_profile.user_id = auth.uid()) AND (current_user_profile.store_id = profiles.store_id) AND (current_user_profile.role = 'staff'::text)))));


--
-- Name: profiles Allow users to read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to read own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Allow users to update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Anyone can view profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);


--
-- Name: stores Authenticated users can create stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create stores" ON public.stores FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: menu_categories Enable delete for staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for staff" ON public.menu_categories FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.store_id = menu_categories.store_id) AND ((profiles.role = 'staff'::text) OR (profiles.role = 'admin'::text))))));


--
-- Name: menu_categories Enable insert for staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for staff" ON public.menu_categories FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.store_id = menu_categories.store_id) AND ((profiles.role = 'staff'::text) OR (profiles.role = 'admin'::text))))));


--
-- Name: menu_categories Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.menu_categories FOR SELECT USING (true);


--
-- Name: menu_categories Enable update for staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for staff" ON public.menu_categories FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.store_id = menu_categories.store_id) AND ((profiles.role = 'staff'::text) OR (profiles.role = 'admin'::text))))));


--
-- Name: profiles Public profiles are viewable by everyone.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);


--
-- Name: cms_entries Public read published cms_entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read published cms_entries" ON public.cms_entries FOR SELECT USING (((status = 'published'::text) AND ((published_at IS NULL) OR (published_at <= now()))));


--
-- Name: profiles Staff can delete profiles in their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can delete profiles in their store" ON public.profiles FOR DELETE USING (((store_id IN ( SELECT profiles_1.store_id
   FROM public.profiles profiles_1
  WHERE (profiles_1.id IN ( SELECT users.current_profile_id
           FROM public.users
          WHERE (users.id = auth.uid()))))) AND (EXISTS ( SELECT 1
   FROM public.profiles profiles_1
  WHERE ((profiles_1.id IN ( SELECT users.current_profile_id
           FROM public.users
          WHERE (users.id = auth.uid()))) AND (profiles_1.role = 'staff'::text)))) AND (NOT (id IN ( SELECT users.current_profile_id
   FROM public.users
  WHERE (users.id = auth.uid()))))));


--
-- Name: past_employments Staff can view all past employments in their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all past employments in their store" ON public.past_employments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p1
  WHERE ((p1.user_id = auth.uid()) AND (p1.role = ANY (ARRAY['staff'::text, 'admin'::text])) AND (p1.store_id = ( SELECT profiles.store_id
           FROM public.profiles
          WHERE (profiles.id = past_employments.profile_id)))))));


--
-- Name: profiles Store admins can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Store admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.has_permission(store_id, 'can_manage_users'::text));


--
-- Name: profiles Store admins can update profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Store admins can update profiles" ON public.profiles FOR UPDATE USING (public.has_permission(store_id, 'can_manage_users'::text));


--
-- Name: store_roles Store members can view roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Store members can view roles" ON public.store_roles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.store_id = store_roles.store_id)))));


--
-- Name: stores Stores are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Stores are viewable by everyone" ON public.stores FOR SELECT USING (true);


--
-- Name: bottle_keep_holders Users can delete bottle keep holders of their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete bottle keep holders of their store" ON public.bottle_keep_holders FOR DELETE USING ((bottle_keep_id IN ( SELECT bottle_keeps.id
   FROM public.bottle_keeps
  WHERE (bottle_keeps.store_id IN ( SELECT profiles.store_id
           FROM public.profiles
          WHERE (profiles.id IN ( SELECT users.current_profile_id
                   FROM public.users
                  WHERE (users.id = auth.uid()))))))));


--
-- Name: bottle_keeps Users can delete bottle keeps of their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete bottle keeps of their store" ON public.bottle_keeps FOR DELETE USING ((store_id IN ( SELECT profiles.store_id
   FROM public.profiles
  WHERE (profiles.id IN ( SELECT users.current_profile_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: menus Users can delete menus of their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete menus of their store" ON public.menus FOR DELETE USING ((store_id IN ( SELECT profiles.store_id
   FROM public.profiles
  WHERE (profiles.id IN ( SELECT users.current_profile_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: profile_relationships Users can delete relationships in their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete relationships in their store" ON public.profile_relationships FOR DELETE USING ((store_id IN ( SELECT profiles.store_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) OR (profiles.user_id = auth.uid())))));


--
-- Name: comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING ((author_profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: comment_likes Users can delete their own likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own likes" ON public.comment_likes FOR DELETE USING (((profile_id = auth.uid()) OR (profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())))));


--
-- Name: time_cards Users can delete time cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete time cards" ON public.time_cards FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND ((time_cards.user_id = u.current_profile_id) OR (time_cards.user_id = u.id))))) OR (EXISTS ( SELECT 1
   FROM ((public.profiles p
     JOIN public.users u ON ((u.current_profile_id = p.id)))
     JOIN public.profiles target ON ((target.id = time_cards.user_id)))
  WHERE ((u.id = auth.uid()) AND (p.store_id = target.store_id) AND (p.role = ANY (ARRAY['admin'::text, 'staff'::text])))))));


--
-- Name: bottle_keep_holders Users can insert bottle keep holders to their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert bottle keep holders to their store" ON public.bottle_keep_holders FOR INSERT WITH CHECK ((bottle_keep_id IN ( SELECT bottle_keeps.id
   FROM public.bottle_keeps
  WHERE (bottle_keeps.store_id IN ( SELECT profiles.store_id
           FROM public.profiles
          WHERE (profiles.id IN ( SELECT users.current_profile_id
                   FROM public.users
                  WHERE (users.id = auth.uid()))))))));


--
-- Name: bottle_keeps Users can insert bottle keeps to their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert bottle keeps to their store" ON public.bottle_keeps FOR INSERT WITH CHECK ((store_id IN ( SELECT profiles.store_id
   FROM public.profiles
  WHERE (profiles.id IN ( SELECT users.current_profile_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: comments Users can insert comments in their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert comments in their store" ON public.comments FOR INSERT WITH CHECK ((store_id IN ( SELECT profiles.store_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) OR (profiles.user_id = auth.uid())))));


--
-- Name: comment_likes Users can insert likes in their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert likes in their store" ON public.comment_likes FOR INSERT WITH CHECK ((comment_id IN ( SELECT comments.id
   FROM public.comments
  WHERE (comments.store_id IN ( SELECT profiles.store_id
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) OR (profiles.user_id = auth.uid())))))));


--
-- Name: menus Users can insert menus to their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert menus to their store" ON public.menus FOR INSERT WITH CHECK ((store_id IN ( SELECT profiles.store_id
   FROM public.profiles
  WHERE (profiles.id IN ( SELECT users.current_profile_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: profile_relationships Users can insert relationships in their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert relationships in their store" ON public.profile_relationships FOR INSERT WITH CHECK ((store_id IN ( SELECT profiles.store_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) OR (profiles.user_id = auth.uid())))));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: users Users can insert their own row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own row" ON public.users FOR INSERT WITH CHECK ((id = auth.uid()));


--
-- Name: time_cards Users can insert their own time cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own time cards" ON public.time_cards FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND ((time_cards.user_id = u.current_profile_id) OR (time_cards.user_id = u.id))))) OR (EXISTS ( SELECT 1
   FROM ((public.profiles p
     JOIN public.users u ON ((u.current_profile_id = p.id)))
     JOIN public.profiles target ON ((target.id = time_cards.user_id)))
  WHERE ((u.id = auth.uid()) AND (p.store_id = target.store_id) AND (p.role = ANY (ARRAY['admin'::text, 'staff'::text])))))));


--
-- Name: time_cards Users can insert/update their own time cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert/update their own time cards" ON public.time_cards USING ((auth.uid() = user_id));


--
-- Name: time_cards Users can manage own time cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own time cards" ON public.time_cards USING ((auth.uid() = user_id));


--
-- Name: past_employments Users can manage their own past employments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own past employments" ON public.past_employments USING ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: bottle_keeps Users can update bottle keeps of their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update bottle keeps of their store" ON public.bottle_keeps FOR UPDATE USING ((store_id IN ( SELECT profiles.store_id
   FROM public.profiles
  WHERE (profiles.id IN ( SELECT users.current_profile_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: menus Users can update menus of their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update menus of their store" ON public.menus FOR UPDATE USING ((store_id IN ( SELECT profiles.store_id
   FROM public.profiles
  WHERE (profiles.id IN ( SELECT users.current_profile_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: comments Users can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING ((author_profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())))) WITH CHECK ((author_profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: users Users can update their own row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own row" ON public.users FOR UPDATE USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: bottle_keep_holders Users can view bottle keep holders of their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view bottle keep holders of their store" ON public.bottle_keep_holders FOR SELECT USING ((bottle_keep_id IN ( SELECT bottle_keeps.id
   FROM public.bottle_keeps
  WHERE (bottle_keeps.store_id IN ( SELECT profiles.store_id
           FROM public.profiles
          WHERE (profiles.id IN ( SELECT users.current_profile_id
                   FROM public.users
                  WHERE (users.id = auth.uid()))))))));


--
-- Name: bottle_keeps Users can view bottle keeps of their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view bottle keeps of their store" ON public.bottle_keeps FOR SELECT USING ((store_id IN ( SELECT profiles.store_id
   FROM public.profiles
  WHERE (profiles.id IN ( SELECT users.current_profile_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: comments Users can view comments in their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view comments in their store" ON public.comments FOR SELECT USING ((store_id IN ( SELECT profiles.store_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) OR (profiles.user_id = auth.uid())))));


--
-- Name: comment_likes Users can view likes in their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view likes in their store" ON public.comment_likes FOR SELECT USING ((comment_id IN ( SELECT comments.id
   FROM public.comments
  WHERE (comments.store_id IN ( SELECT profiles.store_id
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) OR (profiles.user_id = auth.uid())))))));


--
-- Name: menus Users can view menus of their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view menus of their store" ON public.menus FOR SELECT USING ((store_id IN ( SELECT profiles.store_id
   FROM public.profiles
  WHERE (profiles.id IN ( SELECT users.current_profile_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: time_cards Users can view own time cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own time cards" ON public.time_cards FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profile_relationships Users can view relationships in their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view relationships in their store" ON public.profile_relationships FOR SELECT USING ((store_id IN ( SELECT profiles.store_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) OR (profiles.user_id = auth.uid())))));


--
-- Name: past_employments Users can view their own past employments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own past employments" ON public.past_employments FOR SELECT USING ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: time_cards Users can view their own time cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own time cards" ON public.time_cards FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: users Users can view their own user record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own user record" ON public.users FOR SELECT USING ((auth.uid() = id));


--
-- Name: bottle_keep_holders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bottle_keep_holders ENABLE ROW LEVEL SECURITY;

--
-- Name: bottle_keeps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bottle_keeps ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: comment_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: menus; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

--
-- Name: past_employments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.past_employments ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_relationships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_relationships ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: store_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: stores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

--
-- Name: time_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.time_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: time_cards time_cards_insert_via_profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_cards_insert_via_profile ON public.time_cards FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = time_cards.user_id) AND (p.user_id = auth.uid())))));


--
-- Name: time_cards time_cards_select_via_profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_cards_select_via_profile ON public.time_cards FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = time_cards.user_id) AND (p.user_id = auth.uid())))));


--
-- Name: time_cards time_cards_update_via_profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_cards_update_via_profile ON public.time_cards FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = time_cards.user_id) AND (p.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = time_cards.user_id) AND (p.user_id = auth.uid())))));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict 9e1zv4VH4VFJDMT1Wab56kR1vNzmi6eIsiNiWWfzMqUbadkgW3zaQgm1bbjbEGg

