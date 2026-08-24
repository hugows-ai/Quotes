DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP FUNCTION IF EXISTS public.ensure_default_subscription() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_usage_summary() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_subscriptions_updated_at() CASCADE;
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;