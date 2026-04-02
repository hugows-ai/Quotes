
-- Attach the ensure_default_subscription trigger to auth.users
-- This creates a subscription row when a new user signs up
CREATE OR REPLACE FUNCTION public.ensure_default_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan, status, ai_daily_limit, storage_limit_bytes)
  VALUES (NEW.id, 'free', 'inactive', 5, 524288000)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_default_subscription();

-- Also attach auto_assign_admin trigger
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin();

-- Ensure existing users have subscription rows
INSERT INTO public.user_subscriptions (user_id, plan, status, ai_daily_limit, storage_limit_bytes)
SELECT id, 'free', 'inactive', 5, 524288000
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_subscriptions)
ON CONFLICT (user_id) DO NOTHING;
