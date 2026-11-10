import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import jacketPlaceholder from '../assets/jacket-placeholder.svg';

type BlurImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'onLoad' | 'onError'> & {
  src?: string;
  alt: string;
  frameClassName?: string;
  imageClassName?: string;
  fallbackSrc?: string;
};

/** Lightweight blur-up image with an inline skeleton and a local fallback. */
export default function BlurImage({
  src,
  alt,
  frameClassName = '',
  imageClassName = '',
  fallbackSrc = jacketPlaceholder,
  loading = 'lazy',
  ...imageProps
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  const resolvedSrc = failed ? fallbackSrc : (src || fallbackSrc);

  return (
    <span className={`blur-image-frame ${frameClassName} ${loaded ? 'is-loaded' : ''}`}>
      <span className="blur-image-skeleton" aria-hidden="true" />
      <img
        {...imageProps}
        src={resolvedSrc}
        alt={alt}
        loading={loading}
        className={`blur-image ${imageClassName}`.trim()}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!failed) {
            setFailed(true);
            setLoaded(false);
          } else {
            setLoaded(true);
          }
        }}
      />
    </span>
  );
}
