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

  return (
    <div 
      className="relative w-full py-4 px-4 transition-all duration-500 animate-in fade-in"
      style={{
        backgroundColor: currentBanner.background_color,
        color: currentBanner.text_color,
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
          <h2 className="text-xl md:text-2xl font-bold">
            {currentBanner.title}
          </h2>
          {currentBanner.description && (
            <p className="text-sm md:text-base opacity-90">
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
