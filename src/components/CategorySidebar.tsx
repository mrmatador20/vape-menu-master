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
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 left-4 z-50 md:hidden bg-primary text-primary-foreground shadow-glow hover:bg-primary/90 h-14 w-14"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 h-[calc(100vh-5rem)] bg-card/95 backdrop-blur-sm border-r border-border shadow-xl transition-all duration-500 ease-in-out z-40 overflow-y-auto",
          // Mobile behavior
          "top-20",
          isOpen ? "translate-x-0 w-72" : "-translate-x-full w-0",
          // Desktop behavior - collapsible
          "md:translate-x-0",
          isDesktopOpen ? "md:w-72" : "md:-translate-x-full md:w-0"
        )}
      >

        <div className="p-3">
          {/* Close button for desktop */}
          <div className="hidden md:flex justify-end mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-accent"
              onClick={() => setIsDesktopOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3 block md:block">
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
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Desktop toggle button - show when sidebar is closed */}
      {!isDesktopOpen && (
        <Button
          variant="outline"
          size="icon"
          className="hidden md:flex fixed left-4 top-24 z-50 bg-primary text-primary-foreground shadow-glow hover:bg-primary/90 h-12 w-12"
          onClick={() => setIsDesktopOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
    </>
  );
}
