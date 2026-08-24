import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell, Breadcrumbs } from '../../components/marketing/MarketingShell';
import { websiteJsonLd } from '../../data/seo';
import { getAllComparisons } from '../../data/competitor-comparisons';

export const AlternativesIndex: React.FC = () => {
  const comparisons = getAllComparisons();
  return (
    <MarketingShell>
      <Seo
        title="Invoice Chasing Software Alternatives — Compared Honestly"
        description="Looking for an alternative to your current invoice chasing or dunning tool? Honest, side-by-side comparisons of GentleTap and every major payment reminder option."
        path="/alternatives"
        jsonLd={[websiteJsonLd()]}
      />
      <div className="max-w-4xl mx-auto px-6 py-14">
        <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Alternatives' }]} />
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
          Invoice chasing alternatives — compared honestly
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          Switching tools? Here's how GentleTap stacks up against each one — including where the other guy wins.
        </p>
        <ul className="grid sm:grid-cols-2 gap-4 mb-14">
          {comparisons.map((c) => (
            <li key={c.slug} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition-colors">
              <h2 className="font-bold text-gray-900 mb-1">
                {c.name} alternatives
              </h2>
              <p className="text-gray-600 text-sm mb-3">{c.tagline}</p>
              <Link
                to={`/compare/${c.slug}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                See the comparison <ArrowRight size={15} />
              </Link>
            </li>
          ))}
        </ul>

        <div className="bg-blue-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Not sure which tool fits?</h2>
          <p className="text-blue-100 mb-5">Start with GentleTap free — 5 invoice collections a month, no card required.</p>
          <Link
            to="/signup"
            className="inline-block bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Start free
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
};
