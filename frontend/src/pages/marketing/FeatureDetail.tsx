import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell, Breadcrumbs } from '../../components/marketing/MarketingShell';
import { breadcrumbJsonLd, faqJsonLd } from '../../data/seo';
import { getFeature } from '../../data/features';

export const FeatureDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const f = slug ? getFeature(slug) : undefined;

  if (!f) {
    return (
      <MarketingShell>
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Page not found</h1>
          <Link to="/features" className="text-blue-600 hover:text-blue-700 font-medium">
            Browse all features
          </Link>
        </div>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <Seo
        title={f.metaTitle}
        description={f.metaDescription}
        path={`/features/${slug}`}
        keywords={f.keywords}
        jsonLd={[
          faqJsonLd(f.faq),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Features', path: '/features' },
            { name: f.name, path: `/features/${slug}` },
          ]),
        ]}
      />
      <div className="max-w-3xl mx-auto px-6 py-14">
        <Breadcrumbs
          items={[{ name: 'Home', path: '/' }, { name: 'Features', path: '/features' }, { name: f.name }]}
        />
        <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-4">{f.title}</h1>
        <p className="text-xl text-gray-600 mb-10">{f.hero}</p>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">Benefits</h2>
          <div className="space-y-4">
            {f.benefits.map((b, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-1.5">{b.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">How it works</h2>
          <ol className="space-y-4">
            {f.howItWorks.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mt-0.5">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="bg-blue-600 rounded-2xl p-8 text-center text-white mb-12">
          <h2 className="text-2xl font-bold mb-2">See it on your own invoices</h2>
          <p className="text-blue-100 mb-5">Free Starter plan — 5 invoice collections per month.</p>
          <Link
            to="/signup"
            className="inline-block bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Start free
          </Link>
        </div>

        {f.faq.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-5">FAQ</h2>
            <div className="space-y-4">
              {f.faq.map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-1.5">{item.q}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </MarketingShell>
  );
};
