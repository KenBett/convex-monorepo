import { IconSvgProps } from "@/types";

/**
 * V-shaped mark with an integrated leaf cutout — inspired by the Vunr brand.
 */
export function VunrLogo({
  size = 48,
  width,
  height,
  className,
  ...props
}: IconSvgProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      height={size || height}
      viewBox="0 0 64 64"
      width={size || width}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M32 54L6 6h14.5l11.5 30V6h14v30L51.5 6H58L32 54Z"
        fill="currentColor"
      />
      <path
        d="M20.5 6c5.5 10 9.5 20 11.5 30V6H20.5Z"
        fill="var(--brand-deep, #142e26)"
      />
      <path
        d="M25 16c2.5 6 4 12 4.5 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeOpacity="0.4"
        strokeWidth="1.25"
      />
    </svg>
  );
}
