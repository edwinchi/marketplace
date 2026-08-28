import { redirect } from "next/navigation";

// /my-account itself has no content of its own — Profile is the default view, at its own path
// (/my-account/profile) so every section of the hub has a real, bookmarkable URL.
export default function MyAccountIndexPage() {
  redirect("/my-account/profile");
}
