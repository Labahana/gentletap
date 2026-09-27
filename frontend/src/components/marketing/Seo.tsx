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
  ogImage?: string;
  publishedTime?: string;
  modifiedTime?: string;
};

export const Seo: React.FC<SeoProps> = ({
  title,
  description,
  path,
  keywords,
  noindex = false,
  jsonLd,
  ogType = 'website',
  ogImage = `${SITE_URL}/og-image.jpg`,
  publishedTime,
  modifiedTime,
}) => {
  const canonical = path ? `${SITE_URL}${path}` : SITE_URL;
  const fullTitle = title.includes('GentleTap') ? title : `${title} | GentleTap`;
  return (
    <Helmet defer={false}>
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
      <meta property="og:locale" content="en_US" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1376" />
      <meta property="og:image:height" content="768" />
      <meta property="og:image:alt" content="GentleTap — automated invoice reminders" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {jsonLd &&
        jsonLd.map((obj, i) =>
          // helmet reads `innerHTML` from child props and never renders this element to the DOM
          React.createElement('script', {
            key: i,
            type: 'application/ld+json',
            innerHTML: JSON.stringify(obj).replace(/</g, '\\u003c'),
          } as Record<string, unknown>),
        )}
    </Helmet>
  );
};
