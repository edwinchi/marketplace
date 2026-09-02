-- Removes QA/Playwright test accounts and their data -- accumulated across this project's
-- build-and-test process (Aug 20-21 and Aug 29 testing bursts: tester_*, *test*, *check*,
-- *debug*, msgseller/msgbuyer pairs, the original afrodeals_demo seed seller, etc). Scoped to 95
-- profiles identified by clearly automated username patterns (bot-generated, clustered in tight
-- same-second timestamp bursts) plus 28 of their listings -- 17 of which were LIVE and publicly
-- visible in search results (including the entire "AfroDeals Demo Seller" catalog). Real-looking
-- accounts (human usernames, isolated signups, a business account, the site owner's own accounts)
-- were deliberately excluded -- see the classification this migration was generated from.
--
-- Ambiguous "user_" plus 8 hex characters accounts with zero listings were left alone entirely
-- (11 of them): since browsing itself requires login site-wide (proxy.ts), a zero-listing account
-- isn't reliable evidence of being a test bot -- it could just as easily be a real visitor who
-- signed up to browse and hasn't posted anything yet. They cost nothing to leave in place either
-- way.
--
-- Deletes in FK-dependency order so nothing is orphaned or blocked by a non-cascading foreign key;
-- audit_logs rows are preserved with actor_id set to NULL rather than deleted, keeping the log
-- itself intact. auth.users rows are removed too (Supabase's own schema cascades identities/
-- sessions/tokens automatically), not just the public.profiles rows.

BEGIN;

CREATE TEMP TABLE _cleanup_profile_ids (id uuid PRIMARY KEY);
INSERT INTO _cleanup_profile_ids (id) VALUES
  ('7ed60ef5-f1ec-4723-a397-67932f4ddd16'),
  ('1ef358e2-1e72-4aa1-857c-8983f7e48b5a'),
  ('6467d577-4cf3-4722-833e-4a3313143f89'),
  ('fb500950-ee11-4b1d-8631-f4d115ac5edd'),
  ('d477297a-3fa6-477d-b472-93624d259b0d'),
  ('dc8dcfa2-906d-494a-b42f-e73f64c0ad18'),
  ('2ccd24d2-dbd9-4a4f-adfb-ed7d630ed9da'),
  ('fadece18-098a-4418-a84f-87ee103cf0e8'),
  ('6c4db7a9-fae0-4ed3-b83f-e61215821981'),
  ('2c3b8e28-05e0-43c6-8712-fe8647619c2a'),
  ('3303dd6f-e993-4571-af4b-bd9a14cac4a2'),
  ('05352d4a-171f-433e-b46c-75e965751dfa'),
  ('654a14e1-fdea-4e6f-b36c-538505dc0b45'),
  ('9bab9372-1771-4c53-948a-2d8ec89174b1'),
  ('77c3d8f7-a271-488f-ba4a-d5c953e2ffca'),
  ('f10df2fd-4ffa-4f04-841d-ca6fe565a59a'),
  ('7698aab4-36d1-4000-b5c0-f0fd4016bd0d'),
  ('32239b7d-60ab-46c2-8ae7-189bca5e56e1'),
  ('214311af-aee3-4cb4-9409-879390c1d4a8'),
  ('02d1e5d5-16e0-4a27-939c-a895d34e6ef2'),
  ('46775a6f-d9dd-4c06-858d-70772f81a8a9'),
  ('0b30616f-44b7-4f61-b9e2-a8ba2173f070'),
  ('35705fbc-fe24-454c-9c3f-0f93ab3be34c'),
  ('73de4c61-12f4-4b0c-8e67-e9c1335b6573'),
  ('0adbd5b8-0b29-4441-b31b-271bb0891484'),
  ('7718f602-ba10-4951-9090-a905476f5f67'),
  ('cb259275-cc10-487d-8cec-eee4581a5d9e'),
  ('6e9d648f-fb9e-46ca-a0ec-a34a8b841ba3'),
  ('fccc1171-c7d3-4b82-9305-5790d4ac4a86'),
  ('60fc5772-6895-4c93-8b2e-f931eca42b43'),
  ('03c336fa-81f1-46f3-a2d7-e7f2dc10e599'),
  ('4cb05cd9-8705-49fc-baa4-86605e9fc388'),
  ('e5872f31-e9cb-40b8-9d07-ff1b9c7cfd6b'),
  ('189a55d8-3c03-410e-b54f-ce24d266bfab'),
  ('34b90e4b-f85a-4ff3-9dcd-a35875de314a'),
  ('120cea33-15aa-4e55-a6b8-0849fe7766d5'),
  ('4896147c-5bf2-4877-9757-b19e97a7c962'),
  ('30c60c71-373a-4986-8414-8963b8ddc7b9'),
  ('af3e67ae-b603-4f7e-847b-28108f330b7d'),
  ('e4fb8af1-ccaf-4f2d-ab5a-dae951a586a4'),
  ('1210c2da-acec-47f7-a4ec-8f0db61edd08'),
  ('d70cf975-7198-4c77-bfa0-42a9345dc547'),
  ('348ecf78-84cd-488d-bd79-a86f36a8ffb0'),
  ('3f90a262-2dd5-49a5-8ee5-2f6611dad1fe'),
  ('703adba4-bdd9-46ba-9755-3c68152e6da2'),
  ('d9cabe2e-da05-42ba-a25e-6b3ad11b994f'),
  ('d25e9138-c42e-4b28-b5cc-067e0211d3c8'),
  ('cf903125-3347-43f4-9f7b-2996180dd723'),
  ('80e06d07-a66a-4a30-a8c8-40629532d5f9'),
  ('509b5ae7-2737-47fd-b148-092bbc0e1a5d'),
  ('700c36a4-1cb4-49ac-a458-4f4f52a521e4'),
  ('1ae05d5e-1686-42d2-b6df-484cb4c526d3'),
  ('5a96a76a-4cb9-43a6-bc06-eb5ffd76a9e1'),
  ('6baf405d-3619-4bec-ac27-62ef68c141af'),
  ('a3419b2a-f604-4900-a479-037c3e260d97'),
  ('df942b3a-35d9-43b4-8760-44fced9d08fd'),
  ('26a8c6bb-2e74-427c-8d39-b78099e661c1'),
  ('57bef1c7-caab-426c-8c7f-1873864ab5f3'),
  ('46e05786-0185-46fe-930b-4f00991b2154'),
  ('88fb55d0-58d4-44c5-9a9d-3472a0990d82'),
  ('9f99f95c-d211-4ecf-afe0-bb8c9cb75c54'),
  ('27d1cf5b-fc4f-4c78-bed2-fb191f09b118'),
  ('b1c7958b-e999-489c-b4f1-bcb1c807aadf'),
  ('1979d9b7-e22a-4689-8a97-109ac5ae4703'),
  ('c34ce452-7cd4-433d-92e1-895d4b999b35'),
  ('5e8fb1aa-6e77-4db0-91cf-5232e6cced2a'),
  ('7bb6855b-332a-4111-9105-7b28a52e87a8'),
  ('2188485d-a425-4ff6-8e27-da3aa769c74d'),
  ('d47615cd-9bb1-4835-819c-98dfa6c94806'),
  ('df7eaedd-db2b-4f08-95af-592c935b2597'),
  ('81bf7e36-60e9-4b82-aff1-ccb81811f736'),
  ('99c86010-8813-44b4-b78d-60de0aac4f5b'),
  ('d58cf061-39f8-43af-83b6-1d6564a393f6'),
  ('03e2ff5b-ee08-41b7-9e96-ffb8783f9450'),
  ('643ca535-669d-40fb-a4d0-3f8fba563122'),
  ('f8955ba1-baa7-45e8-a0c5-3e7588cde68d'),
  ('65b3561c-cc97-4158-a4d8-7f3f114a0c34'),
  ('b82e78f6-5a92-41da-a3f9-9a1e0eee39e3'),
  ('8d81c79d-2b88-4628-919c-de6d5c1fda36'),
  ('65709729-8461-4cb8-a8a1-74808cfa9c5f'),
  ('de9615ed-51c6-4c1e-a5a5-8c23632f7808'),
  ('6f8a8e7f-f51e-4fbb-84a1-aaa437bce449'),
  ('c61850bb-a89e-4e85-bd0e-37c4a51b1caf'),
  ('d4ade2e2-2818-4183-b7b4-80c28c795d08'),
  ('cf491ca2-12ea-46bf-a19b-51bab8365107'),
  ('2aecba77-4997-4598-aa23-6ab874a9735a'),
  ('c4545b98-7fe4-41b5-8872-d421cf1a5a87'),
  ('24a43ee0-2c1e-4f12-900a-65a4808d2fe8'),
  ('fe429070-766f-45f6-8cc5-a45715d72cfa'),
  ('63de6c37-ce43-404b-97cb-419addb21abb'),
  ('973cfd58-9ffa-4d3a-85d8-e2120ae6959b'),
  ('bd6d72b0-9156-40c7-99fc-562d4a5eb3cd'),
  ('befda515-9fc7-49be-a76e-d065c48fb566'),
  ('1c5ab376-3ba7-49c2-9e51-21e0f9be4f33'),
  ('3f5114e9-b97e-4474-a97e-8eaf4c7c8d23');

CREATE TEMP TABLE _cleanup_listing_ids (id uuid PRIMARY KEY);
INSERT INTO _cleanup_listing_ids (id) VALUES
  ('d14fd48d-f770-400e-a551-f1e07c410740'),
  ('5f6f1066-2148-4c53-a9f1-00c01af8768f'),
  ('31aaf94d-fe9e-4a04-9c88-d52b8bb457ce'),
  ('25c1d665-4139-4a1b-b773-ac8f8f87f2f2'),
  ('279af8a7-444f-4a1b-ba92-4229dd2b768c'),
  ('5f2f0bd5-c4d4-4a15-81e3-a51165d6ad13'),
  ('03d94fdf-2867-4145-b2e2-04d19a195652'),
  ('fa51f7fa-781d-462c-a01c-872715296737'),
  ('28967b95-b602-404d-9f72-13dbb3f8050c'),
  ('cc2ff0ac-f6fa-4f84-9441-8b1a4eb38f03'),
  ('a8107d63-a5fe-4a3f-a3c1-0639b1704d4d'),
  ('6b1f99fc-e44b-4d3d-9582-3dd63a8b06a1'),
  ('0b8aa50f-c222-4ae8-9fc1-323632ddde07'),
  ('3fe52805-4c3d-4882-95be-86e1bc1f8407'),
  ('a6734778-2ed4-41cd-bf5a-d2064ad9035f'),
  ('9aff51f1-fbce-4401-8741-e25eee0144cb'),
  ('4cac1679-5beb-4459-913a-97da33def02c'),
  ('3d871e54-7f28-4047-af53-0a289fc4d88b'),
  ('d2352707-8f4c-464e-a777-7b6f0d525448'),
  ('ca265a73-e6bf-484b-87ad-46ffbc56b148'),
  ('34668aac-0db9-44b9-a956-fcc049b1f367'),
  ('b2953024-efa0-4b31-9812-437a999155be'),
  ('b90e0994-3e0d-4072-b4a3-0559a68e179f'),
  ('d965df20-20d2-4aec-90f1-6b5fd8ac1ce1'),
  ('ce31e885-0448-4fc9-89dd-d5d1522743d6'),
  ('28fce412-03e7-4285-bc33-3ad7f59ea384'),
  ('9ff633ef-6eb3-4579-9d83-054b0e43d353'),
  ('5eaafd48-ba91-4315-96fa-94ebf436d722');

DELETE FROM offers WHERE listing_id IN (SELECT id FROM _cleanup_listing_ids) OR buyer_id IN (SELECT id FROM _cleanup_profile_ids);
DELETE FROM conversations WHERE listing_id IN (SELECT id FROM _cleanup_listing_ids);
DELETE FROM messages WHERE sender_id IN (SELECT id FROM _cleanup_profile_ids);
DELETE FROM reports WHERE reporter_id IN (SELECT id FROM _cleanup_profile_ids) OR reported_profile_id IN (SELECT id FROM _cleanup_profile_ids) OR reported_listing_id IN (SELECT id FROM _cleanup_listing_ids);
DELETE FROM reviews WHERE reviewer_profile_id IN (SELECT id FROM _cleanup_profile_ids) OR reviewee_profile_id IN (SELECT id FROM _cleanup_profile_ids);
DELETE FROM notifications WHERE profile_id IN (SELECT id FROM _cleanup_profile_ids);
UPDATE audit_logs SET actor_id = NULL WHERE actor_id IN (SELECT id FROM _cleanup_profile_ids);
DELETE FROM saved_searches WHERE profile_id IN (SELECT id FROM _cleanup_profile_ids);
DELETE FROM listings WHERE id IN (SELECT id FROM _cleanup_listing_ids);
DELETE FROM businesses WHERE owner_profile_id IN (SELECT id FROM _cleanup_profile_ids);

DELETE FROM auth.users WHERE id IN (SELECT auth_user_id FROM profiles WHERE id IN (SELECT id FROM _cleanup_profile_ids));
DELETE FROM profiles WHERE id IN (SELECT id FROM _cleanup_profile_ids);

DROP TABLE _cleanup_profile_ids;
DROP TABLE _cleanup_listing_ids;

COMMIT;
