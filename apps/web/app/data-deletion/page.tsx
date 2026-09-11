import Link from "next/link";

export const metadata = { title: "Data Deletion Instructions" };

// A standalone page (not folded into /privacy) because Facebook's app settings specifically ask
// for a Data Deletion Instructions URL, separate from a general privacy policy -- this describes
// exactly what deleteAccount() (components/delete-account-button.tsx,
// app/my-account/profile/edit/actions.ts) actually does, not an idealized version of it.
export default function DataDeletionPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">Data Deletion Instructions</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        How to delete your AfroDeals account and personal data, and exactly what that does.
      </p>

      <div className="flex flex-col gap-6 text-sm text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Delete your account yourself</h2>
          <p>
            Sign in, go to <Link href="/my-account/profile" className="underline hover:text-foreground">My Account</Link>, and
            use the delete-account option there. This takes effect immediately — no waiting period, no confirmation email
            required.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">What actually happens</h2>
          <ul className="flex flex-col gap-1.5 pl-1">
            {[
              "Your login is permanently disabled — the underlying account is deleted, so your old email and password (or Google/Facebook sign-in) can no longer be used to sign in.",
              "Your profile's personal details (display name, phone number, postal code, preferences) are cleared.",
              "Your listings, messages, and past orders are not immediately erased byte-for-byte. They're de-identified and retained the way a paper receipt would be — other users you traded or messaged with, and our own records, keep an honest history of what happened, but it's no longer tied to an active, sign-in-able account of yours.",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Want something more specific deleted?</h2>
          <p>
            If you want a specific piece of data removed rather than your whole account — or you signed in with Facebook and
            want us to confirm what, specifically, we hold from that connection — contact us through our{" "}
            <Link href="/feedback" className="underline hover:text-foreground">Feedback page</Link> and we&apos;ll handle it directly.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Payment records</h2>
          <p>
            If you&apos;ve made or received a payment through AfroDeals, our payment provider (Stripe) keeps its own
            transaction records independently of your AfroDeals account, as required for fraud prevention and tax
            compliance — deleting your AfroDeals account doesn&apos;t delete Stripe&apos;s own records of a completed
            payment.
          </p>
        </section>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        See our <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link> for the fuller picture of what we collect and why.
      </p>
    </div>
  );
}
