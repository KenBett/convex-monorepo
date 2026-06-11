import type { Metadata } from "next";

import { PageSurface } from "@/components/page-surface";
import { getNavItem } from "@/config/navigation";

const { href, icon } = getNavItem("/explore");

export const metadata: Metadata = {
  title: "Explore",
};

export default function ExplorePage() {
  return <PageSurface icon={icon} route={href} />;
}
