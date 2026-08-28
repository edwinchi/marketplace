// Seeds a handful of realistic demo listings with real (verified-loading) stock photos, so the
// browse UI looks like a populated marketplace instead of an empty pilot. Safe to re-run — the
// demo seller is looked up by username first. Photos are Unsplash URLs stored directly in
// listing_media.storage_key (see lib/media.ts for why that's fine for now).
//
// Usage: node scripts/seed-demo-listings.mjs   (reads .env.local for Supabase URL + service key)
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.resolve(import.meta.dirname, "..", ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = "demo-seller@afrodeals.internal";
const DEMO_USERNAME = "afrodeals_demo";

const LISTINGS = [
  {
    category: "cars-passenger-cars",
    title: "2020 Executive Sedan — Well Maintained",
    description: "Smooth ride, recently serviced, no accidents. Comes with full service history.",
    price: 8500, currency: "NGN", city: "Lagos", country: "NG",
    photo: "1503376780353-7e6692767b70",
  },
  {
    category: "womens-clothing",
    title: "Mixed Designer Clothing Bundle",
    description: "Assorted tops, jackets and accessories, gently used, various sizes.",
    price: 15000, currency: "KES", city: "Nairobi", country: "KE",
    photo: "1555529771-7888783a18d3",
  },
  {
    category: "home-interior-sofas-and-chairs",
    title: "Modern Mustard Accent Armchair",
    description: "Comfortable fabric armchair, great condition, from a smoke-free home.",
    price: 95000, currency: "XOF", city: "Abidjan", country: "CI",
    photo: "1586023492125-27b2c045efd7",
  },
  {
    category: "mens-clothing-coats-and-jackets",
    title: "Men's Jacket & Shirt Bundle",
    description: "Several barely-worn jackets and shirts, mixed sizes, from a menswear collection.",
    price: 35000, currency: "XOF", city: "Dakar", country: "SN",
    photo: "1441986300917-64674bd600d8",
  },
  {
    category: "telecom",
    title: "Wireless Headphones — Like New",
    description: "Over-ear wireless headphones, barely used, comes in original box.",
    price: 18000, currency: "NGN", city: "Lagos", country: "NG",
    photo: "1524678606370-a47ad25cb82a",
  },
  {
    category: "home-interior-sofas-and-chairs",
    title: "Scandinavian Dining Chair",
    description: "Solid wood-legged dining chair, minimal wear, sold individually.",
    price: 8500, currency: "KES", city: "Nairobi", country: "KE",
    photo: "1592078615290-033ee584e267",
  },
  {
    category: "telecom",
    title: "iPhone 11 Pro — Excellent Condition",
    description: "Unlocked, battery health 89%, minor case wear only. Charger included.",
    price: 285000, currency: "XOF", city: "Abidjan", country: "CI",
    photo: "1592750475338-74b7b21085ab",
  },
  {
    category: "computers-software-laptops",
    title: "Dell XPS 13 Laptop",
    description: "13-inch, 16GB RAM, 512GB SSD. Great for work and everyday use.",
    price: 420000, currency: "XOF", city: "Dakar", country: "SN",
    photo: "1593642702821-c8da6771f0c6",
  },
  {
    category: "computers-software-laptops",
    title: "MacBook Pro — Great Condition",
    description: "Fast, reliable, minor cosmetic wear. Original charger included.",
    price: 650000, currency: "NGN", city: "Lagos", country: "NG",
    photo: "1517336714731-489689fd1ca8",
  },
  {
    category: "home-interior",
    title: "Home Décor Bundle: Clock, Lamp & Planter",
    description: "Wall clock, desk lamp and a small planter — sold together, great starter set.",
    price: 6500, currency: "KES", city: "Nairobi", country: "KE",
    photo: "1533090161767-e6ffed986c88",
  },
  {
    category: "sports-fitness",
    title: "Insulated Steel Water Bottle",
    description: "Keeps drinks cold for 24h, barely used, no dents.",
    price: 7000, currency: "XOF", city: "Abidjan", country: "CI",
    photo: "1602143407151-7111542de6e8",
  },
  {
    category: "computers-software",
    title: "Wireless Keyboard & Mouse Set",
    description: "Compact wireless keyboard and mouse combo, works perfectly.",
    price: 25000, currency: "XOF", city: "Dakar", country: "SN",
    photo: "1493723843671-1d655e66ac1c",
  },
];

async function getOrCreateDemoSeller() {
  const { data: existing } = await supabase.from("profiles").select("id").eq("username", DEMO_USERNAME).single();
  if (existing) return existing.id;

  const { data: created, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { username: DEMO_USERNAME, display_name: "AfroDeals Demo Seller" },
  });
  if (error) throw error;

  // Trigger runs in the same transaction as the auth.users insert — should already exist.
  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", created.user.id).single();
  if (!profile) throw new Error("handle_new_user trigger did not create a profile row");
  return profile.id;
}

async function main() {
  const sellerId = await getOrCreateDemoSeller();
  console.log("Demo seller profile:", sellerId);

  const { data: categories } = await supabase.from("categories").select("id, stable_key");
  const categoryIdByKey = new Map(categories.map((c) => [c.stable_key, c.id]));

  for (const item of LISTINGS) {
    const categoryId = categoryIdByKey.get(item.category);
    if (!categoryId) {
      console.warn("Skipping, unknown category:", item.category, item.title);
      continue;
    }

    const { data: location, error: locError } = await supabase
      .from("locations")
      .insert({ city: item.city, country_code: item.country })
      .select("id")
      .single();
    if (locError) { console.warn("location insert failed:", locError.message); continue; }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .insert({
        seller_id: sellerId,
        category_id: categoryId,
        location_id: location.id,
        source_language: "en",
        title: item.title,
        description: item.description,
        price_minor: Math.round(item.price * 100),
        currency_code: item.currency,
        status: "active",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (listingError) { console.warn("listing insert failed:", listingError.message); continue; }

    await supabase.from("listing_media").insert({
      listing_id: listing.id,
      storage_key: `https://images.unsplash.com/photo-${item.photo}?auto=format&fit=crop&q=80&w=800`,
      media_type: "image",
      sort_order: 0,
      moderation_status: "approved",
    });

    console.log("Created:", item.title, "->", listing.id);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
