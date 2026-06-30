/** Felt more than seen — same value on web and mobile. */
export const LISTING_CARD_NOISE_OPACITY = 0.035;

/**
 * Tiled SVG noise via feTurbulence. Shared data URI for cross-platform texture.
 */
export const LISTING_CARD_NOISE_DATA_URI =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#n)" opacity="1"/>
    </svg>`,
  );
