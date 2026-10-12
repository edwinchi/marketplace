// Digital Asset Links -- lets a Google Play build of MarketitNow (a Trusted Web Activity wrapping
// this site, e.g. generated with Bubblewrap/PWABuilder; see agents.md §14) prove it belongs to
// this domain, so Android opens it full screen with no browser address bar. Returns an empty list
// until the Play app's signing details are set, which is the correct "no linked apps" answer.
//
// ANDROID_APP_PACKAGE: the app's package name, e.g. net.marketitnow.twa
// ANDROID_APP_SHA256_FINGERPRINTS: comma-separated SHA-256 signing-cert fingerprints, from Play
//   Console -> Test and release -> App integrity -> App signing key certificate.
export function GET() {
  const packageName = process.env.ANDROID_APP_PACKAGE;
  const fingerprints = (process.env.ANDROID_APP_SHA256_FINGERPRINTS ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  const statements =
    packageName && fingerprints.length > 0
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: { namespace: "android_app", package_name: packageName, sha256_cert_fingerprints: fingerprints },
          },
        ]
      : [];

  return Response.json(statements, { headers: { "Cache-Control": "public, max-age=3600" } });
}
