import { ChevronRight, Menu, X, Package, Sparkles } from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Map categories to icons
const categoryIcons: Record<string, any> = {
  v250: Package,
  v400: Sparkles,
  default: Package,
};

const getCategoryIcon = (category: string) => {
  const IconComponent = categoryIcons[category.toLowerCase()] || categoryIcons.default;
  return IconComponent;
};

interface CategorySidebarProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategorySidebar({
  categories,
  activeCategory,
  onCategoryChange,
}: CategorySidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-20 left-4 z-50 md:hidden bg-card shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-card/95 backdrop-blur-sm border-r border-border shadow-xl transition-all duration-500 ease-in-out z-40 pt-20",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0 md:sticky md:top-20",
          isOpen ? "w-72" : "md:w-16"
        )}
      >
        {/* Desktop Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex absolute -right-3 top-4 bg-card border border-border rounded-full shadow-md hover:shadow-lg transition-all duration-300"
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform duration-500",
              isOpen && "rotate-180"
            )}
          />
        </Button>

        <div className="p-3">
          {isOpen ? (
            <div className="space-y-3">
              <Button
                variant={activeCategory === "all" ? "default" : "ghost"}
                className="w-full justify-start gap-3 h-11 text-base font-medium transition-all duration-300"
                onClick={() => {
                  onCategoryChange("all");
                  if (window.innerWidth < 768) setIsOpen(false);
                }}
              >
                <Menu className="h-5 w-5" />
                <span>Todas as Categorias</span>
              </Button>

              <Accordion type="single" collapsible className="w-full space-y-2">
                {categories.map((category) => {
                  const Icon = getCategoryIcon(category);
                  return (
                    <AccordionItem key={category} value={category} className="border-none">
                      <AccordionTrigger className="py-3 hover:no-underline hover:bg-accent/50 px-3 rounded-lg transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5" />
                          <span className="capitalize text-base font-medium">{category}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-2">
                        <Button
                          variant={activeCategory === category ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start ml-8 gap-2 transition-all duration-300"
                          onClick={() => {
                            onCategoryChange(category);
                            if (window.innerWidth < 768) setIsOpen(false);
                          }}
                        >
                          Ver Produtos
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                variant={activeCategory === "all" ? "default" : "ghost"}
                size="icon"
                className="w-full h-11 transition-all duration-300"
                onClick={() => onCategoryChange("all")}
                title="Todas as Categorias"
              >
                <Menu className="h-5 w-5" />
              </Button>
              {categories.map((category) => {
                const Icon = getCategoryIcon(category);
                return (
                  <Button
                    key={category}
                    variant={activeCategory === category ? "default" : "ghost"}
                    size="icon"
                    className="w-full h-11 transition-all duration-300"
                    onClick={() => onCategoryChange(category)}
                    title={category}
                  >
                    <Icon className="h-5 w-5" />
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
