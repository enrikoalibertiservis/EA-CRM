-- Add 'resepsiyonist' role to user_profiles
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('super_admin', 'manager', 'consultant', 'resepsiyonist'));

-- Update customers RLS: resepsiyonist sees all customers at their location (like manager)
DROP POLICY IF EXISTS "customers_select" ON customers;
CREATE POLICY "customers_select" ON customers FOR SELECT TO authenticated
  USING (
    get_my_role() = 'super_admin'
    OR (get_my_role() IN ('manager', 'resepsiyonist') AND location_id = get_my_location_id())
    OR (get_my_role() = 'consultant' AND consultant_id = auth.uid())
  );

DROP POLICY IF EXISTS "customers_insert" ON customers;
CREATE POLICY "customers_insert" ON customers FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'super_admin'
    OR (get_my_role() IN ('manager', 'resepsiyonist') AND location_id = get_my_location_id())
    OR (get_my_role() = 'consultant' AND consultant_id = auth.uid())
  );

DROP POLICY IF EXISTS "customers_update" ON customers;
CREATE POLICY "customers_update" ON customers FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'super_admin'
    OR (get_my_role() IN ('manager', 'resepsiyonist') AND location_id = get_my_location_id())
    OR (get_my_role() = 'consultant' AND consultant_id = auth.uid())
  );
