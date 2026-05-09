import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Flavor } from "@/hooks/useFlavors";

const flavorSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  stock: z.coerce.number().min(0, "Estoque não pode ser negativo"),
  price: z.coerce.number().min(0, "Preço não pode ser negativo").optional(),
  color: z.string().optional(),
  color_hex: z.string().optional(),
});

type FlavorFormValues = z.infer<typeof flavorSchema>;

interface FlavorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  flavor?: Flavor | null;
}

export function FlavorFormDialog({
  open,
  onOpenChange,
  productId,
  flavor,
}: FlavorFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FlavorFormValues>({
    resolver: zodResolver(flavorSchema),
    defaultValues: {
      name: "",
      stock: 0,
      price: undefined,
      color: "",
      color_hex: "#000000",
    },
  });

  useEffect(() => {
    if (flavor) {
      form.reset({
        name: flavor.name,
        stock: flavor.stock,
        price: flavor.price || undefined,
        color: flavor.color || "",
        color_hex: flavor.color_hex || "#000000",
      });
    } else {
      form.reset({
        name: "",
        stock: 0,
        price: undefined,
        color: "",
        color_hex: "#000000",
      });
    }
  }, [flavor, form]);

  const onSubmit = async (values: FlavorFormValues) => {
    try {
      const payload = {
        name: values.name,
        stock: values.stock,
        price: values.price || null,
        color: values.color?.trim() || null,
        color_hex: values.color?.trim() ? (values.color_hex || null) : null,
      };

      if (flavor) {
        const { error } = await supabase
          .from("flavors")
          .update(payload)
          .eq("id", flavor.id);

        if (error) throw error;

        toast({
          title: "Variante atualizada",
          description: "A variante foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("flavors")
          .insert({ product_id: productId, ...payload });

        if (error) throw error;

        toast({
          title: "Variante criada",
          description: "A nova variante foi criada com sucesso.",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["flavors", productId] });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {flavor ? "Editar Variante" : "Adicionar Variante"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome / Tamanho da Variante</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Tamanho M"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Preto, Azul Marinho" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color_hex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hex</FormLabel>
                    <FormControl>
                      <Input
                        type="color"
                        className="h-10 w-14 p-1 cursor-pointer"
                        {...field}
                        value={field.value || "#000000"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Crie uma variante para cada combinação de tamanho + cor (ex.: "Tamanho M" / "Preto", "Tamanho M" / "Azul").
            </p>

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Deixe vazio para usar o preço base do produto"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estoque</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {flavor ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
