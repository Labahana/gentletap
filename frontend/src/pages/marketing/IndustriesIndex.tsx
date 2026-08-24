import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell, Breadcrumbs } from '../../components/marketing/MarketingShell';
import { INDEXED_INDUSTRY_SLUGS, websiteJsonLd } from '../../data/seo';
import { INDUSTRY_SLUGS, INDUSTRIES } from '../../data/industries';

export const IndustriesIndex: React.FC = () => (
  <MarketingShell>
    <Seo
      title="Invoice Reminders for Your Industry"
      description="How freelancers, agencies, consultants, developers, designers and more use GentleTap to follow up on unpaid invoices without the awkwardness."
      path="/industries"
      jsonLd={[websiteJsonLd()]}
    />
    <div className="max-w-4xl mx-auto px-6 py-14">
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Industries' }]} />
      <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
        Invoice reminders for your line of work
      </h1>
      <p className="text-lg text-gray-600 mb-10">
        Every industry chases payment a little differently. Pick yours.
      </p>
      <div className="grid sm:grid-cols-2 gap-5">
        {INDUSTRY_SLUGS.map((slug) => {
          const ind = INDUSTRIES[slug];
          const indexed = (INDEXED_INDUSTRY_SLUGS as readonly string[]).includes(slug);
          return (
            <article key={slug} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:border-blue-300 transition-colors flex flex-col">
              <h2 className="text-lg font-bold text-gray-900 mb-1.5">
                <Link
                  to={`/industries/${slug}`}
                  className="hover:text-blue-600"
                  {...(!indexed ? { rel: 'nofollow' } : {})}
                >
                  Invoice reminders for {ind.audience}
                </Link>
              </h2>
              <p className="text-gray-600 text-sm mb-4 flex-1">{ind.hero}</p>
              <Link
                to={`/industries/${slug}`}
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
