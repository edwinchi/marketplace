import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { DocumentPage, Section, Field } from "@/components/documents/document-page";

export default async function CarSaleAgreementPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");

  return (
    <DocumentPage
      title="Car Sale Agreement"
      subtitle="A fill-in-the-blanks template both sides can sign when a car changes hands off-platform. Print it, fill it in by hand, and both keep a signed copy."
      disclaimer="Using this template doesn't guarantee the sale is valid or problem-free. Always confirm the seller actually owns the car, check for hidden defects, and take a test drive. AfroDeals is not a party to this agreement and isn't responsible for its use — adapt the wording to your country's requirements where needed."
    >
      <Section number={1} title="Parties">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-muted-foreground">SELLER</p>
            <Field label="Full name / business name" />
            <Field label="Address" />
            <Field label="Phone number" />
            <Field label="ID number" />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-muted-foreground">BUYER</p>
            <Field label="Full name" />
            <Field label="Address" />
            <Field label="Phone number" />
            <Field label="ID number" />
          </div>
        </div>
      </Section>

      <Section number={2} title="The vehicle">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Registration / plate number" />
          <Field label="Make / model / year" />
          <Field label="Chassis / VIN number" />
          <Field label="Fuel type" />
          <Field label="Odometer reading (mileage)" />
          <Field label="Colour" />
        </div>
        <p className="mt-4 mb-2 text-xs font-medium text-muted-foreground">Known damage or defects (if any)</p>
        <div className="h-16 rounded border border-dashed border-foreground/30" />
      </Section>

      <Section number={3} title="Seller's declaration">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>The seller confirms they are the rightful owner of the vehicle and are entitled to sell it.</li>
          <li>The seller confirms the vehicle is not currently pledged as collateral, seized, or under any legal claim.</li>
        </ul>
      </Section>

      <Section number={4} title="Price and payment">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Total agreed price (figures)" />
          <Field label="Total agreed price (in words)" />
        </div>
        <p className="mt-4 mb-2 text-xs font-medium text-muted-foreground">Payment method (tick one)</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><span className="size-4 rounded border" /> Cash</label>
          <label className="flex items-center gap-2"><span className="size-4 rounded border" /> Bank transfer</label>
          <label className="flex items-center gap-2"><span className="size-4 rounded border" /> Other, namely: <span className="inline-block w-32 border-b border-dashed border-foreground/30" /></label>
        </div>
      </Section>

      <Section number={5} title="Handover">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Date" />
          <Field label="Time" />
          <Field label="Location" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Responsibility for the vehicle (risk of loss or damage) passes to the buyer from this moment.
        </p>
      </Section>

      <Section number={6} title="Additional terms">
        <p className="mb-2 text-xs text-muted-foreground">
          E.g. repairs to be completed before handover, warranties offered, or anything else both sides agreed to.
        </p>
        <div className="h-24 rounded border border-dashed border-foreground/30" />
      </Section>

      <Section number={7} title="Signatures">
        <p className="mb-4 text-xs text-muted-foreground">Signed in duplicate — each party keeps one signed original.</p>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Field label="Date & place (seller)" />
            <div className="mt-6 h-10 border-b border-foreground/40" />
            <span className="text-xs text-muted-foreground">Seller's signature</span>
          </div>
          <div className="flex flex-col gap-3">
            <Field label="Date & place (buyer)" />
            <div className="mt-6 h-10 border-b border-foreground/40" />
            <span className="text-xs text-muted-foreground">Buyer's signature</span>
          </div>
        </div>
      </Section>
    </DocumentPage>
  );
}
