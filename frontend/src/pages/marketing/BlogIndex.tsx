import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell } from '../../components/marketing/MarketingShell';
import { Breadcrumbs } from '../../components/marketing/MarketingShell';
import { websiteJsonLd } from '../../data/seo';
import { BLOG_POST_SLUGS, BLOG_POSTS } from '../../data/blog-posts';

export const BlogIndex: React.FC = () => {
  const posts = BLOG_POST_SLUGS.map((s) => BLOG_POSTS[s]).sort(
    (a, b) => b.datePublished.localeCompare(a.datePublished),
  );
  return (
    <MarketingShell>
      <Seo
        title="GentleTap Blog — Getting Paid as a Freelancer"
        description="Practical guides on invoice chasing, late payments, cash flow, and payment terms for freelancers and small businesses."
        path="/blog"
        jsonLd={[websiteJsonLd()]}
      />
      <div className="max-w-4xl mx-auto px-6 py-14">
        <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Blog' }]} />
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Blog</h1>
        <p className="text-lg text-gray-600 mb-10">
          Honest, practical writing about getting paid on time — no collections-agency energy.
        </p>
        <div className="space-y-5">
          {posts.map((post) => (
            <article key={post.slug} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                <time dateTime={post.datePublished}>{post.datePublished}</time>
                <span className="flex items-center gap-1"><Clock size={13} /> {post.readMinutes} min read</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                <Link to={`/blog/${post.slug}`} className="hover:text-blue-600">{post.title}</Link>
              </h2>
              <p className="text-gray-600 mb-4">{post.excerpt}</p>
              <Link
                to={`/blog/${post.slug}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Read more <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </MarketingShell>
  );
};
