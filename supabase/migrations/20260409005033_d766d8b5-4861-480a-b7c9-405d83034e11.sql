-- Add explicit restrictive INSERT policy to prevent self-role assignment
CREATE POLICY "Prevent self-role-assignment"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));