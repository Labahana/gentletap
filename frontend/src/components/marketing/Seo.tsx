import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '../../data/seo';

type SeoProps = {
  title: string;
  description: string;
  path?: string;
  keywords?: readonly string[];
  noindex?: boolean;
  jsonLd?: ReadonlyArray<Record<string, unknown>>;
  ogType?: string;
};

export const Seo: React.FC<SeoProps> = ({
  title,
  description,
  path,
  keywords,
  noindex = false,
  jsonLd,
  ogType = 'website',
}) => {
  const canonical = path ? `${SITE_URL}${path}` : SITE_URL;
  const fullTitle = title.includes('GentleTap') ? title : `${title} | GentleTap`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={noindex ? 'noindex, follow' : 'index, follow'} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="GentleTap" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {jsonLd &&
        jsonLd.map((obj, i) => (
          <script key={i} type="application/ld+json">
            {JSON.stringify(obj)}
          </script>
        ))}
    </Helmet>
  );
};
