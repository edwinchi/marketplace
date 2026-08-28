"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Factor = { id: string; status: string; factor_type: string };

// Real Supabase Auth MFA (TOTP) — enroll() returns a ready-to-render QR code data URI directly,
// no separate QR library needed. challenge()+verify() is the standard two-step confirm.
export function TwoFactorSetup() {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setFactors(data?.totp ?? []);
    });
  }, [supabase]);

  async function startEnroll() {
    setError(null);
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error) return setError(error.message);
    setEnrolling({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirmEnroll() {
    if (!enrolling) return;
    setError(null);
    setBusy(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
    if (challengeError) {
      setBusy(false);
      return setError(challengeError.message);
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrolling.factorId,
      challengeId: challenge.id,
      code,
    });
    setBusy(false);
    if (verifyError) return setError(verifyError.message);
    setEnrolling(null);
    setCode("");
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
  }

  async function unenroll(factorId: string) {
    setBusy(true);
    await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
  }

  if (factors === null) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const active = factors.find((f) => f.status === "verified");

  if (active) {
    return (
      <div className="flex flex-col gap-3">
        <Badge>Two-factor authentication is on</Badge>
        <Button variant="outline" size="sm" className="w-fit" disabled={busy} onClick={() => unenroll(active.id)}>
          Turn off
        </Button>
      </div>
    );
  }

  if (enrolling) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Scan this with an authenticator app (Google Authenticator, Authy, etc.):</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- data: URI from Supabase, next/image can't optimize it */}
        <img src={enrolling.qrCode} alt="Two-factor authentication QR code" className="size-48 self-start rounded border" />
        <p className="text-xs break-all text-muted-foreground">Or enter this key manually: {enrolling.secret}</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="totp-code">6-digit code</Label>
          <Input id="totp-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} className="w-32" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEnrolling(null)}>Cancel</Button>
          <Button size="sm" disabled={busy || code.length !== 6} onClick={confirmEnroll}>Confirm</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button size="sm" className="w-fit" disabled={busy} onClick={startEnroll}>
        Set up two-factor authentication
      </Button>
    </div>
  );
}
