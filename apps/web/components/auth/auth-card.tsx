"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { cn } from "@/lib/utils";

export function AuthCard({ initialTab, next = "/" }: { initialTab: "login" | "signup"; next?: string }) {
  const [tab, setTab] = useState(initialTab);

  return (
    <Card className="w-full overflow-hidden py-0">
      <div className="flex border-b">
        {(["login", "signup"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 border-b-2 py-3 text-sm font-medium transition-colors",
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "login" ? "Log in" : "Create account"}
          </button>
        ))}
      </div>
      <CardContent className="pt-6 pb-6">
        <h1 className="mb-1 text-center text-xl font-semibold">{tab === "login" ? "Log in" : "Create an account"}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {tab === "login" ? (
            <>
              No account yet?{" "}
              <button type="button" onClick={() => setTab("signup")} className="underline">
                Register here
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => setTab("login")} className="underline">
                Log in now
              </button>
            </>
          )}
        </p>
        {tab === "login" ? <LoginForm next={next} /> : <SignupForm next={next} />}
      </CardContent>
    </Card>
  );
}
