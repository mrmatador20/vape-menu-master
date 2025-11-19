import { ChevronRight, Menu, X } from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
          "fixed top-0 left-0 h-full bg-card border-r border-border shadow-lg transition-all duration-300 z-40 pt-20",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0 md:sticky md:top-20",
          isOpen ? "w-64" : "md:w-16"
        )}
      >
        {/* Desktop Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex absolute -right-3 top-4 bg-card border border-border rounded-full shadow-sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </Button>

        <div className="p-4">
          {isOpen ? (
            <div className="space-y-2">
              <Button
                variant={activeCategory === "all" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => {
                  onCategoryChange("all");
                  setIsOpen(false);
                }}
              >
                Todas as Categorias
              </Button>

              <Accordion type="single" collapsible className="w-full">
                {categories.map((category) => (
                  <AccordionItem key={category} value={category} className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline hover:bg-accent/50 px-3 rounded-md">
                      <span className="capitalize">{category}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Button
                        variant={activeCategory === category ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start ml-4"
                        onClick={() => {
                          onCategoryChange(category);
                          setIsOpen(false);
                        }}
                      >
                        Ver Produtos
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={activeCategory === category ? "default" : "ghost"}
                  size="icon"
                  className="w-full"
                  onClick={() => onCategoryChange(category)}
                  title={category}
                >
                  {category.charAt(0).toUpperCase()}
                </Button>
              ))}
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
