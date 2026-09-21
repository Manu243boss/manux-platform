import React, { useEffect } from 'react';

interface SeoHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article' | 'product' | 'profile' | 'video.other';
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description = 'Découvrez, apprenez et achetez des produits créés par des entrepreneurs et créateurs africains. Présentations vidéo et passerelle directe vers Chariow 24h/24.',
  canonical,
  image = 'https://manux.xttools.site/og-image.png',
  type = 'website',
  jsonLd,
}) => {
  // Format title: Ensure 'ManuX' brand is present without double appending
  let formattedTitle = '';
  if (!title) {
    formattedTitle = 'ManuX + Chariow • Vendez vos produits 24h/24';
  } else if (title.includes('ManuX')) {
    formattedTitle = title;
  } else {
    formattedTitle = `${title} | ManuX + Chariow`;
  }

  useEffect(() => {
    document.title = formattedTitle;

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        if (selector.startsWith('meta[name=')) {
          const nameMatch = selector.match(/meta\[name="([^"]+)"\]/);
          if (nameMatch) el.setAttribute('name', nameMatch[1]);
        } else if (selector.startsWith('meta[property=')) {
          const propMatch = selector.match(/meta\[property="([^"]+)"\]/);
          if (propMatch) el.setAttribute('property', propMatch[1]);
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    // Standard description
    setMeta('meta[name="description"]', 'content', description);

    // Open Graph
    setMeta('meta[property="og:title"]', 'content', formattedTitle);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:site_name"]', 'content', 'ManuX');
    setMeta('meta[property="og:type"]', 'content', type);
    if (image) {
      setMeta('meta[property="og:image"]', 'content', image);
      setMeta('meta[name="twitter:image"]', 'content', image);
    }
    const currentUrl = canonical || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://manux.xttools.site');
    setMeta('meta[property="og:url"]', 'content', currentUrl);

    // Twitter
    setMeta('meta[name="twitter:title"]', 'content', formattedTitle);
    setMeta('meta[name="twitter:description"]', 'content', description);

    // Canonical link
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', currentUrl);

    // Dynamic JSON-LD structured data injection
    if (jsonLd) {
      let script = document.getElementById('dynamic-page-jsonld') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = 'dynamic-page-jsonld';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      const script = document.getElementById('dynamic-page-jsonld');
      if (script) {
        script.textContent = '';
      }
    };
  }, [formattedTitle, description, canonical, image, type, jsonLd]);

  return null;
};
