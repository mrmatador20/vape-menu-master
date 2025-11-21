import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Product } from "@/context/CartContext";
import { useFlavors, Flavor } from "@/hooks/useFlavors";
import { FlavorFormDialog } from "./FlavorFormDialog";
import { Trash2, Edit, Plus } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  subcategory: z.string().optional(),
  price: z.string().min(1, "Preço é obrigatório"),
  stock: z.string().min(0, "Estoque é obrigatório"),
  min_stock: z.string().min(0, "Nível mínimo é obrigatório"),
  discount_type: z.enum(['percent', 'fixed']).optional(),
  discount_value: z.string().optional(),
  image: z.string().url("URL inválida").optional().or(z.literal("")),
  description: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFlavorDialogOpen, setIsFlavorDialogOpen] = useState(false);
  const [editingFlavor, setEditingFlavor] = useState<Flavor | null>(null);
  const [deleteFlavorId, setDeleteFlavorId] = useState<string | null>(null);
  const { data: flavors } = useFlavors(product?.id || "");

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "",
      subcategory: "",
      price: "",
      stock: "0",
      min_stock: "10",
      discount_type: "percent",
      discount_value: "0",
      image: "",
      description: "",
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        category: product.category,
        subcategory: (product as any).subcategory || "",
        price: product.price.toString(),
        stock: product.stock.toString(),
        min_stock: product.min_stock?.toString() || "10",
        discount_type: ((product as any).discount_type || 'percent') as 'percent' | 'fixed',
        discount_value: ((product as any).discount_value || 0).toString(),
        image: product.image || "",
        description: product.description || "",
      });
    } else {
      form.reset({
        name: "",
        category: "",
        subcategory: "",
        price: "",
        stock: "0",
        min_stock: "10",
        discount_type: "percent",
        discount_value: "0",
        image: "",
        description: "",
      });
    }
  }, [product, form]);

  const handleDeleteFlavor = async () => {
    if (!deleteFlavorId) return;

    try {
      const { error } = await supabase
        .from("flavors")
        .delete()
        .eq("id", deleteFlavorId);

      if (error) throw error;

      toast({
        title: "Variante excluída",
        description: "A variante foi removida com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ["flavors", product?.id] });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
    setDeleteFlavorId(null);
  };

  const onSubmit = async (values: ProductFormValues) => {
    const productData = {
      name: values.name,
      category: values.category,
      subcategory: values.subcategory || null,
      price: parseFloat(values.price),
      stock: parseInt(values.stock),
      min_stock: parseInt(values.min_stock),
      discount_type: values.discount_type || 'percent',
      discount_value: parseFloat(values.discount_value || "0"),
      image: values.image || null,
      description: values.description || null,
    };

    if (product) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', product.id);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Produto atualizado",
        description: "O produto foi atualizado com sucesso.",
      });
    } else {
      const { error } = await supabase
        .from('products')
        .insert([productData]);

      if (error) {
        toast({
          title: "Erro ao criar",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Produto criado",
        description: "O produto foi adicionado com sucesso.",
      });
    }

    queryClient.invalidateQueries({ queryKey: ['products'] });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Produto" : "Adicionar Produto"}</DialogTitle>
          <DialogDescription>
            {product ? "Edite as informações do produto" : "Adicione um novo produto ao catálogo"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do produto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: v250, v400, seda" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subcategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategoria (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: dichavador, seda, etc." {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Subcategorias aparecem dentro da categoria principal
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível Mínimo de Estoque</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="10" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Sistema alertará quando atingir este nível
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discount_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Desconto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percent">Percentual (%)</SelectItem>
                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="discount_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch('discount_type') === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step={form.watch('discount_type') === 'percent' ? '1' : '0.01'}
                      min="0" 
                      max={form.watch('discount_type') === 'percent' ? '100' : undefined}
                      placeholder={form.watch('discount_type') === 'percent' ? '0-100' : '0.00'}
                      {...field} 
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {form.watch('discount_type') === 'percent' 
                      ? 'Desconto percentual individual (0-100%)' 
                      : 'Valor fixo de desconto em reais'}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />


            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Imagem</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descrição do produto" rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {product && (
              <div className="space-y-4 mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Variantes do Produto</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure diferentes formatos com preços específicos (Ex: Livreto, Unidade)
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setEditingFlavor(null);
                      setIsFlavorDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Variante
                  </Button>
                </div>

                {flavors && flavors.length > 0 ? (
                  <div className="space-y-2">
                    {flavors.map((flavor) => (
                      <div
                        key={flavor.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{flavor.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {flavor.price ? `R$ ${Number(flavor.price).toFixed(2)}` : "Usa preço base"} • Estoque: {flavor.stock}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingFlavor(flavor);
                              setIsFlavorDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteFlavorId(flavor.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma variante cadastrada. Adicione variantes para permitir que os clientes escolham entre diferentes formatos.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {product ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {product && (
        <>
          <FlavorFormDialog
            open={isFlavorDialogOpen}
            onOpenChange={setIsFlavorDialogOpen}
            productId={product.id}
            flavor={editingFlavor}
          />

          <AlertDialog open={!!deleteFlavorId} onOpenChange={() => setDeleteFlavorId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir esta variante? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteFlavor} className="bg-destructive hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </Dialog>
  );
}
