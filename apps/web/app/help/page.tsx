export const metadata = { title: "Help & Info — AfroDeals" };

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Help & Info</h1>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-medium">Buying on AfroDeals</h2>
        <p className="text-sm text-muted-foreground">
          Browse or search listings, and message a seller directly from a listing page to ask
          questions or arrange pickup. Always review a seller&apos;s listing details carefully
          before agreeing to buy.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-medium">Selling on AfroDeals</h2>
        <p className="text-sm text-muted-foreground">
          Tap &quot;Post an ad&quot;, choose a category, and fill in the details buyers will want
          to know — price, condition, and location. You can edit or remove your listing at any
          time from &quot;My listings&quot;.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Need more help?</h2>
        <p className="text-sm text-muted-foreground">
          See our <a href="/safety" className="underline">Safety Center</a> for tips on trading
          safely.
        </p>
      </section>
    </div>
  );
}
