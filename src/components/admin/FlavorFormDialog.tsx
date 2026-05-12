import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Flavor } from "@/hooks/useFlavors";
import { VariantImagesField } from "./VariantImagesField";
import { Plus, Trash2 } from "lucide-react";

interface ColorRow {
  color: string;
  color_hex: string;
  stock: number;
  sku: string;
  image_urls: string[];
}

interface FlavorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  flavor?: Flavor | null;
}

const emptyColor = (): ColorRow => ({
  color: "",
  color_hex: "#000000",
  stock: 0,
  sku: "",
  image_urls: [],
});

export function FlavorFormDialog({
  open,
  onOpenChange,
  productId,
  flavor,
}: FlavorFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!flavor;

  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState<string>("");
  const [colors, setColors] = useState<ColorRow[]>([emptyColor()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (flavor) {
      setName(flavor.name || "");
      setSize(flavor.size || "");
      setPrice(flavor.price ? String(flavor.price) : "");
      setColors([
        {
          color: flavor.color || "",
          color_hex: flavor.color_hex || "#000000",
          stock: flavor.stock ?? 0,
          sku: flavor.sku || "",
          image_urls:
            (flavor.image_urls && flavor.image_urls.length > 0)
              ? flavor.image_urls
              : flavor.image_url
                ? [flavor.image_url]
                : [],
        },
      ]);
    } else {
      setName("");
      setSize("");
      setPrice("");
      setColors([emptyColor()]);
    }
  }, [flavor, open]);

  const updateColor = (i: number, patch: Partial<ColorRow>) =>
    setColors((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const addColorRow = () => setColors((prev) => [...prev, emptyColor()]);
  const removeColorRow = (i: number) =>
    setColors((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const priceNum = price ? Number(price) : null;

      if (isEdit && flavor) {
        const c = colors[0];
        const { error } = await supabase
          .from("flavors")
          .update({
            name,
            size: size.trim() || null,
            price: priceNum,
            color: c.color.trim() || null,
            color_hex: c.color.trim() ? c.color_hex || null : null,
            stock: Number(c.stock) || 0,
            sku: c.sku.trim() || null,
            image_url: c.image_urls[0] || null,
            image_urls: c.image_urls,
          })
          .eq("id", flavor.id);
        if (error) throw error;
        toast({ title: "Variante atualizada" });
      } else {
        const rows = colors.map((c) => ({
          product_id: productId,
          name,
          size: size.trim() || null,
          price: priceNum,
          color: c.color.trim() || null,
          color_hex: c.color.trim() ? c.color_hex || null : null,
          stock: Number(c.stock) || 0,
          sku: c.sku.trim() || null,
          image_url: c.image_urls[0] || null,
          image_urls: c.image_urls,
        }));
        const { error } = await supabase.from("flavors").insert(rows);
        if (error) throw error;
        toast({
          title: rows.length > 1 ? `${rows.length} variantes criadas` : "Variante criada",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["flavors", productId] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Variante" : "Adicionar Variante"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Nome / Tamanho da Variante</Label>
            <Input
              placeholder="Ex: Tamanho M"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tamanho (opcional)</Label>
              <Input
                placeholder="Ex: P, M, G, 38..."
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </div>
            <div>
              <Label>Preço (opcional)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Preço base do produto"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Cores e estoque</Label>
              {!isEdit && (
                <Button type="button" variant="outline" size="sm" onClick={addColorRow}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar cor
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? "Edite a cor e o estoque desta variante."
                : "Cada cor cria uma variante separada com o mesmo tamanho, mas estoque próprio."}
            </p>

            {colors.map((c, i) => (
              <div key={i} className="border rounded-md p-3 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Cor {i + 1}</span>
                  {!isEdit && colors.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeColorRow(i)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                  <div>
                    <Label className="text-xs">Cor</Label>
                    <Input
                      placeholder="Ex: Azul Marinho"
                      value={c.color}
                      onChange={(e) => updateColor(i, { color: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hex</Label>
                    <Input
                      type="color"
                      className="h-10 w-14 p-1 cursor-pointer"
                      value={c.color_hex || "#000000"}
                      onChange={(e) => updateColor(i, { color_hex: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Estoque</Label>
                    <Input
                      type="number"
                      min="0"
                      value={c.stock}
                      onChange={(e) => updateColor(i, { stock: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">SKU (opcional)</Label>
                    <Input
                      placeholder="Ex: FXV-M-AZ"
                      value={c.sku}
                      onChange={(e) => updateColor(i, { sku: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Foto desta cor (opcional)</Label>
                  <VariantImageField
                    value={c.image_url}
                    onChange={(v) => updateColor(i, { image_url: v })}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {isEdit ? "Atualizar" : colors.length > 1 ? `Criar ${colors.length} variantes` : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
