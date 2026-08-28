ALTER TABLE businesses ENABLE ROW LEVEL SECURITY; ALTER TABLE listings ENABLE ROW LEVEL SECURITY; ALTER TABLE listing_translations ENABLE ROW LEVEL SECURITY; ALTER TABLE listing_media ENABLE ROW LEVEL SECURITY; ALTER TABLE favorites ENABLE ROW LEVEL SECURITY; ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY; ALTER TABLE offers ENABLE ROW LEVEL SECURITY; ALTER TABLE conversations ENABLE ROW LEVEL SECURITY; ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY; ALTER TABLE messages ENABLE ROW LEVEL SECURITY; ALTER TABLE orders ENABLE ROW LEVEL SECURITY; ALTER TABLE payments ENABLE ROW LEVEL SECURITY; ALTER TABLE shipments ENABLE ROW LEVEL SECURITY; ALTER TABLE reports ENABLE ROW LEVEL SECURITY; ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION current_profile_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT id FROM profiles WHERE auth_user_id=auth.uid() $$;
CREATE POLICY listing_read ON listings FOR SELECT USING(status='active' OR seller_id=current_profile_id());
CREATE POLICY listing_write ON listings FOR ALL USING(seller_id=current_profile_id()) WITH CHECK(seller_id=current_profile_id());
CREATE POLICY favorite_owner ON favorites FOR ALL USING(profile_id=current_profile_id()) WITH CHECK(profile_id=current_profile_id());
CREATE POLICY saved_search_owner ON saved_searches FOR ALL USING(profile_id=current_profile_id()) WITH CHECK(profile_id=current_profile_id());
CREATE POLICY offer_party_read ON offers FOR SELECT USING(buyer_id=current_profile_id() OR EXISTS(SELECT 1 FROM listings l WHERE l.id=listing_id AND l.seller_id=current_profile_id()));
CREATE POLICY offer_buyer_insert ON offers FOR INSERT WITH CHECK(buyer_id=current_profile_id());
CREATE POLICY conversation_member_read ON conversations FOR SELECT USING(EXISTS(SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id=id AND cp.profile_id=current_profile_id()));
CREATE POLICY participant_member_read ON conversation_participants FOR SELECT USING(EXISTS(SELECT 1 FROM conversation_participants mine WHERE mine.conversation_id=conversation_id AND mine.profile_id=current_profile_id()));
CREATE POLICY message_member_read ON messages FOR SELECT USING(EXISTS(SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id=messages.conversation_id AND cp.profile_id=current_profile_id()));
CREATE POLICY message_member_insert ON messages FOR INSERT WITH CHECK(sender_id=current_profile_id() AND EXISTS(SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id=messages.conversation_id AND cp.profile_id=current_profile_id()));
CREATE POLICY order_party_read ON orders FOR SELECT USING(buyer_id=current_profile_id() OR seller_id=current_profile_id());
CREATE POLICY payment_order_party_read ON payments FOR SELECT USING(EXISTS(SELECT 1 FROM orders o WHERE o.id=order_id AND (o.buyer_id=current_profile_id() OR o.seller_id=current_profile_id())));
CREATE POLICY shipment_order_party_read ON shipments FOR SELECT USING(EXISTS(SELECT 1 FROM orders o WHERE o.id=order_id AND (o.buyer_id=current_profile_id() OR o.seller_id=current_profile_id())));
CREATE POLICY notification_owner ON notifications FOR SELECT USING(profile_id=current_profile_id());
CREATE POLICY report_owner_insert ON reports FOR INSERT WITH CHECK(reporter_id=current_profile_id());
CREATE POLICY report_owner_read ON reports FOR SELECT USING(reporter_id=current_profile_id());
-- Writes for payments, shipments, moderation, outbox and search documents must use trusted server/service roles.
