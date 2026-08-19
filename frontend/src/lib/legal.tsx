/**
 * Legal entity details — must match your Paddle seller account registration exactly.
 * Set VITE_LEGAL_ENTITY_NAME and VITE_LEGAL_ENTITY_ADDRESS in .env before production builds.
 */
export const LEGAL = {
  productName: 'GentleTap',
  legalName: (import.meta.env.VITE_LEGAL_ENTITY_NAME ?? 'GentleTap').trim() || 'GentleTap',
  legalAddress:
    (import.meta.env.VITE_LEGAL_ENTITY_ADDRESS ?? 'United States').trim() || 'United States',
  websiteUrl: 'https://gentletap.co',
  websiteDisplay: 'gentletap.co',
  supportEmail: 'support@gentletap.co',
  legalEmail: 'legal@gentletap.co',
  privacyEmail: 'privacy@gentletap.co',
  paddleMoR: 'Paddle.com Market Ltd',
  refundWindowDays: 30,
  governingLaw: 'State of Delaware, United States',
} as const;

export function operatorIntro(): string {
  return `${LEGAL.legalName} ("${LEGAL.productName}", "we", "us", or "our") operates the GentleTap software-as-a-service platform at ${LEGAL.websiteUrl}. GentleTap is self-serve software only — we do not provide consulting, managed collections, or human-operated follow-up services.`;
}

export function LegalEntityBlock() {
  return (
    <div className="not-prose my-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700">
      <p className="font-semibold text-slate-900">{LEGAL.legalName}</p>
      <p>{LEGAL.legalAddress}</p>
    </div>
  );
}
