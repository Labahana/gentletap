import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell, Breadcrumbs } from '../../components/marketing/MarketingShell';
import { websiteJsonLd } from '../../data/seo';
import { FEATURE_SLUGS, FEATURES } from '../../data/features';

export const FeaturesIndex: React.FC = () => (
  <MarketingShell>
    <Seo
      title="GentleTap Features — AI Invoice Follow-ups That Sound Like You"
      description="AI reminder drafts, client payment profiling, Gmail sending, WhatsApp follow-ups, auto-stop on payment. Every GentleTap feature, explained."
      path="/features"
      jsonLd={[websiteJsonLd()]}
    />
    <div className="max-w-4xl mx-auto px-6 py-14">
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Features' }]} />
      <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Features</h1>
      <p className="text-lg text-gray-600 mb-10">
        Everything GentleTap does to get your invoices paid — and nothing it doesn't.
      </p>
      <div className="grid sm:grid-cols-2 gap-5">
        {FEATURE_SLUGS.map((slug) => {
          const f = FEATURES[slug];
          return (
            <article key={slug} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:border-blue-300 transition-colors flex flex-col">
              <h2 className="text-lg font-bold text-gray-900 mb-1.5">
                <Link to={`/features/${slug}`} className="hover:text-blue-600">{f.name}</Link>
              </h2>
              <p className="text-gray-600 text-sm mb-4 flex-1">{f.hero}</p>
              <Link
                to={`/features/${slug}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Learn more <ArrowRight size={15} />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  </MarketingShell>
);
