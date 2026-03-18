
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS: users can read their own roles
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS: admins can manage all roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create templates table
CREATE TABLE public.note_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL DEFAULT '',
    category text NOT NULL DEFAULT 'personal',
    tags text[] DEFAULT '{}',
    is_system boolean NOT NULL DEFAULT false,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read system templates
CREATE POLICY "Anyone can read system templates"
ON public.note_templates
FOR SELECT
TO authenticated
USING (is_system = true OR user_id = auth.uid());

-- Users can create their own templates
CREATE POLICY "Users can insert own templates"
ON public.note_templates
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND is_system = false);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
ON public.note_templates
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND is_system = false);

-- Admins can manage all templates
CREATE POLICY "Admins can manage all templates"
ON public.note_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-assign admin role trigger for specific email
CREATE OR REPLACE FUNCTION public.auto_assign_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'vitor.paulino.ds@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_admin();
