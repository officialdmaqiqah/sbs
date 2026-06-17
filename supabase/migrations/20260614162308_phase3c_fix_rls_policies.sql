CREATE POLICY "CEO Admin ALL suppliers" ON suppliers FOR ALL USING (current_user_has_role('CEO_ADMIN'));
CREATE POLICY "CEO Admin ALL chart_of_accounts" ON chart_of_accounts FOR ALL USING (current_user_has_role('CEO_ADMIN'));
