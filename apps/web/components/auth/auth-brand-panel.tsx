import { AppIllustration } from "@repo/illustrations";

import { brandCopy } from "@/config/brand";
import { siteConfig } from "@/config/site";

import { VunrLogo } from "../marketing/vunr-logo";

interface AuthBrandPanelProps {
  compact?: boolean;
}

export function AuthBrandPanel({ compact = false }: AuthBrandPanelProps) {
  if (compact) {
    return (
      <div className="relative overflow-hidden bg-brand-deep px-5 py-6 sm:px-8">
        <div
          aria-hidden
          className="vunr-noise pointer-events-none absolute inset-0 opacity-40"
        />
        <div className="relative flex items-center gap-3">
          <VunrLogo className="text-brand-accent-highlight" size={32} />
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-[-0.04em] text-white">
              {siteConfig.name}
            </p>
            <p className="truncate text-sm text-white/65">{brandCopy.tagline}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-brand-deep p-10 lg:p-14">
      <div
        aria-hidden
        className="vunr-noise pointer-events-none absolute inset-0 opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-1/3 h-64 w-64 rounded-full bg-brand-accent-highlight/10 blur-3xl"
      />

      <div className="relative">
        <div className="flex items-center gap-3">
          <VunrLogo className="text-brand-accent-highlight" size={40} />
          <span className="text-2xl font-semibold tracking-[-0.04em] text-white">
            {siteConfig.name}
          </span>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center py-8">
        <AppIllustration name="auth-welcome" size={220} />
      </div>

      <div className="relative max-w-md">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-accent-highlight">
          Agricultural trade, simplified
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">
          {brandCopy.tagline}
        </h2>
      </div>

      <p className="relative text-xs text-white/40">
        &copy; {new Date().getFullYear()} {siteConfig.name}
      </p>
    </div>
  );
}
