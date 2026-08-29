import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { DocumentPage, Section, CheckItem } from "@/components/documents/document-page";

export default async function BuyingChecklistPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");

  return (
    <DocumentPage
      title="Checklist Before You Buy a Car"
      subtitle="Not exhaustive — just a set of practical things to check on a used car before you commit. If you want real certainty about hidden defects, have it inspected by a qualified mechanic."
      disclaimer="This checklist is a helper, not a guarantee. AfroDeals doesn't inspect or vouch for any vehicle listed on the platform, and isn't a party to any sale — use this at your own judgement."
    >
      <Section number={1} title="The car itself">
        <div className="flex flex-col gap-4">
          <CheckItem title="Body and paint">
            Check it in daylight — damage is easier to see. Look for dents, leaks, rust, scratches, and misaligned
            panels (doors, hood, trunk). Colour mismatches can hint at earlier repairs — ask the owner about any
            past damage and note it in the sale agreement.
          </CheckItem>
          <CheckItem title="Exhaust">
            Loud or unusual noise can point to a faulty exhaust. Watch for blue smoke on startup.
          </CheckItem>
          <CheckItem title="Tyres">
            Tread should be well above the wear indicators, all four (plus the spare) roughly matched.
          </CheckItem>
          <CheckItem title="Fluids">
            Check the engine oil, brake fluid, and coolant levels and colour.
          </CheckItem>
          <CheckItem title="Keys">
            Ask for the spare key and confirm both work on the doors and trunk. Make sure you actually receive the
            spare at handover.
          </CheckItem>
          <CheckItem title="Suspension">
            Push down firmly on each corner and release — the car should settle within two bounces.
          </CheckItem>
          <CheckItem title="Lights and wipers">
            Check headlights, indicators, brake lights, wipers, and the heating/AC.
          </CheckItem>
        </div>
      </Section>

      <Section number={2} title="The test drive">
        <div className="flex flex-col gap-4">
          <CheckItem title="Engine">Should idle and run smoothly, without hesitation or jerking.</CheckItem>
          <CheckItem title="Brakes">
            The car pulling to one side, or the pedal vibrating under braking, can mean worn brakes.
          </CheckItem>
          <CheckItem title="Clutch and gears">
            Shifting should feel smooth and easy. On a manual, check where the clutch engages — if it's very high,
            that's not a good sign.
          </CheckItem>
          <CheckItem title="Steering">Watch for excess play, and confirm the car tracks straight without correction.</CheckItem>
          <CheckItem title="Overall handling">
            Should feel stable through corners and respond predictably. Try a couple of different road surfaces if
            you can.
          </CheckItem>
        </div>
      </Section>

      <Section number={3} title="The paperwork">
        <div className="flex flex-col gap-4">
          <CheckItem title="Registration documents">
            Ask for the original vehicle registration/ownership documents — not photocopies.
          </CheckItem>
          <CheckItem title="Seller's identification">
            Confirm the seller's ID matches the name on the registration documents, and have them confirm in
            writing that they're the actual owner.
          </CheckItem>
          <CheckItem title="Cross-check the details">
            Compare the chassis number, colour, and other details on the documents against the actual car.
          </CheckItem>
          <CheckItem title="Roadworthiness / inspection certificate">
            If your country requires one, ask for the latest certificate and check its expiry date.
          </CheckItem>
          <CheckItem title="Maintenance history">
            Ask for a service book or repair invoices if available.
          </CheckItem>
        </div>
      </Section>

      <Section number={4} title="Notes">
        <div className="h-28 rounded border border-dashed border-foreground/30" />
      </Section>
    </DocumentPage>
  );
}
