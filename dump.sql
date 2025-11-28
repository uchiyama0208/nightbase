--
-- PostgreSQL database dump
--

\restrict 1yHfuQZJEBNhbyGeeh7isjAiv9eLH8Dw3hTeuktcyUQYaegdNjeRBk0gTUt0s9c

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
fad40aa9-0fed-4f38-ab5b-efc5a5840929	blog	zr4zx87d	ブログ１	## 見出し 2\n\n### 見出し 3\n\nテキスト	リード文	{お知らせ}	\N	published	2025-11-18 20:15:21.48+00	2025-11-18 20:16:53.519824+00	2025-11-18 20:16:53.519824+00	\N
fa4b2387-573e-48a5-bec6-36e816869706	blog	hwste46d	【保存版】キャバクラ経営の売上を最大化する方法  	# 【保存版】キャバクラ経営の売上を最大化する方法\n成功店舗が導入している“データ経営”とは？\n\n---\n\n## 目次\n\n- [キャバクラ業界は「勘と経験」から「データ経営」へ](#キャバクラ業界は勘と経験からデータ経営へ)\n- [売上が伸び続ける店舗の共通点](#売上が伸び続ける店舗の共通点)\n- [キャバクラ経営で発生しがちな3つの課題](#キャバクラ経営で発生しがちな3つの課題)\n- [データ経営が課題をどう解決するか](#データ経営が課題をどう解決するか)\n- [キャバクラ向け店舗管理システム「NightBase」とは](#キャバクラ向け店舗管理システムnightbaseとは)\n- [NightBaseで実現できること](#nightbaseで実現できること)\n- [まとめ：経営を属人的から再現性ある成功へ](#まとめ経営を属人的から再現性ある成功へ)\n- [NightBaseの資料請求・無料相談はこちら](#nightbaseの資料請求無料相談はこちら)\n\n---\n\n## キャバクラ業界は「勘と経験」から「データ経営」へ\n\nキャバクラ経営は長く\n**「感覚」や「経験」**\nに頼るケースが多い業界でした。\n\nしかし近年の成功店では、以下のように経営を数値化しています。\n\n- 出勤データ\n- 指名・同伴数\n- 客単価\n- 稼働率\n- 顧客の来店周期\n\nこれにより、\n**“誰がいつ売上を作っているのか”が明確になり、再現性のある経営が可能**になります。\n\n---\n\n## 売上が伸び続ける店舗の共通点\n\n### **1. キャストの出勤管理が正確**\n\nシフトの最適化ができており、\n急な欠勤リスクにも素早く対応できます。\n\n### **2. 顧客データを蓄積している**\n\n- 担当キャスト\n- 来店頻度\n- 直近来店日\n- 稼働時間帯\n\nこれらを把握することで、リピート率が向上します。\n\n### **3. キャスト育成が“数字”で行われている**\n\n店長の勘に頼らず、\n客観的に育成・評価できるのが強い店舗の特徴です。\n\n---\n\n## キャバクラ経営で発生しがちな3つの課題\n\n### **1. シフト管理の複雑化**\n\nLINE・紙・エクセルが混在すると、\nダブルブッキングや認識ズレが起きがちです。\n\n### **2. キャストのモチベーション管理が難しい**\n\n成果指標が曖昧なため、\n「何を頑張ればいい？」が見えにくくなります。\n\n### **3. 顧客データが個人に依存してしまう**\n\n店長やスタッフが変わると、\n顧客情報や売上データが失われてしまいます。\n\n---\n\n## データ経営が課題をどう解決するか\n\n### **● 自動シフト最適化**\n\nキャストの希望・売上予測を元に、\n負担の少ない出勤管理が可能になります。\n\n### **● 成績の可視化**\n\n- 売上\n- 指名数\n- 同伴数\n- 稼働率\n\nすべてが自動集計され、モチベーションが持続します。\n\n### **● 顧客管理でリピート率UP**\n\n- 誕生日通知\n- 来店周期アラート\n- 担当キャストの履歴\n- 売上貢献度ランキング\n\nデータを活用することで、\n効率的に再来店を促す仕組みができます。\n\n---\n\n## キャバクラ向け店舗管理システム「NightBase」とは\n\n**NightBase（ナイトベース）**は、\nキャバクラ・ラウンジ・バーなど“夜職特化”の店舗管理システムです。\n\n以下の機能をすべてスマホ1つで管理できます。\n\n- シフト管理\n- 売上管理\n- キャスト評価\n- 顧客管理\n- 支払/締め作業\n- 店舗分析\n\n---\n\n## NightBaseで実現できること\n\n### **1. スマホだけでシフト管理**\n\n- キャストが自分で出勤申請\n- 自動で最適シフトを生成\n- 欠勤の早期アラート\n- グループ店舗管理も可能\n\n### **2. キャスト成績が自動で可視化**\n\n- 指名・同伴数\n- 売上\n- 稼働率\n- 接客評価\n\n人気キャストの行動データは、\n新人教育にもそのまま活かせます。\n\n### **3. 顧客管理ですべてを一元化**\n\n- 来店履歴\n- 担当キャスト\n- 来店頻度\n- 売上貢献度\n- 誕生日自動通知\n\nリピート率を上げる仕組みが整います。\n\n### **4. 店舗の経営状況がリアルタイムで可視化**\n\n- 日次・週次・月次の売上\n- 客単価\n- キャストごとの売上\n- ピーク時間帯\n- コスト分析\n\n経営判断のスピードが大幅に向上します。\n\n---\n\n## まとめ：経営を“属人的”から“再現性ある成功”へ\n\nキャバクラ経営の悩みの多くは、\n**「人に依存しすぎる」「データが残らない」**\nという点に集約されます。\n\nNightBaseを導入することで、\n\n- シフト\n- 売上\n- 顧客\n- キャスト評価\n- 店舗分析\n\nがすべてデジタル化され、\n**誰でも成功店舗のオペレーションを再現できるようになります。**\n\n---\n\n## NightBaseの資料請求・無料相談はこちら\n\n👉 **NightBase – 無料デモ申し込み・資料ダウンロード**\n（※URLをここに追記）\n\n- 導入前の相談無料\n- 店舗課題の簡易診断つき\n- 初期サポート無料	成功店舗が導入している“データ経営”とは？	\N	https://uxqenmpdixeqzjvolpkm.supabase.co/storage/v1/object/public/public-assets/blog/1763540841044-rlnzb9zmph.png	published	2025-11-19 08:27:12.438+00	2025-11-19 08:27:45.525213+00	2025-11-19 08:40:50.783072+00	\N
685313b4-6b25-4b13-a48c-d6c55c30849a	case_study	znj6ap11	NightBase導入で売上170％アップ 	# 【導入事例】NightBase導入で売上170％アップ  \n六本木キャバクラ「Club Lapis」のデータ経営ストーリー\n\n---\n\n## 目次\n- [店舗概要](#店舗概要)\n- [導入前の課題](#導入前の課題)\n- [NightBase導入の決め手](#nightbase導入の決め手)\n- [導入後3か月の効果](#導入後3か月の効果)\n- [スタッフ・キャストの声](#スタッフキャストの声)\n- [今後の展望](#今後の展望)\n- [NightBase担当者コメント](#nightbase担当者コメント)\n- [あなたの店舗でも同じ効果を出しませんか](#あなたの店舗でも同じ効果を出しませんか)\n\n---\n\n## 店舗概要\n\n**店舗名**：Club Lapis（クラブ ラピス）  \n**エリア**：六本木  \n**業態**：キャバクラ  \n**席数**：40席  \n**在籍キャスト**：25名（レギュラー15名 / アルバイト10名）  \n**営業年数**：3年  \n\n> 「六本木らしい落ち着いた高級感を出しつつ、20〜30代のビジネスマンを中心に集客しているキャバクラです。」\n\n---\n\n## 導入前の課題\n\nClub Lapisでは、NightBase導入前に以下のような課題を抱えていました。\n\n### 1. シフト管理がLINEとExcelでぐちゃぐちゃ\n\n- キャストからの出勤連絡は**すべてLINE**  \n- 店側はExcelでシフトを管理  \n- 反映漏れやダブルブッキングが発生  \n\n特に、**週末の欠勤・遅刻対応**で店長とマネージャーが疲弊していました。\n\n> 「誰が本当に出勤するのか、当日まで読めないのが一番のストレスでした。（店長）」\n\n### 2. キャストの成績が感覚評価になっていた\n\n- 指名数や同伴数は、日報やレジ締めを見てざっくり把握  \n- 「あの子は頑張っている気がする」「最近伸び悩んでいるよね」と**感覚ベースの評価**  \n- キャストからは「自分が何を頑張ればいいか分からない」という声も\n\n### 3. 顧客データがスタッフ個人のスマホにバラバラ\n\n- お客様の連絡先は、キャストやボーイのスマホ、ノート、Excelなどに散在  \n- 退職や異動があると**顧客情報ごと消えてしまう**  \n- 再来店施策が打ちづらく、売上の波が激しい状態でした。\n\n---\n\n## NightBase導入の決め手\n\nそんな中、オーナーがNightBaseを知ったきっかけは、  \n**同じ六本木エリアの知り合いママからの紹介**でした。\n\n> 「シフトも売上も顧客も全部スマホで見られるよ」  \n> と聞いて、まずは話だけでも聞いてみようと思いました。（オーナー）\n\n### 導入の決め手となったポイント\n\n1. **夜職特化のシステムであること**  \n   - キャバクラ・ラウンジの運用に最初からフィットしていた\n\n2. **シフト・売上・顧客がオールインワン**  \n   - 別々のツールを使い分ける必要がない\n\n3. **スマホ完結で操作が簡単**  \n   - キャストが直感的に使えそうだと感じた\n\n4. **サポートが手厚い**  \n   - 初期設定や移行作業もNightBase側がしっかりサポート\n\n---\n\n## 導入後3か月の効果\n\nNightBaseを導入して3か月。  \nClub Lapisでは、数字として分かりやすい変化が現れました。\n\n### 1. 売上が約170％にアップ\n\n- 導入前3か月平均：**売上 100％（基準）**  \n- 導入後3か月平均：**売上 170％**  \n\n主な要因は以下の通りです。\n\n- リピート率の向上（顧客管理＋誕生日/来店間隔アラート機能）  \n- 売れる曜日・時間帯へのキャスト配置最適化  \n- 指名数の多いキャストに合わせたイベント設計  \n\n### 2. シフト関連のトラブルが約70％減少\n\n- 出勤希望・確定シフトは全てNightBase上で管理  \n- 週末の欠勤・遅刻にも、**代わりのキャスト候補がすぐに検索可能**  \n- 店長・マネージャーの業務時間が1日1〜2時間削減\n\n> 「シフト調整の電話やLINEが激減しました。  \n> 今はアプリを見れば状況が一目で分かるので、当日運営に集中できています。（店長）」\n\n### 3. キャストのモチベーションアップ\n\nNightBaseの「キャスト成績ダッシュボード」を導入したことで、\n\n- 日ごと/週ごとの指名・同伴数  \n- 売上ランキング  \n- 個人目標の達成率  \n\nが、キャスト自身のスマホから確認できるように。\n\n> 「ゲーム感覚で数字を追えるようになって、  \n> '今月は同伴10本がんばろう' みたいな目標を自分から立てる子が増えました。（マネージャー）」\n\n---\n\n## スタッフ・キャストの声\n\n### オーナーの声\n\n> 「数字で見ると、感覚でやっていた頃のムダがよく分かりました。  \n>  指名も同伴も、どの施策が効いているのか一目で分かるので、  \n>  いまは“当たり施策”だけに集中できています。」\n\n### 店長の声\n\n> 「シフト表づくりから解放されたのが一番大きいです。  \n>  以前は金曜・土曜の前になると胃が痛くなっていたのですが（笑）、  \n>  今はNightBaseを見ながら、足りないところだけピンポイントで調整すればOKです。」\n\n### キャスト Aさんの声\n\n> 「自分の数字がグラフになって見えるのが嬉しいです。  \n>  先月より指名が増えているのが分かるとやる気が出るし、  \n>  同伴が少ないときは、どう動けばいいか店長に相談しやすくなりました。」\n\n---\n\n## 今後の展望\n\nClub Lapisでは、今後さらにNightBaseを活用していく予定です。\n\n- 新人キャストの研修に、NightBaseのデータを活用  \n- 売上の良い曜日・悪い曜日の分析をもとにしたイベント設計  \n- グループ店を増やした際の、多店舗管理にもNightBaseを採用予定  \n\n> 「NightBaseを前提にしたオペレーションを組めば、  \n>  新店舗を出しても同じクオリティで運営できると感じています。（オーナー）」\n\n---\n\n## NightBase担当者コメント\n\nNightBase導入担当より：\n\n> 「Club Lapis様は、  \n>  “まずはシフト管理だけ”というスモールスタートから始まり、  \n>  その後、売上管理・顧客管理へと順番に機能を広げていきました。  \n>  一気に全部変えるのではなく、  \n>  店舗のペースに合わせて段階的に導入されたことが、  \n>  成功要因のひとつだと考えています。」\n\n---\n\n## あなたの店舗でも同じ効果を出しませんか？\n\nNightBaseでは、**キャバクラ・ラウンジ・バー専門**の店舗管理システムとして、  \nこれまで多くの店舗の売上アップと業務効率化をサポートしてきました。\n\n- シフト管理の手間を減らしたい  \n- キャストの成績を数字で見える化したい  \n- 顧客データをしっかり蓄積してリピート率を上げたい  \n- 将来の多店舗展開を見据えて、今から仕組みを整えたい  \n\nこういったお悩みがあれば、  \nまずは一度、NightBaseのデモをご覧ください。\n\n👉 **NightBase – 無料デモ・資料ダウンロードはこちら**  \n（※あなたのLP / お問い合わせフォームのURLをここに挿入）\n\n- 初期導入サポート無料  \n- 今の運用に合わせた「段階的導入プラン」もご提案可能です  \n\n**次に導入事例として紹介されるのは、あなたの店舗かもしれません。**\n	六本木キャバクラ「Club Lapis」のデータ経営ストーリー	{キャバクラ}	https://uxqenmpdixeqzjvolpkm.supabase.co/storage/v1/object/public/public-assets/case-studies/1763546294914-v7qxs1chkml.png	published	2025-11-19 09:58:09.417+00	2025-11-19 09:59:27.23034+00	2025-11-19 09:59:27.23034+00	\N
1171411e-ab48-449e-a9d0-9de7e95efe2c	manual	856iq0de	ログイン	# NightBase アプリ操作マニュアル  \nキャバクラ・ラウンジ店舗向け｜はじめての方へ\n\nNightBase（ナイトベース）は、夜職店舗専用の総合管理アプリです。  \nこのページでは、**はじめて使う方向けに基本操作をまとめています。**\n\n---\n\n## 目次\n- [ログイン](#ログイン)\n- [ホーム画面の見方](#ホーム画面の見方)\n- [シフト管理](#シフト管理)\n  - [キャストの出勤申請](#キャストの出勤申請)\n  - [店舗側のシフト確定](#店舗側のシフト確定)\n  - [急な欠勤対応](#急な欠勤対応)\n- [売上入力と確認](#売上入力と確認)\n  - [キャストの売上入力](#キャストの売上入力)\n  - [日別/週別レポート](#日別週別レポート)\n- [顧客管理](#顧客管理)\n  - [新規顧客の登録](#新規顧客の登録)\n  - [既存顧客のステータス](#既存顧客のステータス)\n  - [来店アラート機能](#来店アラート機能)\n- [キャスト評価システム](#キャスト評価システム)\n- [店舗アナリティクス](#店舗アナリティクス)\n- [よくある質問](#よくある質問)\n- [サポート窓口](#サポート窓口)\n\n---\n\n## ログイン\n\n1. アプリを開き、「ログイン」をタップ  \n2. 付与された **店舗コード（例：NB-ROPP-01）** を入力  \n3. 電話番号またはメールアドレスを入力  \n4. SMS/メールに届いた認証コードを入力して完了\n\n> ※はじめてのログイン時は、プロフィール登録が必要です。\n\n---\n\n## ホーム画面の見方\n\nホーム画面では、以下の情報をひと目で確認できます。\n\n- 今日の出勤キャスト一覧  \n- 本日の見込み売上  \n- 予約席・ボトルキープ情報  \n- 出勤管理アラート  \n- キャストの個人成績（ランキング）\n\nホーム画面上部には **「昨日との売上比較」** が自動で表示されます。\n\n---\n\n## シフト管理\n\n### キャストの出勤申請\n\n1. ホーム画面 → **「出勤申請」**  \n2. カレンダーから出勤したい日を選択  \n3. 「出勤希望を送信」をタップ  \n4. 店側の承認待ちになります\n\n> 店舗側が承認すると、アプリに通知が届きます。\n\n---\n\n### 店舗側のシフト確定\n\n1. 管理者メニュー → **「シフト管理」**  \n2. 希望一覧からキャストの出勤可否を選択  \n3. 人数が足りない日は「おすすめキャスト候補」が自動表示  \n4. シフトを確定すると全キャストに自動通知\n\n---\n\n### 急な欠勤対応\n\n「欠勤報告」がキャストから来た場合、  \nアプリが自動で以下を提案します：\n\n- 調整可能なキャスト一覧  \n- 稼働可能な近隣店舗のヘルプ候補  \n- 過去の稼働実績からおすすめキャストをAI提案\n\n1タップで代わりのキャストへ通知できます。\n\n---\n\n## 売上入力と確認\n\n### キャストの売上入力\n\n1. ホーム → **「売上入力」**  \n2. 指名 / 同伴 / ドリンク / ボトル の入力欄  \n3. 小計が自動計算され、日報へ反映\n\n---\n\n### 日別/週別レポート\n\n管理者は、以下のレポートを確認できます：\n\n- 売上合計  \n- 客単価  \n- 指名数ランキング  \n- キャスト別売上  \n- ピーク時間帯分析  \n- コスト比率\n\n> 店舗の課題を一目で把握できます。\n\n---\n\n## 顧客管理\n\n### 新規顧客の登録\n\n1. **「顧客管理」 → 「新規作成」**  \n2. 名前 / 担当キャスト / 来店初日 を入力  \n3. 写真・LINEID なども任意で登録可能\n\n---\n\n### 既存顧客のステータス\n\n顧客一覧には、以下のステータスが表示されます：\n\n- **Sランク**（売上貢献が高い）  \n- **Aランク**  \n- **Bランク**  \n- **Cランク**（来店間隔が空いている）  \n- **休眠顧客**（30日以上来店なし）\n\n---\n\n### 来店アラート機能\n\n- 誕生日1週間前  \n- 前回来店から20日経過  \n- 月初リピート強化アラート  \n\nこれらは自動で担当キャストに通知されます。\n\n---\n\n## キャスト評価システム\n\n評価は自動で算出されます：\n\n- 指名本数  \n- 同伴数  \n- 売上総額  \n- 出勤率  \n- 接客評価（店舗独自設定OK）\n\n評価は **S / A / B / C** の4段階で表示。  \n月末に自動レポートも生成されます。\n\n---\n\n## 店舗アナリティクス\n\nオーナー・管理者向けの高機能分析画面です。\n\n### 確認できるデータ\n- 売上推移（前年比/前月比）  \n- キャスト別売上構成  \n- ピーク時間帯分析  \n- 高単価顧客の行動傾向  \n- ボトル消化率  \n- イベント効果測定  \n\n> 「どのキャストをどの曜日に配置すべきか」  \n> まで自動提案されます。\n\n---\n\n## よくある質問\n\n### Q. キャストのスマホでも使えますか？  \nA. はい。iPhone・Androidどちらでも利用可能です。\n\n### Q. アプリのデータはどこに保存されますか？  \nA. セキュアなサーバーで暗号化されて保存されます。\n\n### Q. レジ機能はありますか？  \nA. 近日アップデートで提供予定です。（架空設定OK）\n\n---\n\n## サポート窓口\n\n以下よりサポートへご連絡いただけます。\n\n- **アプリ内チャットサポート（24時間対応）**  \n- **メール：support@nightbase.app**  \n- **電話：03-xxxx-xxxx（10:00〜24:00）**\n\n導入の初期設定、キャストの使い方説明、データ移行などもサポートしています。\n\n---\n\n	ログイン方法について説明します。	\N	https://uxqenmpdixeqzjvolpkm.supabase.co/storage/v1/object/public/public-assets/manuals/1763552951617-oc065mmuwa.png	published	2025-11-19 11:06:59.88+00	2025-11-19 11:49:20.833676+00	2025-11-19 11:49:20.833676+00	\N
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
3047ac8c-6b5b-4f82-8829-1da2f068b89a	5a0f97bd-90f4-4426-a22c-8bbf615e1998	りょうじ	staff	2025-11-28 14:13:40.679909+00	2025-11-28 14:13:40.679909+00	https://profile.line-scdn.net/0hSDY4z3yNDGt0TRlvpDZyFAQdDwFXPFV5XykUDUBJVA8Ze09qXywTDRRIAFNKLks8DH4QWBFMV1t4XnsNahvwX3N9UVpIdE84XitLhQ	\N			16183127-aac4-4eb3-9c99-e235a071be53	4c6c7696-9b47-4864-95fc-6e3c240db987	りょうじ	light	\N	none	approved	U3e18e1944fec2b61f23d764e24260fc2	485e7e10-ad28-4139-8328-b93c1d381389	pending	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	通常
0d321e0e-a1a5-4872-8027-991678d79fa7	\N	いいのまさき	staff	2025-11-28 14:18:08.513114+00	2025-11-28 14:18:08.513114+00	\N	\N			16183127-aac4-4eb3-9c99-e235a071be53	\N	いいのまさき	light	\N	none	approved	\N	54913f5f-f4bc-490a-adfe-7297098d650b	pending	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	通常
881c9035-295d-4689-ba09-e310f6bcdb2c	\N	うじこ	staff	2025-11-28 14:18:08.513114+00	2025-11-28 14:18:08.513114+00	\N	\N			16183127-aac4-4eb3-9c99-e235a071be53	\N	うじこ	light	\N	none	approved	\N	fa2995ba-456b-4201-adec-871e1011231e	pending	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	通常
edfeaa94-f6ab-4382-9b59-1702d56b210f	\N	りょうた	staff	2025-11-28 14:18:08.513114+00	2025-11-28 14:18:08.513114+00	\N	\N			16183127-aac4-4eb3-9c99-e235a071be53	\N	りょうた	light	\N	none	approved	\N	d4a51d61-5360-4814-afa3-5130695641d8	pending	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	通常
a47af93d-6535-4dc6-a69e-010b8698ea61	\N	じんたん	staff	2025-11-28 14:18:08.513114+00	2025-11-28 14:18:08.513114+00	\N	\N			16183127-aac4-4eb3-9c99-e235a071be53	\N	じんたん	light	\N	none	approved	\N	8ed6f09f-ef7c-43cb-a111-cb365ceb1225	pending	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	通常
b9ff8946-4a6e-486a-88ce-5d2a1f20e705	\N	くま	staff	2025-11-28 14:18:08.513114+00	2025-11-28 14:18:08.513114+00	\N	\N			16183127-aac4-4eb3-9c99-e235a071be53	\N	くま	light	\N	none	approved	\N	1a29abac-e39c-4001-bdce-ec4f50708aa2	pending	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	通常
bfb674ec-0ed8-4ce2-b74e-c182085a2c10	\N	みさか	staff	2025-11-28 14:18:08.513114+00	2025-11-28 14:18:08.513114+00	\N	\N			16183127-aac4-4eb3-9c99-e235a071be53	\N	みさか	light	\N	none	approved	\N	10423054-bb06-41ca-8910-543fee2ff5ec	pending	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	通常
6e8bafbf-5754-4753-b65f-fd760f1c8622	\N	ゆうま	staff	2025-11-28 14:18:08.513114+00	2025-11-28 14:18:08.513114+00	\N	\N			16183127-aac4-4eb3-9c99-e235a071be53	\N	ゆうま	light	\N	none	approved	\N	68d2da06-e0d7-416d-a60e-12e25f939775	pending	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	通常
1efbcd52-8b03-4591-b7c6-0288febb927f	\N	きんぐ	staff	2025-11-28 14:18:08.513114+00	2025-11-28 14:18:08.513114+00	\N	\N			16183127-aac4-4eb3-9c99-e235a071be53	\N	きんぐ	light	\N	none	approved	\N	6f5c92dd-96f7-49f0-aa9c-d78351a0b371	pending	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	通常
58e766c0-be29-46a1-b325-b2136f6a1b7b	\N	てる	staff	2025-11-28 14:18:08.513114+00	2025-11-28 14:18:08.513114+00	\N	\N			16183127-aac4-4eb3-9c99-e235a071be53	\N	てる	light	\N	none	approved	\N	6e9d425b-8c9c-4b23-88f7-bafccea57483	pending	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	通常
b2bfd54b-118d-4a64-98f4-5d3662157ee7	\N	りん	staff	2025-11-28 14:18:08.513114+00	2025-11-28 14:18:08.513114+00	\N	\N			16183127-aac4-4eb3-9c99-e235a071be53	\N	りん	light	\N	none	approved	\N	7fc7c1ca-75b1-48ee-9c62-a0176ef2c53a	pending	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	通常
8f1ca276-4b0d-4d99-a1fd-4b353711c2b9	\N	はる	staff	2025-11-28 14:18:08.513114+00	2025-11-28 14:18:08.513114+00	\N	\N			16183127-aac4-4eb3-9c99-e235a071be53	\N	はる	light	\N	none	approved	\N	23551d36-097f-4080-8736-d1d3cb8893bb	pending	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	通常
b859b1d0-5595-4dc9-b43b-1425cbc6f5d2	\N	しまだまさき	staff	2025-11-28 14:18:08.513114+00	2025-11-28 14:18:08.513114+00	\N	\N			16183127-aac4-4eb3-9c99-e235a071be53	4c6c7696-9b47-4864-95fc-6e3c240db987	しまだまさき	light	\N	none	approved	\N	0f82402e-0cda-4434-86b3-45d1cc57b3b7	pending	2025-12-05 14:18:37.078+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: store_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.store_roles (id, store_id, name, permissions, created_at, updated_at, is_system_role) FROM stdin;
4c6c7696-9b47-4864-95fc-6e3c240db987	16183127-aac4-4eb3-9c99-e235a071be53	デフォルトスタッフ	{"can_manage_menus": true, "can_manage_roles": true, "can_manage_users": true, "can_view_reports": true, "can_manage_bottles": true, "can_manage_settings": true, "can_manage_attendance": true}	2025-11-28 14:14:56.990504+00	2025-11-28 14:14:56.990504+00	t
49020c3d-8d93-40a3-82fd-8f39a0660b4d	16183127-aac4-4eb3-9c99-e235a071be53	デフォルトキャスト	{"target": "cast"}	2025-11-28 14:14:57.062758+00	2025-11-28 14:14:57.062758+00	t
\.


--
-- Data for Name: stores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stores (id, name, created_at, updated_at, show_break_columns, latitude, longitude, location_radius, location_check_enabled, show_dashboard, show_attendance, show_timecard, show_users, show_roles, tablet_timecard_enabled, tablet_acceptance_start_time, tablet_acceptance_end_time, tablet_allowed_roles, tablet_theme, time_rounding_enabled, time_rounding_method, time_rounding_minutes, auto_clockout_enabled, show_menus, allow_join_requests, icon_url, business_start_time, business_end_time, day_switch_time, industry, closed_days, prefecture, referral_source) FROM stdin;
16183127-aac4-4eb3-9c99-e235a071be53	Three	2025-11-28 14:14:56.901159+00	2025-11-28 14:14:56.901159+00	t	\N	\N	50	f	t	t	t	t	t	f	\N	\N	{staff,cast}	light	f	round	15	f	t	f	\N	19:00:00	01:00:00	05:00:00	ラウンジ	{sunday}	東京都	その他
\.


--
-- Data for Name: time_cards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.time_cards (id, user_id, work_date, clock_in, clock_out, break_start, break_end, created_at, updated_at, pickup_required, pickup_destination, scheduled_start_time, scheduled_end_time, forgot_clockout) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, created_at, updated_at, current_profile_id, primary_email, hide_line_friendship_prompt) FROM stdin;
5a0f97bd-90f4-4426-a22c-8bbf615e1998	U3e18e1944fec2b61f23d764e24260fc2@line-v2.nightbase.app	2025-11-28 14:13:40.448769+00	2025-11-28 14:13:40.448769+00	3047ac8c-6b5b-4f82-8829-1da2f068b89a	\N	f
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
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


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

\unrestrict 1yHfuQZJEBNhbyGeeh7isjAiv9eLH8Dw3hTeuktcyUQYaegdNjeRBk0gTUt0s9c

