-- Prevent non-admins from updating roles
CREATE POLICY "Prevent self-role-update"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow users to update their own non-system templates
CREATE POLICY "Users can update own templates"
ON public.note_templates
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND is_system = false)
WITH CHECK (user_id = auth.uid() AND is_system = false);