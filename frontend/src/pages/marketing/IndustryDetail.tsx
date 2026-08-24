import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell, Breadcrumbs } from '../../components/marketing/MarketingShell';
import { INDEXED_INDUSTRY_SLUGS, breadcrumbJsonLd, faqJsonLd } from '../../data/seo';
import { getIndustry } from '../../data/industries';

export const IndustryDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const ind = slug ? getIndustry(slug) : undefined;
  const indexed = !!slug && (INDEXED_INDUSTRY_SLUGS as readonly string[]).includes(slug);

  if (!ind) {
    return (
      <MarketingShell>
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Page not found</h1>
          <Link to="/industries" className="text-blue-600 hover:text-blue-700 font-medium">
            Browse all industries
          </Link>
        </div>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <Seo
        title={ind.metaTitle}
        description={ind.metaDescription}
        path={`/industries/${slug}`}
        keywords={ind.keywords}
        noindex={!indexed}
        jsonLd={[
          faqJsonLd(ind.faq),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Industries', path: '/industries' },
            { name: ind.audience, path: `/industries/${slug}` },
          ]),
        ]}
      />
      <div className="max-w-3xl mx-auto px-6 py-14">
        <Breadcrumbs
          items={[{ name: 'Home', path: '/' }, { name: 'Industries', path: '/industries' }, { name: ind.audience }]}
        />
        <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-4">{ind.title}</h1>
        <p className="text-xl text-gray-600 mb-10">{ind.hero}</p>

        {ind.painPoints.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">Sound familiar?</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {ind.painPoints.map((pp, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-1.5">{pp.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{pp.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="space-y-10 mb-14">
          {ind.sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{s.heading}</h2>
              {s.paragraphs.map((p, j) => (
                <p key={j} className="text-gray-700 leading-relaxed mb-4">{p}</p>
              ))}
            </section>
          ))}
        </div>

        <div className="bg-blue-600 rounded-2xl p-8 text-center text-white mb-12">
          <h2 className="text-2xl font-bold mb-2">Get paid without the awkward chase</h2>
          <p className="text-blue-100 mb-5">
            GentleTap connects to QuickBooks or FreshBooks and drafts each reminder in your voice.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Start free
          </Link>
        </div>

        {ind.faq.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-5">FAQ</h2>
            <div className="space-y-4">
              {ind.faq.map((item, i) => (
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
