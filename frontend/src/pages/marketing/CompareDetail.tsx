import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell, Breadcrumbs } from '../../components/marketing/MarketingShell';
import { breadcrumbJsonLd, faqJsonLd } from '../../data/seo';
import { getAllComparisons, getCompetitorComparison } from '../../data/competitor-comparisons';

export const CompareDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const c = slug ? getCompetitorComparison(slug) : undefined;

  if (!c) {
    return (
      <MarketingShell>
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Comparison not found</h1>
          <Link to="/compare" className="text-blue-600 hover:text-blue-700 font-medium">
            See all comparisons
          </Link>
        </div>
      </MarketingShell>
    );
  }

  const others = getAllComparisons().filter((x) => x.slug !== c.slug).slice(0, 6);

  return (
    <MarketingShell>
      <Seo
        title={c.metaTitle}
        description={c.metaDescription}
        path={`/compare/${c.slug}`}
        keywords={c.keywords}
        jsonLd={[
          faqJsonLd(c.faq),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Compare', path: '/compare' },
            { name: `GentleTap vs ${c.name}`, path: `/compare/${c.slug}` },
          ]),
        ]}
      />
      <div className="max-w-4xl mx-auto px-6 py-14">
        <Breadcrumbs
          items={[{ name: 'Home', path: '/' }, { name: 'Compare', path: '/compare' }, { name: `vs. ${c.name}` }]}
        />
        <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-3">
          GentleTap vs. {c.name}
        </h1>
        <p className="text-xl text-gray-600 mb-10">{c.tagline}</p>

        <section className="grid md:grid-cols-2 gap-5 mb-12">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-2">{c.name}</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{c.competitorSummary}</p>
          </div>
          <div className="bg-blue-600 rounded-2xl p-6 text-white">
            <h2 className="font-bold mb-2">GentleTap</h2>
            <p className="text-blue-100 text-sm leading-relaxed">{c.gentletapSummary}</p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">Feature comparison</h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-gray-500 uppercase text-xs tracking-wide">
                  <th className="px-5 py-3 font-semibold">Feature</th>
                  <th className="px-5 py-3 font-semibold">{c.name}</th>
                  <th className="px-5 py-3 font-semibold text-blue-600">GentleTap</th>
                </tr>
              </thead>
              <tbody>
                {c.comparisonRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50/60'}>
                    <td className="px-5 py-3 font-medium text-gray-800">{row.feature}</td>
                    <td className="px-5 py-3 text-gray-600">{row.competitor}</td>
                    <td className="px-5 py-3 text-gray-800 flex items-start gap-1.5">
                      {(row.gentletap.toLowerCase() === 'yes' || row.gentletap.toLowerCase() === 'true') && (
                        <Check size={15} className="text-green-600 mt-0.5 shrink-0" />
                      )}
                      {(row.gentletap.toLowerCase() === 'no' || row.gentletap.toLowerCase() === 'false') && (
                        <X size={15} className="text-red-500 mt-0.5 shrink-0" />
                      )}
                      <span>{row.gentletap}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-8 mb-12">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">When {c.name} wins</h2>
            <p className="text-gray-700 leading-relaxed">{c.whenTheyWin}</p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">When GentleTap wins</h2>
            <p className="text-gray-700 leading-relaxed">{c.whenGentletapWins}</p>
          </div>
          <div className="bg-white rounded-2xl border-l-4 border-blue-600 border-y border-r border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Honest verdict</h2>
            <p className="text-gray-700 leading-relaxed">{c.honestVerdict}</p>
            <p className="text-gray-500 text-sm mt-3">{c.pricingNote}</p>
            {c.competitorUrl && (
              <a
                href={c.competitorUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Visit {c.name} &rarr;
              </a>
            )}
          </div>
        </section>

        {c.faq.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">FAQ</h2>
            <div className="space-y-4">
              {c.faq.map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-1.5">{item.q}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="bg-blue-600 rounded-2xl p-8 text-center text-white mb-12">
          <h2 className="text-2xl font-bold mb-2">Try GentleTap free</h2>
          <p className="text-blue-100 mb-5">Connect QuickBooks or FreshBooks and send your first AI-drafted reminder in minutes.</p>
          <Link
            to="/signup"
            className="inline-block bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Start free
          </Link>
        </div>

        {others.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">More comparisons</h2>
            <ul className="flex flex-wrap gap-2">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link
                    to={`/compare/${o.slug}`}
                    className="inline-block bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    vs. {o.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </MarketingShell>
  );
};
