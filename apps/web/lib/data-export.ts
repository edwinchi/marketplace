// "Download my data" (GDPR Art. 15 right of access, Art. 20 portability; owner-approved
// 2026-11-07, risk R11). Collects everything MarketitNow stores about one account into one JSON
// document.
//
// It reads with the service role, because RLS doesn't let a user read some of their own rows
// (reports they filed, payments on their orders). So the safety rule is in this file: every query
// is filtered by the caller's own profile id, or by ids that came from such a query (their
// listings, orders, conversations). tests/data-export.test.ts fails if a query isn't scoped that way.
//
// Left out: other people's private data (only messages inside the user's own conversations are
// included, which is what an access request covers), and AI search vectors (title_embedding,
// image_embedding: numbers derived from listing text and photos, not personal data).

// The tiny slice of the Supabase query builder this needs: select, then one or two filters.
export type ExportDb = {
  from: (table: string) => {
    select: (columns: string) => QueryBuilder;
  };
};
type QueryBuilder = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  in: (column: string, values: unknown[]) => QueryBuilder;
  or: (filters: string) => QueryBuilder;
  limit: (n: number) => QueryBuilder;
};

const MAX_ROWS = 10000;
const DROP_COLUMNS = new Set(["title_embedding", "image_embedding", "geog"]);

function clean(rows: unknown[] | null): Record<string, unknown>[] {
  return (rows ?? []).map((r) => Object.fromEntries(Object.entries(r as Record<string, unknown>).filter(([k]) => !DROP_COLUMNS.has(k))));
}

export type AuthUserSummary = { id: string; email?: string | null; created_at?: string; last_sign_in_at?: string | null; identities?: { provider: string }[] | null };

export async function collectUserData(db: ExportDb, profileId: string, authUser: AuthUserSummary) {
  const errors: string[] = [];
  const run = async (label: string, q: QueryBuilder) => {
    const { data, error } = await q.limit(MAX_ROWS);
    if (error) errors.push(`${label}: ${error.message}`);
    return clean(data);
  };
  const byProfile = (table: string, column: string) => run(table, db.from(table).select("*").eq(column, profileId));

  const [profile, listings, favorites, favoriteSellers, savedSearches, recentlyViewed, notifications, addresses, businesses, offers, ordersAsBuyer, ordersAsSeller, reviewsWritten, reviewsReceived, reportsFiled, participations] =
    await Promise.all([
      byProfile("profiles", "id"),
      byProfile("listings", "seller_id"),
      byProfile("favorites", "profile_id"),
      byProfile("favorite_sellers", "profile_id"),
      byProfile("saved_searches", "profile_id"),
      byProfile("recently_viewed_listings", "profile_id"),
      byProfile("notifications", "profile_id"),
      byProfile("addresses", "profile_id"),
      byProfile("businesses", "owner_profile_id"),
      byProfile("offers", "buyer_id"),
      byProfile("orders", "buyer_id"),
      byProfile("orders", "seller_id"),
      byProfile("reviews", "reviewer_profile_id"),
      byProfile("reviews", "reviewee_profile_id"),
      byProfile("reports", "reporter_id"),
      byProfile("conversation_participants", "profile_id"),
    ]);

  // Second hop: rows that belong to the user through something they own.
  const listingIds = listings.map((l) => l.id);
  const orderIds = [...ordersAsBuyer, ...ordersAsSeller].map((o) => o.id);
  const conversationIds = participations.map((p) => p.conversation_id);
  const some = <T,>(ids: unknown[], f: () => Promise<T[]>) => (ids.length ? f() : Promise.resolve([] as T[]));
  const [listingMedia, listingTranslations, listingAttributes, listingAi, offersReceived, payments, shipments, lockerShipments, conversations, messages] = await Promise.all([
    some(listingIds, () => run("listing_media", db.from("listing_media").select("*").in("listing_id", listingIds))),
    some(listingIds, () => run("listing_translations", db.from("listing_translations").select("*").in("listing_id", listingIds))),
    some(listingIds, () => run("listing_attribute_values", db.from("listing_attribute_values").select("*").in("listing_id", listingIds))),
    some(listingIds, () => run("listing_ai_metadata", db.from("listing_ai_metadata").select("*").in("listing_id", listingIds))),
    some(listingIds, () => run("offers (received)", db.from("offers").select("*").in("listing_id", listingIds))),
    some(orderIds, () => run("payments", db.from("payments").select("*").in("order_id", orderIds))),
    some(orderIds, () => run("shipments", db.from("shipments").select("*").in("order_id", orderIds))),
    some(orderIds, () => run("locker_shipments", db.from("locker_shipments").select("*").in("order_id", orderIds))),
    some(conversationIds, () => run("conversations", db.from("conversations").select("*").in("id", conversationIds))),
    some(conversationIds, () => run("messages", db.from("messages").select("*").in("conversation_id", conversationIds))),
  ]);

  return {
    about: {
      service: "MarketitNow (https://marketitnow.net)",
      exported_at: new Date().toISOString(),
      format: "JSON. Every section is a list of database rows; ids link the sections together.",
      note: "Messages include those other people sent you in your conversations. To correct or delete anything, use your account settings or https://marketitnow.net/data-deletion.",
      incomplete_sections: errors,
    },
    account: {
      id: authUser.id,
      email: authUser.email ?? null,
      created_at: authUser.created_at ?? null,
      last_sign_in_at: authUser.last_sign_in_at ?? null,
      sign_in_methods: (authUser.identities ?? []).map((i) => i.provider),
    },
    profile: profile[0] ?? null,
    businesses,
    addresses,
    listings: { listings, media: listingMedia, translations: listingTranslations, attributes: listingAttributes, ai_metadata: listingAi },
    favorites: { listings: favorites, sellers: favoriteSellers },
    saved_searches: savedSearches,
    recently_viewed: recentlyViewed,
    notifications,
    messages: { conversations, participations, messages },
    offers: { made: offers, received: offersReceived },
    orders: { as_buyer: ordersAsBuyer, as_seller: ordersAsSeller, payments, shipments, locker_shipments: lockerShipments },
    reviews: { written: reviewsWritten, received: reviewsReceived },
    reports_filed: reportsFiled,
  };
}
