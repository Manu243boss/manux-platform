import React, { useEffect } from 'react';

interface SeoHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description = 'Découvrez, apprenez et achetez des produits créés par des entrepreneurs et créateurs africains. Présentations vidéo et passerelle directe vers Chariow.',
  canonical,
}) => {
  const fullTitle = title
    ? `${title} | ManuX`
    : 'ManuX — La vitrine des créateurs et produits Chariow';

  useEffect(() => {
    document.title = fullTitle;

    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', description);
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', fullTitle);
    }

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute('content', description);
    }

    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }
  }, [fullTitle, description, canonical]);

  return null;
};
