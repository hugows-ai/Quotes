-- Re-attach triggers to auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created_assign_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_admin();

CREATE OR REPLACE TRIGGER on_auth_user_created_default_sub
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.ensure_default_subscription();

-- Add unique constraint on user_subscriptions.user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_subscriptions_user_id_key'
  ) THEN
    ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;