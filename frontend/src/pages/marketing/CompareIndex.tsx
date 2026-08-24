import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell, Breadcrumbs } from '../../components/marketing/MarketingShell';
import { websiteJsonLd } from '../../data/seo';
import { getAllComparisons } from '../../data/competitor-comparisons';

export const CompareIndex: React.FC = () => {
  const comparisons = getAllComparisons();
  const categories = Array.from(new Set(comparisons.map((c) => c.category)));
  return (
    <MarketingShell>
      <Seo
        title="GentleTap vs Competitors — Honest Invoice Reminder Comparisons"
        description="Side-by-side, honest comparisons of GentleTap and every major invoice chasing tool: pricing, features, and who each option is really for."
        path="/compare"
        jsonLd={[websiteJsonLd()]}
      />
      <div className="max-w-4xl mx-auto px-6 py-14">
        <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Compare' }]} />
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
          GentleTap vs. every invoice chasing tool
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          Honest side-by-side comparisons — including when a competitor is the better pick.
        </p>
        {categories.map((cat) => (
          <section key={cat} className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">{cat}</h2>
            <div className="grid md:grid-cols-2 gap-5">
              {comparisons
                .filter((c) => c.category === cat)
                .map((c) => (
                  <article key={c.slug} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:border-blue-300 transition-colors flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-1.5">
                      <Link to={`/compare/${c.slug}`} className="hover:text-blue-600">
                        GentleTap vs. {c.name}
                      </Link>
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 flex-1">{c.tagline}</p>
                    <Link
                      to={`/compare/${c.slug}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Compare <ArrowRight size={15} />
                    </Link>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>
    </MarketingShell>
  );
};
