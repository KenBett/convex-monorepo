import { VunrLogo } from "@/components/marketing/vunr-logo";

type VunrLogoLoaderProps = {
  /** Full-viewport centered loader (auth/routing). Default: true. */
  fullScreen?: boolean;
  size?: number;
  className?: string;
};

/**
 * Branded loading indicator — soft breathe + pulse on the Vunr mark.
 */
export function VunrLogoLoader({
  fullScreen = true,
  size = 48,
  className,
}: VunrLogoLoaderProps) {
  const mark = (
    <div
      aria-busy
      aria-label="Loading"
      className={`vunr-logo-loader ${className ?? ""}`.trim()}
      role="status"
    >
      <span aria-hidden className="vunr-logo-loader__glow" />
      <VunrLogo
        className="vunr-logo-loader__mark text-brand-accent-highlight"
        size={size}
      />
    </div>
  );

  if (!fullScreen) {
    return mark;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      {mark}
    </div>
  );
}
