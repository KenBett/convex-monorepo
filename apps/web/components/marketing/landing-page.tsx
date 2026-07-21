"use client";

import { Button } from "@heroui/react";
import {
  ArrowRight,
  Leaf,
  MessageSquareText,
  Sprout,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { siteConfig } from "@/config/site";

import { HeroBuyerChatPreview } from "./hero-buyer-chat-preview";
import { VunrLogo } from "./vunr-logo";

const FEATURES = [
  {
    icon: MessageSquareText,
    title: "Ask in plain language",
    description:
      "Buyers describe what they need — crop, quantity, location, budget — and Vunr finds matching listings instantly.",
  },
  {
    icon: Sprout,
    title: "Farmers stay in control",
    description:
      "List produce, set grades and prices, and manage orders from one dashboard built for agricultural trade.",
  },
  {
    icon: Truck,
    title: "Live availability",
    description:
      "Every search reflects real inventory. Sold-out listings drop out automatically — no stale offers.",
  },
] as const;

const LANDING_NAV_SIGN_IN =
  "rounded-full px-4 py-2 text-sm font-medium text-white transition-colors hover:text-white/90";

const LANDING_PRIMARY_BUTTON =
  "rounded-full bg-white font-semibold text-brand-deep shadow-sm transition-[filter] duration-200 hover:brightness-95";

const LANDING_SURFACE_CARD =
  "border border-brand-accent-highlight/15 bg-brand-accent-highlight/6 shadow-sm";

const NAV_SCROLL_ENTER = 24;
const NAV_SCROLL_EXIT = 8;

function LandingNav() {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;

    if (!header) return;

    let frame = 0;
    let scrolled = header.classList.contains("is-scrolled");

    const sync = () => {
      frame = 0;
      const y = window.scrollY;
      const next = scrolled ? y > NAV_SCROLL_EXIT : y > NAV_SCROLL_ENTER;

      if (next === scrolled) return;
      scrolled = next;
      header.classList.toggle("is-scrolled", scrolled);
    };

    const onScroll = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(sync);
    };

    sync();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header ref={headerRef} className="landing-nav sticky top-0 z-50 w-full">
      <div className="landing-nav__inner mx-auto flex w-full items-center justify-between">
        <Link
          className="landing-nav__logo flex items-center gap-2.5 text-brand-accent-highlight"
          href="/"
        >
          <VunrLogo className="text-brand-accent-highlight" size={36} />
          <span className="landing-nav__brand font-semibold tracking-[-0.04em] text-white">
            {siteConfig.name}
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link className={LANDING_NAV_SIGN_IN} href="/sign-in">
            Sign in
          </Link>
          <Link href="/sign-up">
            <span className="landing-nav__cta inline-flex">
              <Button
                className={`${LANDING_PRIMARY_BUTTON} px-5 py-2 text-sm`}
                variant="primary"
              >
                Get started
              </Button>
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function HeroGraphic() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute -right-16 top-24 h-72 w-72 rounded-full bg-brand-accent-highlight/10 blur-3xl sm:h-96 sm:w-96" />
      <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-brand-accent-highlight/8 blur-3xl" />

      <svg
        className="absolute right-[8%] top-[18%] hidden h-40 w-40 opacity-20 sm:block lg:h-52 lg:w-52"
        viewBox="0 0 200 200"
      >
        <circle
          cx="100"
          cy="100"
          fill="none"
          r="80"
          stroke="var(--brand-accent-highlight)"
          strokeDasharray="6 10"
          strokeWidth="1"
        />
        <path
          d="M100 40c-20 30-20 60 0 90 20-30 20-60 0-90Z"
          fill="var(--brand-accent-highlight)"
          opacity="0.35"
        />
      </svg>

      <svg
        className="absolute bottom-[22%] left-[6%] hidden h-28 w-28 opacity-15 lg:block"
        viewBox="0 0 120 120"
      >
        <path
          d="M60 10L20 110h80L60 10Z"
          fill="none"
          stroke="var(--brand-accent-highlight)"
          strokeWidth="1.5"
        />
        <path
          d="M60 35c-8 14-8 28 0 42"
          stroke="var(--brand-accent-highlight)"
          strokeLinecap="round"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-16 pt-6 text-center sm:px-8 sm:pb-20 sm:pt-10">
      <div className="flex max-w-2xl flex-col items-center gap-6">
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-brand-accent-highlight shadow-sm">
          <Leaf className="h-3.5 w-3.5" />
          Agricultural marketplace
        </p>

        <div className="flex flex-col gap-4">
          <h1 className="max-w-xl text-[clamp(2.75rem,7vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-white">
            Grow trade.
            <br />
            <span className="text-brand-accent-highlight">Source smarter.</span>
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
            {siteConfig.name} connects buyers and farmers with intelligent
            produce sourcing — from field to order, in one place.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <Link href="/sign-up">
            <Button
              className={`w-full sm:w-auto ${LANDING_PRIMARY_BUTTON} px-7 py-3 text-base`}
              variant="primary"
            >
              <span className="flex items-center gap-2">
                Start for free
                <ArrowRight className="h-4 w-4" />
              </span>
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button
              className="w-full rounded-full border border-white/15 bg-white/5 px-7 py-3 text-base font-medium text-white shadow-sm backdrop-blur-sm sm:w-auto"
              variant="secondary"
            >
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="relative z-10 w-full py-10 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-5 sm:gap-8 sm:px-8">
        <div className="flex max-w-2xl flex-col items-center gap-3 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-accent-highlight">
            Why Vunr
          </p>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
            Built for how agricultural trade actually works
          </h2>
        </div>

        <div className="w-full">
          <HeroBuyerChatPreview />
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-3 sm:gap-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className={`flex flex-col gap-3 rounded-[1.5rem] p-5 ${LANDING_SURFACE_CARD}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent-highlight/12 text-brand-accent-highlight shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-white/60">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RolesSection() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8 sm:pb-24">
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <article
          className={`flex flex-col gap-5 rounded-[1.75rem] p-6 sm:p-8 ${LANDING_SURFACE_CARD}`}
        >
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-accent-highlight">
            For buyers
          </p>
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">
            Source produce like you talk
          </h3>
          <p className="text-sm leading-relaxed text-white/60">
            Describe what you need in natural language. Vunr searches live
            listings, filters by crop and availability, and surfaces the best
            matches.
          </p>
          <Link
            className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-white/10"
            href="/sign-up"
          >
            Join as buyer
            <ArrowRight className="h-4 w-4" />
          </Link>
        </article>

        <article
          className={`flex flex-col gap-5 rounded-[1.75rem] p-6 sm:p-8 ${LANDING_SURFACE_CARD}`}
        >
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-accent-highlight">
            For farmers
          </p>
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">
            Reach buyers directly
          </h3>
          <p className="text-sm leading-relaxed text-white/60">
            Publish listings with grades, quantities, and locations. Manage
            orders and keep your inventory synced as stock moves.
          </p>
          <Link
            className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition-[filter] hover:brightness-105"
            href="/sign-up"
          >
            Join as farmer
            <ArrowRight className="h-4 w-4" />
          </Link>
        </article>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
      <div
        className={`flex flex-col items-center gap-6 rounded-[2rem] px-6 py-12 text-center sm:px-10 sm:py-14 ${LANDING_SURFACE_CARD}`}
      >
        <VunrLogo className="text-brand-accent-highlight" size={52} />
        <div className="flex max-w-xl flex-col gap-3">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
            Ready to trade on {siteConfig.name}?
          </h2>
          <p className="text-sm leading-relaxed text-white/60 sm:text-base">
            Create your account in seconds with Google. Choose your role and
            start sourcing or selling today.
          </p>
        </div>
        <Link href="/sign-up">
          <Button
            className={`${LANDING_PRIMARY_BUTTON} px-8 py-3 text-base`}
            variant="primary"
          >
            Get started free
          </Button>
        </Link>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-white/8 px-5 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2 text-brand-accent-highlight">
          <VunrLogo size={24} />
          <span className="text-sm font-semibold text-white/80">
            {siteConfig.name}
          </span>
        </div>
        <p className="text-xs text-white/40">
          © {new Date().getFullYear()} {siteConfig.name}. Agricultural
          marketplace.
        </p>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="vunr-landing relative min-h-dvh bg-brand-deep text-white">
      <LandingNav />
      <div className="relative overflow-x-hidden">
        <div
          aria-hidden
          className="vunr-noise pointer-events-none absolute inset-0 opacity-40"
        />
        <HeroGraphic />
        <main>
          <HeroSection />
          <FeaturesSection />
          <RolesSection />
          <CtaSection />
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
