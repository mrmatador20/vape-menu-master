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
    <div className="w-full max-w-5xl mx-auto px-12 sm:px-16 relative">
      <Carousel
        opts={{ align: "start", loop: false, dragFree: true }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          <CarouselItem className="pl-4 basis-auto">
            <button
              type="button"
              onClick={() => onCategoryChange("all")}
              className={cn(
                "text-[11px] uppercase tracking-[0.25em] py-2 px-1 transition-all border-b",
                activeCategory === "all"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Todos
            </button>
          </CarouselItem>
          {categories.map((category) => (
            <CarouselItem key={category} className="pl-4 basis-auto">
              <button
                type="button"
                onClick={() => onCategoryChange(category)}
                className={cn(
                  "text-[11px] uppercase tracking-[0.25em] py-2 px-1 capitalize transition-all border-b",
                  activeCategory === category
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {category}
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-2 h-8 w-8 bg-transparent border-0 shadow-none text-muted-foreground hover:text-foreground hover:bg-transparent" />
        <CarouselNext className="-right-2 h-8 w-8 bg-transparent border-0 shadow-none text-muted-foreground hover:text-foreground hover:bg-transparent" />
      </Carousel>
    </div>
  );
}
