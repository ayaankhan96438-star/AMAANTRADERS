import type { Product } from '../types';
import BlurImage from './BlurImage';

type JacketShowcaseProps = {
  product?: Product;
};

export default function JacketShowcase({ product }: JacketShowcaseProps) {
  if (!product) return null;

  const image = product.images?.[0] || product.image;
  const material = product.fabric && !/confirm/i.test(product.fabric)
    ? product.fabric
    : 'Shell and lining composition awaiting supplier confirmation.';
  const fit = product.fit || 'Fit details to be confirmed.';

  return (
    <section className="at-jacket-showcase section-pad" data-at-showcase data-no-reveal="true">
      <div className="at-jacket-showcase-media">
        {image ? (
          <BlurImage
            src={image}
            alt={`${product.name} — jacket showcase`}
            data-at-showcase-image
            loading="lazy"
            decoding="async"
            frameClassName="at-showcase-image-frame"
            imageClassName="at-showcase-photo"
          />
        ) : null}
        <span className="at-jacket-showcase-image-caption">AMAANTRADER / THE OUTERWEAR STUDY</span>
      </div>

      <div className="at-jacket-showcase-copy">
        <span className="eyebrow">A CLOSER LOOK / 01</span>
        <h2>Made to be<br /><em>lived in.</em></h2>
        <p>
          A closer look at {product.name}. Explore the silhouette and the details
          that matter before choosing your next layer.
        </p>

        <div className="at-jacket-showcase-features">
          <article className="at-jacket-showcase-feature" data-at-showcase-feature>
            <span>01 / MATERIAL</span>
            <h3>Know the finish.</h3>
            <p>{material}</p>
          </article>
          <article className="at-jacket-showcase-feature" data-at-showcase-feature>
            <span>02 / WARMTH</span>
            <h3>Layer with clarity.</h3>
            <p>Insulation and warmth specifications must be confirmed with the supplier.</p>
          </article>
          <article className="at-jacket-showcase-feature" data-at-showcase-feature>
            <span>03 / FIT</span>
            <h3>{fit}</h3>
            <p>Check the size guide and garment measurements before ordering.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
