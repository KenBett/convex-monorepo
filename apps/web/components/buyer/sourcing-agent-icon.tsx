import type { IconSvgProps } from "@/types";

export function SourcingSendIcon({
  size = 18,
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
      viewBox="0 0 18 18"
      width={size || width}
      {...props}
    >
      <path
        d="M9 14.25V3.75M9 3.75 4.5 8.25M9 3.75l4.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}
