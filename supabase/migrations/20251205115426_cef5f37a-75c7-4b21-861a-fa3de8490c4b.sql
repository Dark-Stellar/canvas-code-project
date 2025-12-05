-- Fix security issues: Add DELETE policies and authenticated-only access

-- Add authenticated-only access policy for profiles (prevents anonymous access)
CREATE POLICY "Require authentication to access profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Drop the old SELECT policy and use the new authenticated one
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Add DELETE policy for profiles (GDPR compliance)
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Add DELETE policy for user_preferences
CREATE POLICY "Users can delete their own preferences"
ON public.user_preferences
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add DELETE policy for default_template
CREATE POLICY "Users can delete their own default template"
ON public.default_template
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);