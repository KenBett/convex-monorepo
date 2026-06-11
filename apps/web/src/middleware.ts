import { NextRequest, NextResponse } from "next/server";

// TODO: Add Convex Auth session check here before granting access
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
