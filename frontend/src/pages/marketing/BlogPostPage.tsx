import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell, Breadcrumbs } from '../../components/marketing/MarketingShell';
import { articleJsonLd, faqJsonLd } from '../../data/seo';
import { BLOG_POSTS } from '../../data/blog-posts';

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? BLOG_POSTS[slug as keyof typeof BLOG_POSTS] : undefined;

  if (!post) {
    return (
      <MarketingShell>
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Post not found</h1>
          <Link to="/blog" className="text-blue-600 hover:text-blue-700 font-medium">
            Back to the blog
          </Link>
        </div>
      </MarketingShell>
    );
  }

  const related = post.related.map((s) => BLOG_POSTS[s as keyof typeof BLOG_POSTS]).filter(Boolean);

  return (
    <MarketingShell>
      <Seo
        title={post.metaTitle}
        description={post.metaDescription}
        path={`/blog/${post.slug}`}
        keywords={post.keywords}
        ogType="article"
        jsonLd={[
          articleJsonLd({
            title: post.title,
            description: post.metaDescription,
            path: `/blog/${post.slug}`,
            datePublished: post.datePublished,
            dateModified: post.dateModified,
          }),
          ...(post.faq.length > 0 ? [faqJsonLd(post.faq)] : []),
        ]}
      />
      <article className="max-w-3xl mx-auto px-6 py-14">
        <Breadcrumbs
          items={[{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: post.title }]}
        />
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <time dateTime={post.datePublished}>{post.datePublished}</time>
          <span className="flex items-center gap-1"><Clock size={13} /> {post.readMinutes} min read</span>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-5">{post.title}</h1>
        <p className="text-xl text-gray-600 mb-10">{post.intro}</p>

        <div className="space-y-10">
          {post.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>
              {section.paragraphs.map((p, j) => (
                <p key={j} className="text-gray-700 leading-relaxed mb-4">{p}</p>
              ))}
            </section>
          ))}
        </div>

        {post.faq.length > 0 && (
          <section className="mt-14">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">Frequently asked questions</h2>
            <div className="space-y-4">
              {post.faq.map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-1.5">{item.q}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-12 bg-blue-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Stop chasing invoices manually</h2>
          <p className="text-blue-100 mb-5">GentleTap drafts and sends the follow-ups from your Gmail — and stops when clients pay.</p>
          <Link
            to="/signup"
            className="inline-block bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Start free
          </Link>
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Keep reading</h2>
            <ul className="space-y-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link to={`/blog/${r.slug}`} className="text-blue-600 hover:text-blue-700 font-medium">
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </MarketingShell>
  );
};
