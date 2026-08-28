export const metadata = { title: "Terms of Use — AfroDeals" };

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">Terms of Use</h1>
      <p className="mb-6 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        Draft, pilot-stage placeholder — not yet reviewed by legal counsel. Do not treat this as a
        finalized or enforceable agreement.
      </p>

      <div className="flex flex-col gap-4 text-sm text-muted-foreground">
        <p>
          AfroDeals is a platform that connects buyers and sellers. We are not a party to any
          transaction between users, and we do not guarantee the quality, safety, or legality of
          items listed.
        </p>
        <p>
          Users are responsible for the accuracy of their own listings and for complying with
          local laws, including any restrictions on items that cannot be sold.
        </p>
        <p>
          Listings for stolen goods, counterfeit items, weapons, or anything illegal in the
          seller&apos;s jurisdiction are prohibited and will be removed.
        </p>
        <p>
          We may suspend or remove accounts and listings that violate these terms or that we
          reasonably believe are fraudulent or harmful to other users.
        </p>
      </div>
    </div>
  );
}
