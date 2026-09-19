import React, { useState, useEffect } from 'react';
import { ImageCacheService } from '../../services/imageCacheService';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallbackSrc?: string;
  placeholderClassName?: string;
}

export const CachedImage: React.FC<CachedImageProps> = ({
  src,
  fallbackSrc,
  alt = '',
  className = '',
  placeholderClassName = 'bg-slate-100 animate-pulse',
  ...props
}) => {
  const [cachedUrl, setCachedUrl] = useState<string>(src || '');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!src) {
      setCachedUrl(fallbackSrc || '');
      return;
    }

    // Try loading from ImageCacheService
    ImageCacheService.getCachedImageUrl(src)
      .then((url) => {
        if (isMounted) {
          setCachedUrl(url);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCachedUrl(src);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [src, fallbackSrc]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && !error && (
        <div className={`absolute inset-0 ${placeholderClassName}`} />
      )}
      <img
        src={error && fallbackSrc ? fallbackSrc : cachedUrl || fallbackSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          if (fallbackSrc) setCachedUrl(fallbackSrc);
        }}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        {...props}
      />
    </div>
  );
};
