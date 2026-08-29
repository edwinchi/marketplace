import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { DocumentPage, Section, Field } from "@/components/documents/document-page";

export default async function CarSaleReceiptPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");

  return (
    <DocumentPage
      title="Payment Receipt"
      subtitle="A simple proof-of-payment both sides can sign at handover — bring it along with the sale agreement."
      disclaimer="This template is a convenience, not legal advice. AfroDeals is not a party to any agreement made between a buyer and seller, and isn't responsible for how this receipt is used."
    >
      <Section number={1} title="The vehicle">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Registration / plate number" />
          <Field label="Make / model / year" />
          <Field label="Chassis / VIN number" />
          <Field label="Fuel type" />
          <Field label="Odometer reading (mileage)" />
        </div>
      </Section>

      <Section number={2} title="Amount and confirmation">
        <Field label="Amount received (figures and currency)" />
        <p className="mt-6 text-sm">
          I confirm receipt of full payment for the vehicle described above.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="Seller's name" />
          <Field label="Date & place" />
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:w-1/2">
          <div className="h-10 border-b border-foreground/40" />
          <span className="text-xs text-muted-foreground">Seller's signature</span>
        </div>
      </Section>
    </DocumentPage>
  );
}
