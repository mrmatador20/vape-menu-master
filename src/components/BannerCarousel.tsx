import { useState, useEffect } from 'react';
import { useActiveBanners } from '@/hooks/useBanners';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const BannerCarousel = () => {
  const { data: banners, isLoading } = useActiveBanners();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!banners || banners.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, (banners[currentIndex]?.rotation_seconds || 5) * 1000);

    return () => clearInterval(interval);
  }, [banners, currentIndex]);

  if (isLoading || !banners || banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  const nextBanner = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
  };

  const prevBanner = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + banners.length) % banners.length);
  };

  // Banner completo (imagem)
  if (currentBanner.full_banner_image_url) {
    return (
      <div className="relative w-full transition-all duration-500 animate-in fade-in">
        <div className="container max-w-7xl mx-auto px-4">
          {banners.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={prevBanner}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hover:bg-white/20 bg-black/30"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={nextBanner}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hover:bg-white/20 bg-black/30"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </Button>
            </>
          )}
        </div>

        <img
          src={currentBanner.full_banner_image_url}
          alt={currentBanner.title}
          className="w-full h-auto animate-in fade-in slide-in-from-bottom-2 duration-500"
        />

        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex justify-center gap-2 z-10">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
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
    <div 
      className="relative w-full py-4 px-4 transition-all duration-500 animate-in fade-in"
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
            className="shrink-0 hover:bg-white/20"
            style={{ color: currentBanner.text_color }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}

        <div className="flex-1 text-center space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
              onClick={() => setCurrentIndex(index)}
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
  );
};
