// PostNL Labelling API (shipment/v2_2/label, confirm=true): one call pre-announces the parcel to
// PostNL, generates its barcode and returns the label PDF. Spec: developer.postnl.nl ->
// Send & Track -> Labelling webservice (swagger: api-sandbox.postnl.nl/v1/shipment/swagger.json).
//
// Off until a PostNL business contract's credentials exist:
//   POSTNL_API_KEY, POSTNL_CUSTOMER_CODE (e.g. "DEVC"), POSTNL_CUSTOMER_NUMBER (e.g. "11223344"),
//   POSTNL_SANDBOX=1 to use api-sandbox.postnl.nl while testing.
// Domestic NL parcels only for now (product 3085, standard delivery).

const PRODUCT_CODE_STANDARD = "3085";
const DEFAULT_WEIGHT_GRAMS = 2000;

export function isPostnlConfigured(): boolean {
  return !!(process.env.POSTNL_API_KEY && process.env.POSTNL_CUSTOMER_CODE && process.env.POSTNL_CUSTOMER_NUMBER);
}

function apiBase(): string {
  return process.env.POSTNL_SANDBOX === "1" ? "https://api-sandbox.postnl.nl" : "https://api.postnl.nl";
}

// "Damrak 1A" -> { street: "Damrak", houseNr: "1", houseNrExt: "A" }. Addresses are stored (and
// collected by Stripe) as one line, but PostNL needs the parts separately. Null when no house
// number can be found -- the caller asks the seller to fix the address instead of guessing.
export function splitStreetAndNumber(line: string): { street: string; houseNr: string; houseNrExt: string } | null {
  // The house number is the LAST number on the line ("Plein 1944 12" -> 12). A suffix either
  // follows a hyphen/slash ("263-II") or starts with a letter ("1A", "50 bis"), so a bare trailing
  // number is never mistaken for a suffix.
  const m = line.trim().match(/^(.*?\D)\s*(\d+)(?:\s*[-/]\s*([A-Za-z0-9]{1,6})|\s*([A-Za-z][A-Za-z0-9]{0,5}))?\s*$/);
  if (!m || !m[1].trim()) return null;
  return { street: m[1].trim().replace(/[,\s]+$/, ""), houseNr: m[2], houseNrExt: m[3] ?? m[4] ?? "" };
}

export function normalizeDutchPostcode(postcode: string): string {
  return postcode.replace(/\s/g, "").toUpperCase();
}

// "dd-mm-yyyy hh:mm:ss", as the API requires.
export function postnlTimestamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export type PostnlAddress = { name: string; streetLine: string; postcode: string; city: string };

export type LabelResult = { barcode: string; pdfBase64: string } | { error: string };

export async function createPostnlLabel({
  orderReference,
  sender,
  receiver,
  receiverEmail,
}: {
  orderReference: string;
  sender: PostnlAddress;
  receiver: PostnlAddress;
  receiverEmail?: string | null;
}): Promise<LabelResult> {
  if (!isPostnlConfigured()) return { error: "PostNL shipping isn't set up yet." };

  const senderParts = splitStreetAndNumber(sender.streetLine);
  if (!senderParts) return { error: "Your address needs a house number (e.g. \"Damrak 1A\") — update it under Addresses." };
  const receiverParts = splitStreetAndNumber(receiver.streetLine);
  if (!receiverParts) return { error: "The buyer's address has no house number — message them to confirm it." };

  const body = {
    Customer: {
      CustomerCode: process.env.POSTNL_CUSTOMER_CODE,
      CustomerNumber: process.env.POSTNL_CUSTOMER_NUMBER,
      // The sender printed on the label (and where undeliverable parcels go back to): the seller.
      Address: {
        AddressType: "02",
        Name: sender.name.slice(0, 35),
        Street: senderParts.street,
        HouseNr: senderParts.houseNr,
        HouseNrExt: senderParts.houseNrExt || undefined,
        Zipcode: normalizeDutchPostcode(sender.postcode),
        City: sender.city,
        Countrycode: "NL",
      },
    },
    Message: {
      MessageID: orderReference.replace(/-/g, "").slice(0, 12),
      MessageTimeStamp: postnlTimestamp(new Date()),
      Printertype: "GraphicFile|PDF",
    },
    Shipments: [
      {
        Addresses: [
          {
            AddressType: "01",
            Name: receiver.name.slice(0, 35),
            Street: receiverParts.street,
            HouseNr: receiverParts.houseNr,
            HouseNrExt: receiverParts.houseNrExt || undefined,
            Zipcode: normalizeDutchPostcode(receiver.postcode),
            City: receiver.city,
            Countrycode: "NL",
          },
        ],
        ...(receiverEmail ? { Contacts: [{ ContactType: "01", Email: receiverEmail }] } : {}),
        Dimension: { Weight: DEFAULT_WEIGHT_GRAMS },
        ProductCodeDelivery: PRODUCT_CODE_STANDARD,
        Reference: orderReference.slice(0, 35),
      },
    ],
  };

  try {
    const res = await fetch(`${apiBase()}/shipment/v2_2/label?confirm=true`, {
      method: "POST",
      headers: { apikey: process.env.POSTNL_API_KEY!, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const json = (await res.json().catch(() => null)) as {
      ResponseShipments?: { Barcode?: string; Labels?: { Content?: string; Labeltype?: string }[] }[];
      Errors?: { Description?: string; ErrorMsg?: string }[];
      fault?: { faultstring?: string };
    } | null;
    if (!res.ok) {
      const detail = json?.Errors?.[0]?.Description ?? json?.Errors?.[0]?.ErrorMsg ?? json?.fault?.faultstring ?? `HTTP ${res.status}`;
      console.error(`PostNL label request failed for order ${orderReference}:`, detail);
      return { error: `PostNL couldn't create the label: ${detail}` };
    }
    const shipment = json?.ResponseShipments?.[0];
    const label = shipment?.Labels?.find((l) => l.Labeltype === "Label") ?? shipment?.Labels?.[0];
    if (!shipment?.Barcode || !label?.Content) return { error: "PostNL returned no label — try again in a moment." };
    return { barcode: shipment.Barcode, pdfBase64: label.Content };
  } catch (err) {
    console.error(`PostNL label request errored for order ${orderReference}:`, err);
    return { error: "Couldn't reach PostNL — try again in a moment." };
  }
}

// "Ship with PostNL" is offered at checkout only where a label can actually be made: PostNL is
// configured, the seller offers delivery, and it's a domestic Dutch, EUR-priced listing.
export function canShipWithPostnl(listing: { delivery_available: boolean | null; currency_code: string }, listingCountryCode: string | null | undefined): boolean {
  return isPostnlConfigured() && !!listing.delivery_available && listing.currency_code === "EUR" && listingCountryCode === "NL";
}

// Public Track & Trace page for a barcode + destination postcode.
export function postnlTrackingUrl(barcode: string, postcode: string): string {
  return `https://jouw.postnl.nl/track-and-trace/${encodeURIComponent(barcode)}-NL-${encodeURIComponent(normalizeDutchPostcode(postcode))}`;
}
