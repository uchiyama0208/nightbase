-- =============================================
-- NightBase Subscription System
-- =============================================

-- subscription_plans: Plan master data (editable from admin)
CREATE TABLE subscription_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  price_yen integer NOT NULL DEFAULT 0,
  stripe_price_id text,
  limits jsonb NOT NULL DEFAULT '{}',
  features jsonb NOT NULL DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE subscription_plans IS 'Subscription plan definitions';
COMMENT ON COLUMN subscription_plans.limits IS 'Usage limits: max_members, ai_credits, sales_reports, sns_posts (-1 = unlimited)';
COMMENT ON COLUMN subscription_plans.features IS 'Feature flags for this plan';

-- subscriptions: Store subscription status
CREATE TABLE subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES subscription_plans(id) NOT NULL,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT subscriptions_store_id_unique UNIQUE(store_id),
  CONSTRAINT subscriptions_status_check CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'))
);

COMMENT ON TABLE subscriptions IS 'Store subscription records';
COMMENT ON COLUMN subscriptions.status IS 'trialing, active, past_due, canceled, unpaid, incomplete';

-- usage_records: Track monthly usage for rate limiting
CREATE TABLE usage_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  usage_type text NOT NULL,
  period_start date NOT NULL,
  count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT usage_records_unique UNIQUE(store_id, usage_type, period_start),
  CONSTRAINT usage_records_type_check CHECK (usage_type IN ('ai_credits', 'sales_reports', 'sns_posts'))
);

COMMENT ON TABLE usage_records IS 'Monthly usage tracking for rate limiting';

-- coupons: Discount codes
CREATE TABLE coupons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text,
  stripe_coupon_id text,
  discount_type text NOT NULL,
  discount_value integer NOT NULL,
  duration text DEFAULT 'once' NOT NULL,
  duration_months integer,
  max_redemptions integer,
  redemption_count integer DEFAULT 0 NOT NULL,
  valid_from timestamptz DEFAULT now() NOT NULL,
  valid_until timestamptz,
  applicable_plans text[],
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT coupons_discount_type_check CHECK (discount_type IN ('percent', 'fixed')),
  CONSTRAINT coupons_duration_check CHECK (duration IN ('once', 'repeating', 'forever')),
  CONSTRAINT coupons_percent_check CHECK (
    discount_type != 'percent' OR (discount_value >= 1 AND discount_value <= 100)
  )
);

COMMENT ON TABLE coupons IS 'Discount coupon codes';
COMMENT ON COLUMN coupons.discount_type IS 'percent or fixed';
COMMENT ON COLUMN coupons.discount_value IS 'Discount rate (%) or amount (yen)';
COMMENT ON COLUMN coupons.duration IS 'once, repeating, forever';
COMMENT ON COLUMN coupons.applicable_plans IS 'Array of plan names this coupon applies to (null = all plans)';

-- coupon_redemptions: Track coupon usage
CREATE TABLE coupon_redemptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id uuid REFERENCES coupons(id) ON DELETE CASCADE NOT NULL,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  discount_amount integer,
  redeemed_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT coupon_redemptions_unique UNIQUE(coupon_id, store_id)
);

COMMENT ON TABLE coupon_redemptions IS 'Coupon usage history (one per store)';

-- subscription_history: Audit log for subscription changes
CREATE TABLE subscription_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  from_plan_id uuid REFERENCES subscription_plans(id),
  to_plan_id uuid REFERENCES subscription_plans(id),
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT subscription_history_event_check CHECK (
    event_type IN ('created', 'upgraded', 'downgraded', 'canceled', 'renewed', 'trial_started', 'trial_ended', 'payment_failed')
  )
);

COMMENT ON TABLE subscription_history IS 'Audit log for subscription changes';

-- =============================================
-- Add stripe_customer_id to stores
-- =============================================
ALTER TABLE stores ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX idx_subscriptions_store_id ON subscriptions(store_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_usage_records_store_period ON usage_records(store_id, period_start);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active) WHERE is_active = true;
CREATE INDEX idx_coupon_redemptions_store ON coupon_redemptions(store_id);
CREATE INDEX idx_subscription_history_store ON subscription_history(store_id);

-- =============================================
-- RLS Policies
-- =============================================

-- subscription_plans: Everyone can read active plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

-- subscriptions: Store members can view their subscription
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store members can view their subscription"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = (SELECT auth.uid())
      AND profiles.store_id = subscriptions.store_id
    )
  );

-- usage_records: Store members can view their usage
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store members can view their usage"
  ON usage_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = (SELECT auth.uid())
      AND profiles.store_id = usage_records.store_id
    )
  );

-- coupons: Anyone can read active coupons (for validation)
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons"
  ON coupons FOR SELECT
  USING (is_active = true);

-- coupon_redemptions: Store members can view their redemptions
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store members can view their coupon redemptions"
  ON coupon_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = (SELECT auth.uid())
      AND profiles.store_id = coupon_redemptions.store_id
    )
  );

-- subscription_history: Store admins can view history
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store admins can view subscription history"
  ON subscription_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = (SELECT auth.uid())
      AND profiles.store_id = subscription_history.store_id
      AND profiles.role = 'admin'
    )
  );

-- =============================================
-- Initial Plan Data
-- =============================================
INSERT INTO subscription_plans (name, display_name, description, price_yen, limits, features, sort_order) VALUES
(
  'free',
  'Free',
  'Start with basic features',
  0,
  '{"max_members": 5, "ai_credits": 10, "sales_reports": 3, "sns_posts": 0}',
  '{"basic": true}',
  0
),
(
  'starter',
  'Starter',
  'For small venues getting started',
  9800,
  '{"max_members": 15, "ai_credits": 50, "sales_reports": -1, "sns_posts": 10}',
  '{"basic": true, "reports": true}',
  1
),
(
  'professional',
  'Professional',
  'For growing businesses',
  29800,
  '{"max_members": 50, "ai_credits": 200, "sales_reports": -1, "sns_posts": 50}',
  '{"basic": true, "reports": true, "sns": true, "ai": true}',
  2
),
(
  'enterprise',
  'Enterprise',
  'For large venues and chains',
  59800,
  '{"max_members": -1, "ai_credits": 1000, "sales_reports": -1, "sns_posts": -1}',
  '{"basic": true, "reports": true, "sns": true, "ai": true, "priority_support": true}',
  3
);

-- =============================================
-- Functions
-- =============================================

-- Function to get current month's usage
CREATE OR REPLACE FUNCTION get_current_usage(
  p_store_id uuid,
  p_usage_type text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_period_start date;
BEGIN
  v_period_start := date_trunc('month', CURRENT_DATE)::date;

  SELECT count INTO v_count
  FROM usage_records
  WHERE store_id = p_store_id
    AND usage_type = p_usage_type
    AND period_start = v_period_start;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  p_store_id uuid,
  p_usage_type text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count integer;
  v_period_start date;
BEGIN
  v_period_start := date_trunc('month', CURRENT_DATE)::date;

  INSERT INTO usage_records (store_id, usage_type, period_start, count)
  VALUES (p_store_id, p_usage_type, v_period_start, 1)
  ON CONFLICT (store_id, usage_type, period_start)
  DO UPDATE SET
    count = usage_records.count + 1,
    updated_at = now()
  RETURNING count INTO v_new_count;

  RETURN v_new_count;
END;
$$;

-- Function to get subscription with plan details
CREATE OR REPLACE FUNCTION get_store_subscription(p_store_id uuid)
RETURNS TABLE (
  subscription_id uuid,
  plan_name text,
  plan_display_name text,
  price_yen integer,
  status text,
  limits jsonb,
  features jsonb,
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    p.name,
    p.display_name,
    p.price_yen,
    s.status,
    p.limits,
    p.features,
    s.trial_end,
    s.current_period_end,
    s.cancel_at_period_end
  FROM subscriptions s
  JOIN subscription_plans p ON s.plan_id = p.id
  WHERE s.store_id = p_store_id;
END;
$$;

-- Function to validate coupon
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code text,
  p_plan_name text,
  p_store_id uuid
) RETURNS TABLE (
  is_valid boolean,
  coupon_id uuid,
  discount_type text,
  discount_value integer,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon coupons%ROWTYPE;
  v_already_used boolean;
BEGIN
  -- Find coupon
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = UPPER(p_code)
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::integer, 'Invalid coupon code';
    RETURN;
  END IF;

  -- Check validity period
  IF v_coupon.valid_from > now() THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::integer, 'Coupon is not yet valid';
    RETURN;
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::integer, 'Coupon has expired';
    RETURN;
  END IF;

  -- Check max redemptions
  IF v_coupon.max_redemptions IS NOT NULL AND v_coupon.redemption_count >= v_coupon.max_redemptions THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::integer, 'Coupon usage limit reached';
    RETURN;
  END IF;

  -- Check applicable plans
  IF v_coupon.applicable_plans IS NOT NULL AND NOT (p_plan_name = ANY(v_coupon.applicable_plans)) THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::integer, 'Coupon not applicable to this plan';
    RETURN;
  END IF;

  -- Check if already used by this store
  SELECT EXISTS(
    SELECT 1 FROM coupon_redemptions
    WHERE coupon_id = v_coupon.id AND store_id = p_store_id
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::integer, 'Coupon already used';
    RETURN;
  END IF;

  -- Valid!
  RETURN QUERY SELECT true, v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, NULL::text;
END;
$$;
