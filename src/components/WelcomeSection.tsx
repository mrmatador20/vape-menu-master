import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSiteIdentity } from '@/hooks/useSiteIdentity';
import { useActiveHeroBanners } from '@/hooks/useHeroBanners';

const AUTOPLAY_MS = 5000;

export default function WelcomeSection() {
  const { data: siteIdentity } = useSiteIdentity();
  const { data: banners } = useActiveHeroBanners();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = banners ?? [];
  const count = slides.length;

  const next = useCallback(() => setIndex((i) => (count ? (i + 1) % count : 0)), [count]);
  const prev = useCallback(() => setIndex((i) => (count ? (i - 1 + count) % count : 0)), [count]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [count, paused, next]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  const fallbackImage = !count ? siteIdentity?.site_hero_image_url : undefined;

  return (
    <section
      className="relative py-24 md:py-32 px-4 overflow-hidden bg-cover bg-center bg-no-repeat"
      style={fallbackImage ? { backgroundImage: `url(${fallbackImage})` } : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {fallbackImage && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-[1px]" aria-hidden="true" />
      )}

      {slides.map((banner, i) => (
        <div
          key={banner.id}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
          aria-hidden={i !== index}
        >
          <img
            src={banner.image_url}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 bg-background backdrop-blur-[1px]"
            style={{ opacity: banner.opacity / 100 }}
            aria-hidden="true"
          />
        </div>
      ))}

      <div className="relative container max-w-4xl text-center space-y-8">
        {siteIdentity && (
          <>
            <h1 className="font-serif text-3xl sm:text-5xl md:text-7xl font-normal tracking-[0.08em] sm:tracking-[0.15em] leading-tight sm:leading-[1.1] uppercase text-foreground max-w-[14ch] sm:max-w-none mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 [text-shadow:0_2px_12px_hsl(var(--background))]">
              {siteIdentity.site_hero_title ?? 'Bem-vindo à Fox Velour'}
            </h1>
            <div className="mx-auto h-px w-16 bg-primary/60" />
            <p className="text-sm md:text-base text-foreground/80 max-w-xl mx-auto leading-relaxed font-light whitespace-pre-line animate-in fade-in duration-1000 delay-200 [text-shadow:0_1px_8px_hsl(var(--background))]">
              {siteIdentity.site_hero_subtitle ?? 'Descubra uma curadoria exclusiva de moda e fragrâncias feitas para quem não abre mão da sofisticação. Explore nossa linha de perfumaria fina e vestuário.'}
            </p>
          </>
        )}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Banner anterior"
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full border border-border/60 bg-background/50 text-foreground/70 backdrop-blur-sm transition-colors hover:bg-background/80 hover:text-foreground flex items-center justify-center"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Próximo banner"
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full border border-border/60 bg-background/50 text-foreground/70 backdrop-blur-sm transition-colors hover:bg-background/80 hover:text-foreground flex items-center justify-center"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="absolute bottom-5 left-0 right-0 z-10 flex justify-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ir para o banner ${i + 1}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-6 bg-primary' : 'w-1.5 bg-foreground/30 hover:bg-foreground/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
