import { redirect } from "next/navigation";

// Signup now lives as a tab on /login (components/auth/auth-card.tsx) rather than a separate
// page — this redirect exists only so old links/bookmarks to /signup still land somewhere sane.
export default function SignupPage() {
  redirect("/login?tab=signup");
}
