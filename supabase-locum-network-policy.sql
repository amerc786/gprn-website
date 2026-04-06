-- Allow approved users to see approved locum profiles in the Locum Network
-- This is needed so practice managers can browse available GPs

DROP POLICY IF EXISTS "approved users read approved locums" ON public.profiles;
CREATE POLICY "approved users read approved locums"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        -- The row being viewed must be an approved, non-admin locum
        role = 'locum'
        AND approval_status = 'approved'
        AND is_admin = false
        -- The viewer must themselves be approved
        AND public.is_approved()
    );
