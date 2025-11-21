import { useState, useEffect, useRef } from 'react';
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  if (isLoading || !banners || banners.length === 0) return null;

  const currentBanner = banners[currentIndex];
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
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={nextBanner}
                disabled={isTransitioning}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hover:bg-white/20 bg-black/30"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </Button>
            </>
          )}
        </div>

        <img
          key={currentBanner.id}
          src={currentBanner.full_banner_image_url}
          alt={currentBanner.title}
          className={`w-full h-auto ${transitionClass}`}
        />

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

  // Banner com cor/imagem de fundo
  return (
    <div className="relative w-full overflow-hidden">
      <div 
        key={currentBanner.id}
        className={`relative w-full py-4 px-4 ${transitionClass}`}
        style={{
          backgroundColor: currentBanner.background_color,
          color: currentBanner.text_color,
          backgroundImage: currentBanner.background_image_url 
            ? `url(${currentBanner.background_image_url})` 
            : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="container max-w-7xl mx-auto flex items-center justify-between gap-4">
          {banners.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={prevBanner}
              disabled={isTransitioning}
              className="shrink-0 hover:bg-white/20"
              style={{ color: currentBanner.text_color }}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          <div className="flex-1 text-center space-y-1">
            <h2 className="text-xl md:text-2xl font-bold drop-shadow-lg">
              {currentBanner.title}
            </h2>
            {currentBanner.description && (
              <p className="text-sm md:text-base opacity-90 drop-shadow-lg">
                {currentBanner.description}
              </p>
            )}
          </div>

          {banners.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={nextBanner}
              disabled={isTransitioning}
              className="shrink-0 hover:bg-white/20"
              style={{ color: currentBanner.text_color }}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>

        {banners.length > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToBanner(index)}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: currentBanner.text_color,
                  opacity: index === currentIndex ? 1 : 0.4,
                }}
                aria-label={`Ir para banner ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
