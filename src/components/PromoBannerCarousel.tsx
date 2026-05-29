import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useActivePromoBanners } from '@/hooks/usePromoBanners';
import { cn } from '@/lib/utils';

export const PromoBannerCarousel = () => {
  const { data: banners, isLoading } = useActivePromoBanners();
  const [index, setIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const seconds = banners[index]?.rotation_seconds || 6;
    timer.current && clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, seconds * 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [banners, index]);

  if (isLoading || !banners || banners.length === 0) return null;

  const current = banners[index];
  const imageSrc = isMobile && current.mobile_image_url ? current.mobile_image_url : current.image_url;
  const alignClass =
    current.text_align === 'center'
      ? 'items-center text-center'
      : current.text_align === 'right'
      ? 'items-end text-right'
      : 'items-start text-left';

  const go = (dir: 1 | -1) =>
    setIndex((i) => (i + dir + banners.length) % banners.length);

  return (
    <section
      aria-label="Banners promocionais"
      className="relative w-full overflow-hidden bg-background"
    >
      <div
        className={cn(
          'relative w-full',
          isMobile ? 'aspect-[1080/1350]' : 'aspect-[1920/500]'
        )}
      >
        {/* Background image */}
        <img
          key={current.id + imageSrc}
          src={imageSrc}
          alt={current.title}
          className="absolute inset-0 w-full h-full object-cover animate-[fade-in_0.8s_ease-in-out]"
          loading="eager"
        />

        {/* Overlay (gradient for readability) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              current.text_align === 'center'
                ? `radial-gradient(circle at center, hsl(0 0% 0% / ${current.overlay_opacity}) 0%, hsl(0 0% 0% / ${
                    current.overlay_opacity * 0.6
                  }) 60%, transparent 100%)`
                : current.text_align === 'right'
                ? `linear-gradient(to left, hsl(0 0% 0% / ${current.overlay_opacity}) 0%, transparent 65%)`
                : `linear-gradient(to right, hsl(0 0% 0% / ${current.overlay_opacity}) 0%, transparent 65%)`,
          }}
        />

        {/* Content */}
        <div
          className={cn(
            'relative h-full w-full flex flex-col justify-center px-6 sm:px-12 md:px-20 lg:px-28',
            alignClass
          )}
        >
          <div
            className={cn(
              'max-w-xl space-y-5 animate-[fade-in_1s_ease-out]',
              current.text_align === 'center' && 'mx-auto'
            )}
          >
            {current.eyebrow && (
              <p className="text-[10.5px] md:text-[11px] uppercase tracking-[0.35em] font-light text-white/80">
                {current.eyebrow}
              </p>
            )}
            {current.title && (
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light leading-[1.05] tracking-[0.04em] text-white uppercase">
                {current.title}
              </h2>
            )}
            {current.subtitle && (
              <p className="text-sm md:text-base font-light tracking-wide text-white/90 max-w-md">
                {current.subtitle}
              </p>
            )}
            {current.description && (
              <p className="text-xs md:text-sm font-light text-white/75 max-w-md leading-relaxed">
                {current.description}
              </p>
            )}
            {current.coupon_code && (
              <p className="inline-block text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-white border border-white/40 px-3 py-1.5">
                Cupom: {current.coupon_code}
              </p>
            )}
            {current.show_button && current.button_label && current.button_link && (
              <div className={cn('pt-2', current.text_align === 'center' && 'flex justify-center')}>
                <Link
                  to={current.button_link}
                  className="inline-block text-[11px] md:text-xs uppercase tracking-[0.3em] font-light text-white border border-white px-8 py-3.5 hover:bg-white hover:text-foreground transition-colors duration-300"
                >
                  {current.button_label}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Arrows */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Banner anterior"
              className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-10 p-2 text-white/80 hover:text-white hover:bg-black/20 rounded-full transition"
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Próximo banner"
              className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-10 p-2 text-white/80 hover:text-white hover:bg-black/20 rounded-full transition"
            >
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.5} />
            </button>

            {/* Dots */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Ir para banner ${i + 1}`}
                  className={cn(
                    'h-[2px] transition-all duration-300',
                    i === index ? 'w-8 bg-white' : 'w-4 bg-white/40 hover:bg-white/70'
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
