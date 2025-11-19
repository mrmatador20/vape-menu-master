import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { Product } from "@/context/CartContext";

interface CategoryCarouselProps {
  categories: string[];
  products: Product[];
  activeCategory: string;
  activeSubcategory: string;
  onCategoryChange: (category: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
}

export function CategoryCarousel({
  categories,
  products,
  activeCategory,
  activeSubcategory,
  onCategoryChange,
  onSubcategoryChange,
}: CategoryCarouselProps) {
  // Get subcategories for the active category from products
  const subcategories = useMemo(() => {
    if (activeCategory === 'all') return [];
    
    // Get unique subcategories for this category from products
    const subs = products
      .filter(p => p.category === activeCategory && p.subcategory)
      .map(p => p.subcategory as string);
    
    return Array.from(new Set(subs)).sort();
  }, [activeCategory, products]);

  return (
    <div className="w-full max-w-6xl mx-auto px-16 sm:px-20 md:px-24 relative space-y-4">
      {/* Main Categories Carousel */}
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
        <CarouselPrevious className="-left-12 h-10 w-10 bg-card/90 backdrop-blur-sm border-2 border-border shadow-lg hover:bg-card hover:scale-110 transition-all duration-300" />
        <CarouselNext className="-right-12 h-10 w-10 bg-card/90 backdrop-blur-sm border-2 border-border shadow-lg hover:bg-card hover:scale-110 transition-all duration-300" />
      </Carousel>
    </div>
  );
}
