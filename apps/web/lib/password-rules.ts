// Shared between the live client-side checklist (components/auth/signup-form.tsx) and the server
// action that actually creates the account (app/signup/actions.ts), so the two can't drift.
export const PASSWORD_RULES = [
  { key: "length", label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
  { key: "digit", label: "At least one number", test: (pw: string) => /\d/.test(pw) },
  { key: "special", label: "At least one special character", test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
] as const;

export function isPasswordValid(password: string) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
