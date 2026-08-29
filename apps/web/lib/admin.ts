// Single real admin account, not a role/permissions system -- there's exactly one person this
// dashboard and the AI usage-cap bypass are for right now. Revisit as a real `is_admin` column +
// RLS policy if a second admin is ever needed.
export const ADMIN_EMAIL = "apehgongedwin@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL;
}
