import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell } from '../../components/marketing/MarketingShell';

type Snippet = { id: string; title: string; where: string; body: string };

const CopyCard: React.FC<{ snippet: Snippet }> = ({ snippet }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(snippet.body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900">{snippet.title}</h3>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold mt-0.5">{snippet.where}</p>
        </div>
        <button
          onClick={copy}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="mt-4 whitespace-pre-wrap text-sm text-gray-700 bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 leading-relaxed">
        {snippet.body}
      </pre>
    </div>
  );
};

export const AffiliateResources: React.FC = () => {
  const [link, setLink] = useState('');

  const refLink = link || 'https://gentletap.co/signup?ref=YOURCODE';
  const snippets: Snippet[] = [
    {
      id: 'yt',
      title: 'YouTube video description',
      where: 'Paste under any invoice / QuickBooks / freelancing video',
      body: `Stop chasing overdue invoices — GentleTap follows up on every unpaid invoice automatically, from your own Gmail, and stops the moment you get paid.\n\nTry it free (up to 5 collections/month): ${refLink}\n\nIt syncs with QuickBooks Online and FreshBooks — no double entry. Disclosure: that's my affiliate link, so I earn a commission if you subscribe (you get 20% off your first 3 months).`,
    },
    {
      id: 'tweet',
      title: 'X / Twitter thread opener',
      where: 'One line that stops the scroll',
      body: `Freelancers lose ~30 hours a year chasing unpaid invoices.\n\nI stopped writing awkward "just following up" emails — ${refLink} drafts every reminder in my voice, sends from my Gmail, and stops the second I'm paid.`,
    },
    {
      id: 'newsletter',
      title: 'Newsletter sponsor blurb',
      where: '60–80 words for a solo newsletter slot',
      body: `This issue is sponsored by GentleTap. It puts your overdue invoices on autopilot: AI drafts polite follow-ups in your voice, sends them from your own Gmail, syncs QuickBooks and FreshBooks, and stops chasing the moment you're paid. Free up to 5 collections a month — try it at ${refLink}.`,
    },
    {
      id: 'accountant',
      title: 'Accountant / bookkeeper email',
      where: 'Recommend to your freelancer clients',
      body: `Hi [Name],\n\nYou mentioned chasing unpaid invoices eats your week. Have you tried GentleTap? It watches your QuickBooks, sends polite reminders from your own email on a schedule you control, and stops automatically when a client pays.\n\nI recommend it because clients actually pay faster: ${refLink}\n\nHappy to help you set it up in 15 minutes.`,
    },
    {
      id: 'short',
      title: 'One-liner for bios & comments',
      where: 'Profile links, Reddit/HN comments, Discord',
      body: `GentleTap chases your unpaid invoices on autopilot and stops the moment you're paid → ${refLink}`,
    },
  ];

  return (
    <MarketingShell>
      <Seo
        title="Affiliate Promo Kit — Copy-Paste Swipes for GentleTap Partners"
        description="Ready-to-use video descriptions, tweets, newsletter blurbs and client emails for GentleTap affiliate partners. Replace YOURCODE with your ref code and promote."
        path="/affiliates/resources"
        noindex
      />
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-3">Affiliate resources</p>
        <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-4">
          The promo kit
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Every swipe below converts because it leads with the pain (chasing money) not the product. Swap in your
          referral link, keep the disclosure line, and post where freelancers already hang out.
        </p>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <label htmlFor="reflink" className="block text-sm font-semibold text-gray-900 mb-1.5">
            Your referral link (replaces it in every swipe)
          </label>
          <input
            id="reflink"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://gentletap.co/signup?ref=yourcode"
            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-2">
            Find your link on the {' '}
            <Link to="/affiliates/dashboard" className="text-blue-600 font-medium hover:text-blue-700">
              affiliate dashboard
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-12 space-y-5">
        {snippets.map((s) => (
          <CopyCard key={s.id} snippet={s} />
        ))}
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-blue-600 rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-3">Promotion rules of thumb</h2>
          <ul className="space-y-2.5 text-blue-100 text-sm leading-relaxed">
            <li>• Always disclose the affiliate link — one short sentence is enough, and it lifts trust and clicks.</li>
            <li>• Lead with the outcome ("got paid in 4 days instead of 40"), not the feature list.</li>
            <li>• Your audience gets 20% off their first 3 months through your link — mention it, it doubles click-through.</li>
            <li>• No spam: no cold email blasts, no keyword-stuffed ads, no claiming to be GentleTap staff.</li>
            <li>• Questions? Reply to your approval email or reach us via the dashboard.</li>
          </ul>
          <Link
            to="/affiliates"
            className="inline-block mt-6 bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Back to the program →
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
};
