import type { IconSvgProps } from "@/types";

/** Custom sourcing assistant mark — leaf + signal, not a generic chatbot. */
export function SourcingAgentIcon({
  size = 24,
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
      viewBox="0 0 24 24"
      width={size || width}
      {...props}
    >
      <path
        d="M12 3.5c0 4.2-2.8 6.4-5.2 7.8-.9.5-1.3 1.6-.9 2.6l.4 1.1c.3.8 1.1 1.3 2 1.3h7.4c.9 0 1.7-.5 2-1.3l.4-1.1c.4-1-.1-2.1-.9-2.6C14.8 9.9 12 7.7 12 3.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M12 3.5V2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
      <path
        d="M8.5 18.5h7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
      <path
        d="M17.5 6.5 19 5M19 5l1.2 1.2M19 5v1.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.35"
      />
    </svg>
  );
}

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
