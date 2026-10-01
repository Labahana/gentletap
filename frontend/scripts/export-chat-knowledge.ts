/**
 * Chatbot knowledge-pack generator.
 *
 * Reads the SAME typed data modules the marketing site renders (so the bot can
 * never drift from what's on the site) plus the curated llms.txt, and emits a
 * compact grounding document at
 *   backend/app/services/chat/knowledge_pack.json
 *
 * The JSON artifact is committed so the backend has no runtime build dependency;
 * regenerate after editing any content with:  npm run gen:chat-knowledge
 *
 * Run via esbuild (bundled to ESM) + node.
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { HOME_FAQ, SEO_FEATURES, GENTLETAP_DEFINITION, AI_DISCOVERY_FAQ, OVERDUE_FOLLOW_UP_FAQ, OVERDUE_FOLLOW_UP_PRINCIPLES, HOW_TO_FOLLOW_UP_STEPS, AFFILIATE_FAQ } from "../src/data/seo-content";
import { FEATURES, FEATURE_SLUGS } from "../src/data/features";
import { INDUSTRIES, INDUSTRY_SLUGS } from "../src/data/industries";
import { COMPETITOR_COMPARISONS, COMPETITOR_SLUGS } from "../src/data/competitor-comparisons";
import { BLOG_POSTS, BLOG_POST_SLUGS } from "../src/data/blog-posts";
import { PLAN_FEATURES, PLAN_INTROS } from "../src/data/pricing";
import { APP_NAVIGATION } from "../src/data/app-navigation";

const __filename = fileURLToPath(import.meta.url);
const SITE_URL = "https://gentletap.co";
const SUPPORT_EMAIL = "gentletapai@gmail.com";

// Anchor on the frontend dir (the one that contains src/ and public/) so the
// script works whether run from source (scripts/) or from the esbuild bundle
// (scripts/.out/). Walk up until we find public/llms.txt alongside src/.
function findFrontendDir(start: string): string {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    if (existsSync(resolve(dir, "public/llms.txt")) && existsSync(resolve(dir, "src"))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return resolve(start, ".."); // fall back to prior behavior
}
const frontendDir = findFrontendDir(dirname(__filename));
const repoRoot = dirname(frontendDir);

type Doc = { id: string; title: string; url: string; kind: string; text: string };

/** Turn heterogeneous content shapes into readable "Q: ... A: ..." / "Heading: body" lines. */
function flat(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(flat).filter(Boolean).join("\n");
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    // FAQ-style pairs
    if ("q" in o && "a" in o) return `Q: ${flat(o.q)}\nA: ${flat(o.a)}`;
    if ("question" in o && "answer" in o) return `Q: ${flat(o.question)}\nA: ${flat(o.answer)}`;
    // section with heading + paragraphs
    if ("heading" in o && "paragraphs" in o) {
      return `${flat(o.heading)}\n${flat(o.paragraphs)}`;
    }
    // title + body/text/summary/description
    const title = o.title ?? o.name ?? o.feature ?? o.label;
    const body = o.body ?? o.text ?? o.description ?? o.summary ?? o.details ?? o.answer ?? o.value;
    if (title != null && body != null) return `- ${flat(title)}: ${flat(body)}`;
    if (body != null) return `- ${flat(body)}`;
    // fallback: join primitive values
    return Object.values(o).map(flat).filter(Boolean).join(" ");
  }
  return "";
}

const docs: Doc[] = [];
function add(id: string, title: string, url: string, kind: string, parts: unknown) {
  const text = flat(parts).trim();
  if (text) docs.push({ id, title, url, kind, text });
}

// 1) Curated machine-readable product overview.
try {
  const llms = readFileSync(resolve(frontendDir, "public/llms.txt"), "utf8").trim();
  add("overview-llms", "GentleTap product overview", SITE_URL, "overview", llms);
} catch {
  /* llms.txt optional */
}

// 2) Definition + home FAQ (what GentleTap is, top-of-page questions).
add("definition", "What is GentleTap?", SITE_URL, "overview", GENTLETAP_DEFINITION);
add("faq-home", "General questions", `${SITE_URL}/#faq`, "faq", HOME_FAQ);
add("faq-ai-discovery", "Product facts (AI answer guide)", `${SITE_URL}`, "faq", AI_DISCOVERY_FAQ);

// 3) SEO feature summaries.
add("feature-summary", "Core features", `${SITE_URL}/features`, "feature", SEO_FEATURES);

// 4) Per-feature deep pages.
for (const slug of FEATURE_SLUGS) {
  const f = (FEATURES as Record<string, any>)[slug];
  if (!f) continue;
  add(`feature:${slug}`, `${f.name} — feature`, `${SITE_URL}/features/${slug}`, "feature", [
    f.hero,
    f.benefits,
    f.howItWorks,
    f.faq,
  ]);
}

// 5) Per-industry pages.
for (const slug of INDUSTRY_SLUGS) {
  const it = (INDUSTRIES as Record<string, any>)[slug];
  if (!it) continue;
  add(`industry:${slug}`, `GentleTap for ${it.audience || slug}`, `${SITE_URL}/industries/${slug}`, "industry", [
    it.hero,
    it.painPoints,
    it.sections,
    it.faq,
  ]);
}

// 6) Competitor comparisons.
for (const slug of COMPETITOR_SLUGS) {
  const c = (COMPETITOR_COMPARISONS as Record<string, any>)[slug];
  if (!c) continue;
  const name = c.competitor || c.name || slug;
  add(`compare:${slug}`, `GentleTap vs ${name}`, `${SITE_URL}/compare/${slug}`, "comparison", [c]);
}

// 7) Blog (long-form guidance).
for (const slug of BLOG_POST_SLUGS) {
  const b = (BLOG_POSTS as Record<string, any>)[slug];
  if (!b) continue;
  add(`blog:${slug}`, b.title, `${SITE_URL}/blog/${slug}`, "blog", [
    b.intro,
    b.sections,
    b.faq,
  ]);
}

// 8) Pricing (plan-by-plan feature matrix).
for (const [plan, feats] of Object.entries(PLAN_FEATURES as Record<string, unknown>)) {
  add(`pricing:${plan}`, `Plan: ${plan}`, `${SITE_URL}/pricing`, "pricing", [PLAN_INTROS[plan], feats]);
}

// 9) How-to / follow-up guidance + affiliate program.
add("faq-overdue", "Following up on overdue invoices", `${SITE_URL}/how-to-follow-up-on-overdue-invoices`, "guide", [
  HOW_TO_FOLLOW_UP_STEPS,
  OVERDUE_FOLLOW_UP_PRINCIPLES,
  OVERDUE_FOLLOW_UP_FAQ,
]);
add("faq-affiliate", "Affiliate program", `${SITE_URL}/affiliates`, "faq", AFFILIATE_FAQ);

// 10) Authoritative in-app + site navigation map, so the bot gives correct
//     "where/how do I…" directions instead of guessing menu paths.
add("nav-app", "GentleTap app navigation — where everything is in the dashboard", `${SITE_URL}/dashboard`, "guide", APP_NAVIGATION.inApp);
add("nav-howto", "GentleTap how-to steps (connect FreshBooks/QuickBooks/Gmail, import CSV, autopilot, sequences, templates, billing, settings, export/delete)", `${SITE_URL}/integrations`, "guide", APP_NAVIGATION.howTo);
add("nav-site", "GentleTap public website map (pricing, features, compare, blog, guides, affiliates, legal)", SITE_URL, "guide", APP_NAVIGATION.publicSite);

const pack = {
  generated_at: new Date().toISOString(),
  product: "GentleTap",
  site_url: SITE_URL,
  support_email: SUPPORT_EMAIL,
  doc_count: docs.length,
  docs,
};

const outPath = resolve(repoRoot, "backend/app/services/chat/knowledge_pack.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(pack, null, 2), "utf8");
const chars = docs.reduce((n, d) => n + d.text.length, 0);
console.log(`Wrote ${docs.length} docs (~${chars} chars) -> ${outPath}`);
