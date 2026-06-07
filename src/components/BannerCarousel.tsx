import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { useActiveBanners } from '@/hooks/useBanners';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const getTransitionClasses = (transitionType: string, isExiting: boolean) => {
  if (isExiting) {
    switch (transitionType) {
      case 'fade':
        return 'animate-[fade-out_0.8s_ease-in-out]';
      case 'slide-left':
        return 'animate-[slide-out-left_0.8s_ease-in-out]';
      case 'slide-right':
        return 'animate-[slide-out-right_0.8s_ease-in-out]';
      case 'slide-up':
        return 'animate-[slide-out-up_0.8s_ease-in-out]';
      case 'slide-down':
        return 'animate-[slide-out-down_0.8s_ease-in-out]';
      case 'zoom':
        return 'animate-[zoom-out_0.8s_ease-in-out]';
      default:
        return 'animate-[fade-out_0.8s_ease-in-out]';
    }
  } else {
    switch (transitionType) {
      case 'fade':
        return 'animate-[fade-in_0.8s_ease-in-out]';
      case 'slide-left':
        return 'animate-[slide-in-left_0.8s_ease-in-out]';
      case 'slide-right':
        return 'animate-[slide-in-right_0.8s_ease-in-out]';
      case 'slide-up':
        return 'animate-[slide-in-up_0.8s_ease-in-out]';
      case 'slide-down':
        return 'animate-[slide-in-down_0.8s_ease-in-out]';
      case 'zoom':
        return 'animate-[zoom-in_0.8s_ease-in-out]';
      default:
        return 'animate-[fade-in_0.8s_ease-in-out]';
    }
  }
};

export const BannerCarousel = () => {
  const { data: banners, isLoading } = useActiveBanners();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [shouldMarquee, setShouldMarquee] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageViewportRef = useRef<HTMLDivElement | null>(null);
  const messageTextRef = useRef<HTMLDivElement | null>(null);
  const currentBanner = banners?.[currentIndex];

  const clearRotationInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startRotationInterval = () => {
    if (!banners || banners.length <= 1) return;
    
    clearRotationInterval();
    
    const rotationTime = (banners[currentIndex]?.rotation_seconds || 5) * 1000;
    intervalRef.current = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
        setIsTransitioning(false);
      }, 400);
    }, rotationTime);
  };

  useEffect(() => {
    startRotationInterval();
    return () => clearRotationInterval();
  }, [banners, currentIndex]);

  useLayoutEffect(() => {
    const viewport = messageViewportRef.current;
    const text = messageTextRef.current;

    if (!viewport || !text) {
      setShouldMarquee(false);
      return;
    }

    const updateOverflowState = () => {
      setShouldMarquee(text.scrollWidth > viewport.clientWidth);
    };

    updateOverflowState();

    const resizeObserver = new ResizeObserver(updateOverflowState);
    resizeObserver.observe(viewport);
    resizeObserver.observe(text);

    window.addEventListener('resize', updateOverflowState);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateOverflowState);
    };
  }, [currentBanner?.id, currentBanner?.title, currentBanner?.description, currentIndex]);

  if (isLoading || !banners || banners.length === 0 || !currentBanner) return null;
  const transitionClass = getTransitionClasses(
    currentBanner.transition_type || 'fade',
    isTransitioning
  );

  const nextBanner = () => {
    if (isTransitioning) return;
    clearRotationInterval();
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
      setIsTransitioning(false);
    }, 400);
  };

  const prevBanner = () => {
    if (isTransitioning) return;
    clearRotationInterval();
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + banners.length) % banners.length);
      setIsTransitioning(false);
    }, 400);
  };

  const goToBanner = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    clearRotationInterval();
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 400);
  };

  const BannerLink = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    if (!currentBanner.link_url) return <div className={className}>{children}</div>;
    if (currentBanner.link_url.startsWith('/')) {
      return (
        <Link to={currentBanner.link_url} className={className} onClick={(e) => e.stopPropagation()}>
          {children}
        </Link>
      );
    }
    return (
      <a href={currentBanner.link_url} className={className} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        {children}
      </a>
    );
  };

  // Banner completo (imagem)
  if (currentBanner.full_banner_image_url) {
    return (
      <div className="relative w-full overflow-hidden">
        <div className="container max-w-7xl mx-auto px-4 relative">
          {banners.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={prevBanner}
                disabled={isTransitioning}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hover:bg-white/20 bg-black/30"
                aria-label="Banner anterior"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={nextBanner}
                disabled={isTransitioning}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hover:bg-white/20 bg-black/30"
                aria-label="Próximo banner"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </Button>
            </>
          )}
        </div>

        <BannerLink className="block cursor-pointer">
          <img
            key={currentBanner.id}
            src={currentBanner.full_banner_image_url}
            alt={currentBanner.title}
            className={`w-full h-auto ${transitionClass}`}
          />
        </BannerLink>

        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex justify-center gap-2 z-10">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToBanner(index)}
                className="w-2 h-2 rounded-full transition-all duration-300 bg-white"
                style={{
                  opacity: index === currentIndex ? 1 : 0.4,
                }}
                aria-label={`Ir para banner ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Announcement bar (texto) — luxo, fino e elegante
  const stripEmoji = (s?: string | null) =>
    (s || '')
      .replace(
        /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2700}-\u{27BF}\u{FE0F}\u{200D}]/gu,
        ''
      )
      .replace(/\s+/g, ' ')
      .trim();

  const title = stripEmoji(currentBanner.title);
  const desc = stripEmoji(currentBanner.description);

  return (
    <div className="relative block w-full max-w-[100vw] overflow-x-hidden bg-card border-b border-border/60">
      <div className="container mx-auto flex h-8 min-w-0 max-w-full items-center justify-center gap-3 overflow-hidden px-4 md:h-9">
        {banners.length > 1 && (
          <button
            type="button"
            onClick={prevBanner}
            disabled={isTransitioning}
            aria-label="Anterior"
            className="shrink-0 text-primary/70 hover:text-primary transition-opacity disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}

        <BannerLink className="block min-w-0 flex-1 cursor-pointer overflow-hidden">
          <div
            ref={messageViewportRef}
            className={`relative flex h-full w-full min-w-0 items-center overflow-hidden ${transitionClass}`}
          >
            <div className="flex w-full min-w-0 overflow-hidden">
              {shouldMarquee ? (
                <div className="flex motion-safe:animate-[banner-marquee_16s_linear_infinite]">
                  <div
                    key={`${currentBanner.id}-marquee`}
                    ref={messageTextRef}
                    className="flex flex-col items-center justify-center text-center shrink-0 px-4"
                  >
                    <span
                      className="inline-block whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.32em] text-primary md:text-[11px]"
                      style={{ textShadow: '0 0 1px hsl(var(--primary) / 0.15)' }}
                    >
                      {title}
                    </span>
                    {desc && (
                      <span
                        className="inline-block whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.32em] text-primary md:text-[11px]"
                        style={{ textShadow: '0 0 1px hsl(var(--primary) / 0.15)' }}
                      >
                        {desc}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-center justify-center text-center shrink-0 px-4">
                    <span
                      className="inline-block whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.32em] text-primary md:text-[11px]"
                      style={{ textShadow: '0 0 1px hsl(var(--primary) / 0.15)' }}
                    >
                      {title}
                    </span>
                    {desc && (
                      <span
                        className="inline-block whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.32em] text-primary md:text-[11px]"
                        style={{ textShadow: '0 0 1px hsl(var(--primary) / 0.15)' }}
                      >
                        {desc}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  key={`${currentBanner.id}-static`}
                  ref={messageTextRef}
                  className="flex flex-col items-center justify-center text-center w-full"
                >
                  <span
                    className="block w-full truncate text-center text-[10.5px] font-medium uppercase tracking-[0.32em] text-primary md:text-[11px]"
                    style={{ textShadow: '0 0 1px hsl(var(--primary) / 0.15)' }}
                  >
                    {title}
                  </span>
                  {desc && (
                    <span
                      className="block w-full truncate text-center text-[10.5px] font-medium uppercase tracking-[0.32em] text-primary md:text-[11px]"
                      style={{ textShadow: '0 0 1px hsl(var(--primary) / 0.15)' }}
                    >
                      {desc}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </BannerLink>

        {banners.length > 1 && (
          <button
            type="button"
            onClick={nextBanner}
            disabled={isTransitioning}
            aria-label="Próximo"
            className="shrink-0 text-primary/70 hover:text-primary transition-opacity disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
};
