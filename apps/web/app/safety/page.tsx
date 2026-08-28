export const metadata = { title: "Safety Center — AfroDeals" };

const TIPS = [
  {
    title: "Meet in a safe, public place",
    body: "For local pickups, choose a well-lit public location, ideally during daytime.",
  },
  {
    title: "Inspect the item before paying",
    body: "Check that the item matches the listing description and photos before handing over any money.",
  },
  {
    title: "Be wary of prices that seem too good to be true",
    body: "Unusually low prices on high-value items are a common scam pattern.",
  },
  {
    title: "Keep communication on-platform",
    body: "Be cautious of anyone pushing you to move the conversation off AfroDeals early.",
  },
  {
    title: "Never share one-time passcodes",
    body: "No legitimate buyer or seller needs an OTP or verification code sent to your phone.",
  },
];

export default function SafetyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Safety Center</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        A few simple habits go a long way toward trading safely, whether you&apos;re buying or
        selling.
      </p>
      <ul className="flex flex-col gap-4">
        {TIPS.map((tip) => (
          <li key={tip.title}>
            <p className="font-medium">{tip.title}</p>
            <p className="text-sm text-muted-foreground">{tip.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
