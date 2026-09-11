export const metadata = { title: "Privacy Policy" };

// English only for now, unlike /terms's full 4-language i18n -- a legal document is exactly the
// kind of text where a wrong or careless translation carries more risk than shipping it in one
// language first (matching /terms's own explicit "not written or checked by a qualified lawyer"
// disclaimer below). Add translations later with real review, not as a quick pass.
export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">Privacy Policy</h1>
      <p className="mb-1 text-xs text-muted-foreground">Last updated 11 September 2026</p>
      <p className="mb-8 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        This describes what AfroDeals actually collects and does today, in plain language. It draws on GDPR and common
        marketplace practice as a starting point, but it is not written or checked by a qualified lawyer in any specific
        jurisdiction — do not treat it as a finalized, enforceable, or legally compliant document.
      </p>

      <div className="flex flex-col gap-8 text-sm text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">1. Who we are</h2>
          <p>
            AfroDeals is operated by Atlantean Globals Services, a company registered in the Netherlands under KVK number
            89423496 (&quot;AfroDeals&quot;, &quot;we&quot;, &quot;us&quot;). We are the data controller for the personal
            information described below. You can reach us with any privacy question or request through our{" "}
            <a href="/feedback" className="underline hover:text-foreground">Feedback page</a>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">2. What we collect</h2>
          <ul className="flex flex-col gap-1.5 pl-1">
            {[
              "Account information: email address, username, display name, and password (stored securely by our authentication provider, never in plain text) — or, if you sign in with Google or Facebook, the basic profile information those services share with us (name, email, profile photo).",
              "Profile details you choose to add: phone number, postal code, preferred country/city, and marketing or notification preferences.",
              "Listing content: titles, descriptions, prices, categories, locations, and photos you post.",
              "Messages you send to other users through AfroDeals, and reviews you leave or receive.",
              "Payment information when you use Direct Buy or subscribe to Seller Pro — your card and bank details are collected and processed directly by Stripe, our payment provider; we never see or store full card numbers.",
              "Basic visit data (pages viewed, approximate timing) used to keep our traffic statistics honest — not tied to advertising profiles.",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">3. AI features</h2>
          <p>
            Optional AI features (photo-based listing autofill, description polishing, translation, price suggestions, and
            seller insights) send the specific photo or text you submit to a third-party AI provider — currently one or more
            of Groq, Google Gemini, GitHub Models, OpenRouter, or OpenAI, depending on which is available at the time. Only
            the content needed for that one request is sent, only when you actually use the feature. These providers process
            it to generate a response; we don&apos;t control their retention beyond what they publish in their own policies.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">4. Cookies</h2>
          <p>
            We use essential cookies to keep you signed in and remember basic preferences (like your display currency) — these
            can&apos;t be turned off without breaking core functionality. Optional analytics cookies, which help us understand
            how AfroDeals is used, are only set if you accept them in the cookie banner shown on your first visit; choosing
            &quot;Essential only&quot; keeps them off.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">5. Who we share it with</h2>
          <p>
            We share data only with the providers that run AfroDeals on our behalf, and only what each one needs to do its
            job: Supabase (database and authentication), Vercel (hosting), Stripe (payments), Resend (transactional email),
            and — only when you use an AI feature — the specific AI provider handling that request. We do not sell personal
            data, and we do not share it with advertisers.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">6. How long we keep it</h2>
          <p>
            Account and listing data is kept for as long as your account is active. A listing you delete is kept for 30 days
            (in case you want it back) before being permanently removed by an automated weekly cleanup. Deleting your account
            (see Section 8) removes your ability to sign in and clears your profile&apos;s personal details; some records tied
            to real transactions or messages with other users may be retained in de-identified form, the same way a paper
            receipt would be, rather than deleted outright — see Section 8 for exactly what that means.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">7. Your rights</h2>
          <p>
            If you&apos;re in the European Economic Area (or anywhere with similar protections), you have the right to access,
            correct, or erase your personal data, and to object to or restrict certain uses of it. You can review and update
            your own profile information at any time from My Account, and request erasure by deleting your account — see our{" "}
            <a href="/data-deletion" className="underline hover:text-foreground">Data Deletion Instructions</a> for exactly
            what that does. For any other request, contact us through our{" "}
            <a href="/feedback" className="underline hover:text-foreground">Feedback page</a>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">8. Children</h2>
          <p>AfroDeals is not directed at children, and you must be at least 18 (or the age of majority where you live) to create an account.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">9. Changes to this policy</h2>
          <p>We may update this policy as AfroDeals grows or legal requirements change. We&apos;ll update the date at the top of this page when we do.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">10. Contact</h2>
          <p>
            Questions about this policy or your data can be sent through our{" "}
            <a href="/feedback" className="underline hover:text-foreground">Feedback page</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
