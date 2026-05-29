import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivePromoBanners } from '@/hooks/usePromoBanners';
import { ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const PromoBanner = () => {
  const { data: banners, isLoading } = useActivePromoBanners();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const ms = (banners[index]?.rotation_seconds || 6) * 1000;
    timerRef.current = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % banners.length);
        setFading(false);
      }, 350);
    }, ms);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [banners, index]);

  if (isLoading || !banners || banners.length === 0) return null;

  const banner = banners[index];

  const go = (dir: 1 | -1) => {
    setFading(true);
    setTimeout(() => {
      setIndex((i) => (i + dir + banners.length) % banners.length);
      setFading(false);
    }, 300);
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(`Cupom ${code} copiado!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const handleCTA = () => {
    const link = banner.button_link || '/';
    if (link.startsWith('http')) window.open(link, '_blank');
    else navigate(link);
  };

  return (
    <section className="px-4 md:px-6 pb-16 md:pb-20">
      <div className="container max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-border/60 bg-card shadow-[0_30px_80px_-40px_hsl(var(--primary)/0.35)]">
          <div
            key={banner.id}
            className={`grid md:grid-cols-2 transition-opacity duration-300 ${
              fading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {/* LEFT — content */}
            <div className="order-2 md:order-1 px-7 sm:px-10 md:px-14 py-10 md:py-16 flex flex-col justify-center text-center md:text-left space-y-5">
              {banner.subtitle && (
                <p className="text-[10px] md:text-[11px] uppercase tracking-[0.4em] text-primary/80 font-medium">
                  {banner.subtitle}
                </p>
              )}

              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-[1.05] tracking-[0.02em] text-foreground">
                {banner.title}
              </h2>

              <div className="mx-auto md:mx-0 h-px w-12 bg-primary/60" />

              {banner.description && (
                <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed font-light max-w-md mx-auto md:mx-0">
                  {banner.description}
                </p>
              )}

              {banner.coupon_code && (
                <div className="flex items-center justify-center md:justify-start gap-3 pt-1">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    Cupom
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(banner.coupon_code!)}
                    className="group inline-flex items-center gap-2 border border-primary/40 hover:border-primary bg-background/50 px-4 py-2 rounded-sm transition-colors"
                  >
                    <span className="font-mono text-sm tracking-[0.25em] text-foreground font-medium">
                      {banner.coupon_code}
                    </span>
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </button>
                </div>
              )}

              <div className="pt-3 flex justify-center md:justify-start">
                <Button
                  onClick={handleCTA}
                  size="lg"
                  className="rounded-sm px-8 h-12 text-[11px] uppercase tracking-[0.3em] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02]"
                >
                  {banner.button_label}
                </Button>
              </div>
            </div>

            {/* RIGHT — image */}
            <div className="order-1 md:order-2 relative h-56 sm:h-72 md:h-auto md:min-h-[440px] overflow-hidden">
              <img
                src={banner.image_url}
                alt={banner.title}
                loading="eager"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-background/40 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Controls */}
          {banners.length > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                aria-label="Anterior"
                className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/70 backdrop-blur border border-border/60 hover:bg-background flex items-center justify-center transition-colors z-10"
              >
                <ChevronLeft className="h-4 w-4 text-foreground" />
              </button>
              <button
                onClick={() => go(1)}
                aria-label="Próximo"
                className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/70 backdrop-blur border border-border/60 hover:bg-background flex items-center justify-center transition-colors z-10"
              >
                <ChevronRight className="h-4 w-4 text-foreground" />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setFading(true);
                      setTimeout(() => {
                        setIndex(i);
                        setFading(false);
                      }, 250);
                    }}
                    aria-label={`Banner ${i + 1}`}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === index ? 'w-8 bg-primary' : 'w-2 bg-primary/30 hover:bg-primary/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
