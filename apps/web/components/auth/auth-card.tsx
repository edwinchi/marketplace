"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { cn } from "@/lib/utils";

export function AuthCard({ initialTab, next = "/" }: { initialTab: "login" | "signup"; next?: string }) {
  const t = useTranslations("Auth");
  const [tab, setTab] = useState(initialTab);

  return (
    <Card className="w-full overflow-hidden py-0">
      <div className="flex border-b">
        {(["login", "signup"] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={cn(
              "flex-1 border-b-2 py-3 text-sm font-medium transition-colors",
              tab === tabKey ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tabKey === "login" ? t("logIn") : t("createAccount")}
          </button>
        ))}
      </div>
      <CardContent className="pt-6 pb-6">
        <h1 className="mb-1 text-center text-xl font-semibold">{tab === "login" ? t("logIn") : t("createAnAccount")}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {tab === "login" ? (
            <>
              {t("noAccountYet")}{" "}
              <button type="button" onClick={() => setTab("signup")} className="underline">
                {t("registerHere")}
              </button>
            </>
          ) : (
            <>
              {t("alreadyHaveAccount")}{" "}
              <button type="button" onClick={() => setTab("login")} className="underline">
                {t("logInNow")}
              </button>
            </>
          )}
        </p>
        {tab === "login" ? <LoginForm next={next} /> : <SignupForm next={next} />}
      </CardContent>
    </Card>
  );
}
