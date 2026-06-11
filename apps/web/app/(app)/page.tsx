import type { Metadata } from "next";

import { PageSurface } from "@/components/page-surface";
import { getNavItem } from "@/config/navigation";

const { href, icon } = getNavItem("/");

export const metadata: Metadata = {
  title: "Home",
};

export default function HomePage() {
  return <PageSurface icon={icon} route={href} />;
}
