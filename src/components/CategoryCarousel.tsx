import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CategoryCarouselProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryCarousel({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryCarouselProps) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 md:px-16 relative">
      <Carousel
        opts={{
          align: "start",
          loop: false,
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-3">
          <CarouselItem className="pl-2 md:pl-3 basis-auto">
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              size="lg"
              className={cn(
                "whitespace-nowrap transition-all duration-300 hover:scale-105 font-medium px-6",
                activeCategory === "all" && "shadow-glow scale-105"
              )}
              onClick={() => onCategoryChange("all")}
            >
              Todos
            </Button>
          </CarouselItem>
          {categories.map((category) => (
            <CarouselItem key={category} className="pl-2 md:pl-3 basis-auto">
              <Button
                variant={activeCategory === category ? "default" : "outline"}
                size="lg"
                className={cn(
                  "whitespace-nowrap capitalize transition-all duration-300 hover:scale-105 font-medium px-6",
                  activeCategory === category && "shadow-glow scale-105"
                )}
                onClick={() => onCategoryChange(category)}
              >
                {category}
              </Button>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-2 md:-left-4 h-10 w-10 bg-card/90 backdrop-blur-sm border-2 border-border shadow-lg hover:bg-card hover:scale-110 transition-all duration-300" />
        <CarouselNext className="-right-2 md:-right-4 h-10 w-10 bg-card/90 backdrop-blur-sm border-2 border-border shadow-lg hover:bg-card hover:scale-110 transition-all duration-300" />
      </Carousel>
    </div>
  );
}
