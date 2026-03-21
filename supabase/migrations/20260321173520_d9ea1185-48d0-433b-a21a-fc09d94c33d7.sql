CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_end TIMESTAMPTZ,
  ai_daily_limit INTEGER NOT NULL DEFAULT 5,
  storage_limit_bytes BIGINT NOT NULL DEFAULT 524288000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_subscriptions_plan_check CHECK (plan IN ('free', 'pro', 'team')),
  CONSTRAINT user_subscriptions_status_check CHECK (status IN ('inactive', 'active', 'past_due', 'canceled', 'trialing', 'incomplete', 'unpaid'))
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
ON public.user_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TABLE public.ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  feature TEXT NOT NULL DEFAULT 'assistant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own AI usage"
ON public.ai_usage_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI usage"
ON public.ai_usage_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage AI usage"
ON public.ai_usage_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX idx_ai_usage_events_user_date ON public.ai_usage_events(user_id, request_date);

CREATE OR REPLACE FUNCTION public.update_user_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_subscriptions_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan, status, ai_daily_limit, storage_limit_bytes)
  VALUES (NEW.id, 'free', 'inactive', 5, 524288000)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_default_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_default_subscription
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.ensure_default_subscription();

CREATE OR REPLACE FUNCTION public.get_my_usage_summary()
RETURNS TABLE (
  plan TEXT,
  subscription_status TEXT,
  storage_used_bytes BIGINT,
  storage_limit_bytes BIGINT,
  ai_uses_today INTEGER,
  ai_daily_limit INTEGER,
  can_use_ai BOOLEAN,
  has_storage_capacity BOOLEAN,
  subscription_end TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sub AS (
    SELECT *
    FROM public.user_subscriptions
    WHERE user_id = auth.uid()
    LIMIT 1
  ),
  usage_today AS (
    SELECT COUNT(*)::INTEGER AS count
    FROM public.ai_usage_events
    WHERE user_id = auth.uid()
      AND request_date = CURRENT_DATE
  ),
  storage_usage AS (
    SELECT (
      COALESCE((SELECT SUM(octet_length(COALESCE(title, '') || COALESCE(content, '') || COALESCE(drawing_data, '') || COALESCE(workflow_data, '') || COALESCE(password, '') || COALESCE(array_to_string(tags, ','), ''))) FROM public.notes WHERE user_id = auth.uid()), 0)
      + COALESCE((SELECT SUM(octet_length(COALESCE(name, '') || COALESCE(color, '') || COALESCE(parent_id, ''))) FROM public.folders WHERE user_id = auth.uid()), 0)
      + COALESCE((SELECT SUM(octet_length(COALESCE(text, '') || COALESCE(note_id, ''))) FROM public.todos WHERE user_id = auth.uid()), 0)
      + COALESCE((SELECT SUM(octet_length(COALESCE(text, '') || COALESCE(date, '') || COALESCE(reminder_time, ''))) FROM public.calendar_tasks WHERE user_id = auth.uid()), 0)
      + COALESCE((SELECT SUM(octet_length(COALESCE(customization_data::text, ''))) FROM public.user_customizations WHERE user_id = auth.uid()), 0)
    )::BIGINT AS bytes
  )
  SELECT
    COALESCE(sub.plan, 'free') AS plan,
    COALESCE(sub.status, 'inactive') AS subscription_status,
    storage_usage.bytes AS storage_used_bytes,
    CASE WHEN COALESCE(sub.plan, 'free') IN ('pro', 'team') THEN NULL ELSE COALESCE(sub.storage_limit_bytes, 524288000) END AS storage_limit_bytes,
    usage_today.count AS ai_uses_today,
    CASE WHEN COALESCE(sub.plan, 'free') IN ('pro', 'team') THEN NULL ELSE COALESCE(sub.ai_daily_limit, 5) END AS ai_daily_limit,
    CASE WHEN COALESCE(sub.plan, 'free') IN ('pro', 'team') THEN true ELSE usage_today.count < COALESCE(sub.ai_daily_limit, 5) END AS can_use_ai,
    CASE WHEN COALESCE(sub.plan, 'free') IN ('pro', 'team') THEN true ELSE storage_usage.bytes < COALESCE(sub.storage_limit_bytes, 524288000) END AS has_storage_capacity,
    sub.current_period_end AS subscription_end
  FROM storage_usage, usage_today
  LEFT JOIN sub ON true;
$$;