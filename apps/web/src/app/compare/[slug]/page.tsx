import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ComparisonPage } from "@/components/comparison-page";
import {
  COMPETITOR_SLUGS,
  getCompetitorComparison,
} from "@/lib/competitor-comparisons";
import { pageMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return COMPETITOR_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const comparison = getCompetitorComparison(slug);
  if (!comparison) {
    return { title: "Not found" };
  }
  return pageMetadata({
    title: comparison.metaTitle,
    description: comparison.metaDescription,
    path: `/compare/${comparison.slug}`,
    keywords: comparison.keywords,
  });
}

export default async function CompareSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const comparison = getCompetitorComparison(slug);
  if (!comparison) {
    notFound();
  }
  return <ComparisonPage comparison={comparison} />;
}
