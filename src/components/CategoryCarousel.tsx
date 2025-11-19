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
import type { Category } from "@/hooks/useCategories";

interface CategoryCarouselProps {
  categories: string[];
  dbCategories: Category[];
  activeCategory: string;
  activeSubcategory: string;
  onCategoryChange: (category: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
}

export function CategoryCarousel({
  categories,
  dbCategories,
  activeCategory,
  activeSubcategory,
  onCategoryChange,
  onSubcategoryChange,
}: CategoryCarouselProps) {
  // Get subcategories for the active category
  const subcategories = useMemo(() => {
    if (activeCategory === 'all') return [];
    
    // Find main category in database
    const mainCategory = dbCategories.find(
      c => c.name.toLowerCase() === activeCategory.toLowerCase() && !c.parent_id
    );
    
    if (!mainCategory) return [];
    
    // Get all subcategories for this main category
    return dbCategories
      .filter(c => c.parent_id === mainCategory.id)
      .sort((a, b) => a.display_order - b.display_order);
  }, [activeCategory, dbCategories]);

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

      {/* Subcategories Carousel - Only shows when a category is selected and has subcategories */}
      {subcategories.length > 0 && (
        <div className="animate-in slide-in-from-top-2 duration-300">
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
                  variant={activeSubcategory === "all" ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "whitespace-nowrap transition-all duration-300 hover:scale-105 font-medium px-4",
                    activeSubcategory === "all" && "scale-105"
                  )}
                  onClick={() => onSubcategoryChange("all")}
                >
                  Todas
                </Button>
              </CarouselItem>
              {subcategories.map((subcategory) => (
                <CarouselItem key={subcategory.id} className="pl-2 md:pl-3 basis-auto">
                  <Button
                    variant={activeSubcategory === subcategory.name ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "whitespace-nowrap capitalize transition-all duration-300 hover:scale-105 font-medium px-4",
                      activeSubcategory === subcategory.name && "scale-105"
                    )}
                    onClick={() => onSubcategoryChange(subcategory.name)}
                  >
                    {subcategory.name}
                  </Button>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-12 h-8 w-8 bg-card/90 backdrop-blur-sm border border-border shadow-md hover:bg-card hover:scale-110 transition-all duration-300" />
            <CarouselNext className="-right-12 h-8 w-8 bg-card/90 backdrop-blur-sm border border-border shadow-md hover:bg-card hover:scale-110 transition-all duration-300" />
          </Carousel>
        </div>
      )}
    </div>
  );
}
