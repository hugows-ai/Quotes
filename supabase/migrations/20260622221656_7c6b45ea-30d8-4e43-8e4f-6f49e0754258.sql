
REVOKE EXECUTE ON FUNCTION public.auto_assign_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_default_subscription() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_subscriptions_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_usage_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_usage_summary() TO authenticated;
