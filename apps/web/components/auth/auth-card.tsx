"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { cn } from "@/lib/utils";

export function AuthCard({ initialTab, next = "/" }: { initialTab: "login" | "signup"; next?: string }) {
  const t = useTranslations("Auth");
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="w-full rounded-3xl border border-white/20 bg-card/95 p-2 shadow-2xl shadow-black/40 ring-1 ring-black/5 backdrop-blur-xl">
      <div className="relative flex rounded-2xl bg-muted p-1">
        <div
          aria-hidden
          className={cn(
            "absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-card shadow-sm transition-transform duration-300 ease-out",
            tab === "signup" && "translate-x-full",
          )}
        />
        {(["login", "signup"] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={cn(
              "relative z-10 flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors",
              tab === tabKey ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tabKey === "login" ? t("logIn") : t("createAccount")}
          </button>
        ))}
      </div>

      <div className="px-5 pt-7 pb-6 sm:px-7">
        <h1 className="mb-1 text-center text-xl font-bold tracking-tight">{tab === "login" ? t("logIn") : t("createAnAccount")}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {tab === "login" ? (
            <>
              {t("noAccountYet")}{" "}
              <button
                type="button"
                onClick={() => setTab("signup")}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {t("registerHere")}
              </button>
            </>
          ) : (
            <>
              {t("alreadyHaveAccount")}{" "}
              <button
                type="button"
                onClick={() => setTab("login")}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {t("logInNow")}
              </button>
            </>
          )}
        </p>
        {tab === "login" ? <LoginForm next={next} /> : <SignupForm next={next} />}
      </div>
    </div>
  );
}
