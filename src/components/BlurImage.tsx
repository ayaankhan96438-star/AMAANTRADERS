import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import jacketPlaceholder from '../assets/jacket-placeholder.svg';

type BlurImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'onLoad' | 'onError'> & {
  src?: string;
  alt: string;
  frameClassName?: string;
  imageClassName?: string;
  fallbackSrc?: string;
};

/**
 * Reliable blur-up image:
 * - detects images that completed from cache before React's onLoad handler ran;
 * - falls back to the local jacket placeholder when a remote image is blocked;
 * - never leaves the image frame permanently transparent.
 */
export default function BlurImage({
  src,
  alt,
  frameClassName = '',
  imageClassName = '',
  fallbackSrc = jacketPlaceholder,
  loading = 'lazy',
  ...imageProps
}: BlurImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const [fallbackUnavailable, setFallbackUnavailable] = useState(false);

  const showingFallback = !src || failedSource === src;
  const resolvedSrc = showingFallback ? fallbackSrc : src;
  const isLoaded = loadedSource === resolvedSrc || (showingFallback && fallbackUnavailable);

  // Cached images may be complete before the browser dispatches onLoad to React.
  useEffect(() => {
    const image = imageRef.current;
    if (!image || !image.complete) return;

    if (image.naturalWidth > 0) {
      setLoadedSource(resolvedSrc);
      return;
    }

    if (!showingFallback && src) {
      setFailedSource(src);
    } else {
      setFallbackUnavailable(true);
    }
  }, [resolvedSrc, showingFallback, src]);

  const handleError = () => {
    if (!showingFallback && src) {
      setFailedSource(src);
    } else {
      setFallbackUnavailable(true);
    }
  };

  return (
    <span
      className={`blur-image-frame ${frameClassName} ${isLoaded ? 'is-loaded' : ''}`.trim()}
      data-image-state={isLoaded ? (showingFallback ? 'fallback' : 'loaded') : 'loading'}
    >
      <span className="blur-image-skeleton" aria-hidden="true" />
      {fallbackUnavailable && showingFallback ? (
        <span className="blur-image-fallback-art" role="img" aria-label={alt}>
          <strong>A/T</strong>
          <small>AMAANTRADER</small>
        </span>
      ) : (
        <img
          {...imageProps}
          key={resolvedSrc}
          ref={imageRef}
          src={resolvedSrc}
          alt={alt}
          loading={loading}
          className={`blur-image ${imageClassName}`.trim()}
          onLoad={() => setLoadedSource(resolvedSrc)}
          onError={handleError}
        />
      )}
    </span>
  );
}
