import { Link } from 'react-router-dom';
import promoImage from '@/assets/home-promo-banner.jpg';

interface HomePromoBannerProps {
  imageUrl?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

/**
 * Banner promocional full-width, editorial fashion.
 * Texto posicionado à esquerda com overlay sutil somente nessa área,
 * preservando a fotografia à direita.
 */
const HomePromoBanner = ({
  imageUrl = promoImage,
  eyebrow = 'Coleção Casual',
  title = 'Promoção 10%',
  subtitle = 'Peças selecionadas para uma estação de elegância silenciosa.',
  ctaLabel = 'Ver Coleção',
  ctaHref = '/?category=all',
}: HomePromoBannerProps) => {
  return (
    <section
      aria-label="Banner promocional"
      className="relative w-full overflow-hidden bg-card"
    >
      <div className="relative w-full h-[70vh] min-h-[420px] max-h-[760px]">
        <img
          src={imageUrl}
          alt=""
          width={1920}
          height={1080}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Overlay sutil apenas na área do texto (esquerda) */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent md:from-black/60 md:via-black/20"
        />

        <div className="relative h-full container max-w-7xl mx-auto px-6 md:px-10 flex items-center">
          <div className="max-w-xl text-white space-y-7 md:space-y-9">
            <span className="block text-[10.5px] md:text-[11px] uppercase tracking-[0.45em] font-light text-white/85">
              {eyebrow}
            </span>

            <h2 className="font-serif font-light text-4xl sm:text-5xl md:text-6xl leading-[1.05] tracking-[0.04em] uppercase">
              {title}
            </h2>

            <div className="h-px w-12 bg-white/70" />

            <p className="text-sm md:text-base font-light leading-relaxed text-white/85 max-w-md">
              {subtitle}
            </p>

            <div className="pt-2">
              <Link
                to={ctaHref}
                className="inline-flex items-center text-[11px] md:text-xs uppercase tracking-[0.35em] font-light text-white border border-white/80 hover:bg-white hover:text-foreground px-9 py-4 rounded-none transition-colors duration-300"
              >
                {ctaLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomePromoBanner;
