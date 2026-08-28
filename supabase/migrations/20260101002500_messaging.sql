-- conversations/conversation_participants intentionally have no direct INSERT policy — nothing
-- should be able to create arbitrary conversations or add itself to someone else's. This function
-- is the one narrow, safe path: it derives the seller from the listing itself (never trusts a
-- client-supplied seller id), refuses to let someone message themselves, and reuses an existing
-- conversation for the same buyer+listing instead of creating duplicates every time "Message
-- seller" is clicked. SECURITY DEFINER, same pattern as handle_new_user()/listing_outbox().
CREATE OR REPLACE FUNCTION start_conversation(p_listing_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_buyer_id uuid := current_profile_id();
  v_seller_id uuid;
  v_conversation_id uuid;
BEGIN
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  SELECT seller_id INTO v_seller_id FROM listings WHERE id = p_listing_id;
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  IF v_seller_id = v_buyer_id THEN
    RAISE EXCEPTION 'Cannot message yourself';
  END IF;

  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.listing_id = p_listing_id
    AND EXISTS(SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.profile_id = v_buyer_id)
    AND EXISTS(SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.profile_id = v_seller_id)
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations(listing_id) VALUES (p_listing_id) RETURNING id INTO v_conversation_id;
    INSERT INTO conversation_participants(conversation_id, profile_id) VALUES (v_conversation_id, v_buyer_id), (v_conversation_id, v_seller_id);
  END IF;

  RETURN v_conversation_id;
END $$;

-- A participant marking their own read position (last_read_at) — scoped to their own row only,
-- can't touch the other participant's.
CREATE POLICY participant_self_update ON conversation_participants FOR UPDATE
  USING(profile_id = current_profile_id()) WITH CHECK(profile_id = current_profile_id());

-- New messages bump the conversation to the top of the inbox — matches messages' own
-- SECURITY DEFINER-free INSERT policy (message_member_insert), this just keeps updated_at honest
-- without requiring every sendMessage call to also UPDATE conversations itself under a policy that
-- doesn't exist for that table either.
CREATE OR REPLACE FUNCTION touch_conversation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE conversations SET updated_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;

CREATE TRIGGER messages_touch_conversation AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION touch_conversation();
