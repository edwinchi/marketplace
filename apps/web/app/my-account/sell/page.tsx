import { redirect } from "next/navigation";

// "Sell" and "My listings" are the same content (your posted ads) — kept as two real routes
// since both paths were asked for, rather than picking one and silently dropping the other.
export default function SellRedirectPage() {
  redirect("/my-account/my-listings");
}
