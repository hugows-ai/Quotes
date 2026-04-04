
-- Update default storage limit in ensure_default_subscription trigger function
CREATE OR REPLACE FUNCTION public.ensure_default_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan, status, ai_daily_limit, storage_limit_bytes)
  VALUES (NEW.id, 'free', 'inactive', 5, 314572800)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Update get_my_usage_summary to use 300MB default
CREATE OR REPLACE FUNCTION public.get_my_usage_summary()
 RETURNS TABLE(plan text, subscription_status text, storage_used_bytes bigint, storage_limit_bytes bigint, ai_uses_today integer, ai_daily_limit integer, can_use_ai boolean, has_storage_capacity boolean, subscription_end timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    CASE WHEN COALESCE(sub.plan, 'free') IN ('pro', 'team') THEN NULL ELSE COALESCE(sub.storage_limit_bytes, 314572800) END AS storage_limit_bytes,
    usage_today.count AS ai_uses_today,
    CASE WHEN COALESCE(sub.plan, 'free') IN ('pro', 'team') THEN NULL ELSE COALESCE(sub.ai_daily_limit, 5) END AS ai_daily_limit,
    CASE WHEN COALESCE(sub.plan, 'free') IN ('pro', 'team') THEN true ELSE usage_today.count < COALESCE(sub.ai_daily_limit, 5) END AS can_use_ai,
    CASE WHEN COALESCE(sub.plan, 'free') IN ('pro', 'team') THEN true ELSE storage_usage.bytes < COALESCE(sub.storage_limit_bytes, 314572800) END AS has_storage_capacity,
    sub.current_period_end AS subscription_end
  FROM storage_usage, usage_today
  LEFT JOIN sub ON true;
$function$;

-- Update existing free users to 300MB limit
UPDATE public.user_subscriptions SET storage_limit_bytes = 314572800 WHERE plan = 'free' AND storage_limit_bytes = 524288000;
