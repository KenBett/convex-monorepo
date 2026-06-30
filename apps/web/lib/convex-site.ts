export function getConvexSiteUrl(): string {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }

  return convexUrl.replace(/\.convex\.cloud(?::\d+)?$/i, ".convex.site");
}

export function getBuyerSourcingChatUrl(): string {
  return `${getConvexSiteUrl()}/api/buyer/sourcing`;
}
