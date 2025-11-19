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
    <div className="w-full max-w-5xl mx-auto px-12">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          <CarouselItem className="pl-2 md:pl-4 basis-auto">
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              className={cn(
                "whitespace-nowrap transition-all",
                activeCategory === "all" && "shadow-glow"
              )}
              onClick={() => onCategoryChange("all")}
            >
              Todos
            </Button>
          </CarouselItem>
          {categories.map((category) => (
            <CarouselItem key={category} className="pl-2 md:pl-4 basis-auto">
              <Button
                variant={activeCategory === category ? "default" : "outline"}
                className={cn(
                  "whitespace-nowrap capitalize transition-all",
                  activeCategory === category && "shadow-glow"
                )}
                onClick={() => onCategoryChange(category)}
              >
                {category}
              </Button>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-0" />
        <CarouselNext className="right-0" />
      </Carousel>
    </div>
  );
}
