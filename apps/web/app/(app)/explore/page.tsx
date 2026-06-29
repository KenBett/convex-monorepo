import type { Metadata } from "next";

import { KnowledgeExplore } from "@/components/knowledge/knowledge-explore";

export const metadata: Metadata = {
  title: "Knowledge",
};

export default function ExplorePage() {
  return <KnowledgeExplore />;
}
