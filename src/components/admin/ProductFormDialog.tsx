import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Product } from "@/context/CartContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductImagesField } from "./ProductImagesField";
import { CategoryCombobox } from "./CategoryCombobox";
import { SubcategoryCombobox } from "./SubcategoryCombobox";
import { VariantsTable } from "./VariantsTable";
import { Info, FolderTree, Image as ImageIcon, Package, Layers, BadgePercent, Lock } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  subcategory: z.string().optional(),
  price: z.string().min(1, "Preço é obrigatório"),
  stock: z.string().min(0, "Estoque é obrigatório"),
  min_stock: z.string().min(0, "Nível mínimo é obrigatório"),
  display_order: z.string().min(0, "Posição é obrigatória"),
  discount_type: z.enum(['percent', 'fixed']).optional(),
  discount_value: z.string().optional(),
  visible_in_all: z.boolean().optional(),
  image: z.string().url("URL inválida").optional().or(z.literal("")),
  images: z.array(z.string().url()).max(12, "Máximo de 12 imagens").optional(),
  description: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

const defaults: ProductFormValues = {
  name: "",
  category: "",
  subcategory: "",
  price: "",
  stock: "0",
  min_stock: "10",
  display_order: "0",
  discount_type: "percent",
  discount_value: "0",
  visible_in_all: true,
  image: "",
  images: [],
  description: "",
};

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaults,
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
        display_order: ((product as any).display_order || 0).toString(),
        discount_type: ((product as any).discount_type || 'percent') as 'percent' | 'fixed',
        discount_value: ((product as any).discount_value || 0).toString(),
        visible_in_all: (product as any).visible_in_all !== false,
        image: product.image || "",
        images: (product as any).images && (product as any).images.length
          ? (product as any).images
          : (product.image ? [product.image] : []),
        description: product.description || "",
      });
    } else {
      form.reset(defaults);
    }
  }, [product, form]);

  const onSubmit = async (values: ProductFormValues) => {
    const productData = {
      name: values.name,
      category: values.category,
      subcategory: values.subcategory || null,
      price: parseFloat(values.price),
      stock: parseInt(values.stock),
      min_stock: parseInt(values.min_stock),
      display_order: parseInt(values.display_order),
      discount_type: values.discount_type || 'percent',
      discount_value: parseFloat(values.discount_value || "0"),
      visible_in_all: values.visible_in_all ?? true,
      image: (values.images && values.images[0]) || values.image || null,
      images: values.images ?? [],
      description: values.description || null,
    };

    if (product) {
      const { error } = await supabase.from('products').update(productData).eq('id', product.id);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Produto atualizado", description: "Alterações salvas com sucesso." });
    } else {
      const { error } = await supabase.from('products').insert([productData]);
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Produto criado", description: "Adicionado ao catálogo." });
    }

    queryClient.invalidateQueries({ queryKey: ['products'] });
    onOpenChange(false);
    form.reset(defaults);
  };

  const variantsDisabled = !product;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col gap-0">
        <SheetHeader className="p-6 pb-4 border-b text-left">
          <SheetTitle className="text-2xl">{product ? "Editar produto" : "Novo produto"}</SheetTitle>
          <SheetDescription>
            {product ? "Atualize as informações, imagens e variantes do produto." : "Preencha as informações para adicionar um novo produto ao catálogo."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 pt-4 border-b">
                <TabsList className="bg-transparent p-0 h-auto gap-1 flex-wrap justify-start">
                  <TabsTrigger value="info" className="data-[state=active]:bg-accent gap-2"><Info className="h-4 w-4" />Básico</TabsTrigger>
                  <TabsTrigger value="cat" className="data-[state=active]:bg-accent gap-2"><FolderTree className="h-4 w-4" />Categorização</TabsTrigger>
                  <TabsTrigger value="img" className="data-[state=active]:bg-accent gap-2"><ImageIcon className="h-4 w-4" />Imagens</TabsTrigger>
                  <TabsTrigger value="stock" className="data-[state=active]:bg-accent gap-2"><Package className="h-4 w-4" />Estoque</TabsTrigger>
                  <TabsTrigger value="variants" className="data-[state=active]:bg-accent gap-2" disabled={variantsDisabled}>
                    {variantsDisabled ? <Lock className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                    Variantes
                  </TabsTrigger>
                  <TabsTrigger value="discount" className="data-[state=active]:bg-accent gap-2"><BadgePercent className="h-4 w-4" />Desconto</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <TabsContent value="info" className="space-y-4 mt-0">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do produto</FormLabel>
                      <FormControl><Input placeholder="Ex: Legging Premium Fox Velour" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl><Textarea rows={5} placeholder="Descreva os detalhes, materiais e diferenciais do produto..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço base (R$)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="display_order" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Posição na vitrine</FormLabel>
                        <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                        <p className="text-xs text-muted-foreground">Menor número aparece primeiro.</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </TabsContent>

                <TabsContent value="cat" className="space-y-4 mt-0">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <CategoryCombobox value={field.value} onChange={(name) => {
                          field.onChange(name);
                          form.setValue('subcategory', '');
                        }} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Pesquise ou crie uma categoria sem sair desta tela.</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="subcategory" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcategoria</FormLabel>
                      <FormControl>
                        <SubcategoryCombobox categoryName={form.watch('category')} value={field.value || ''} onChange={field.onChange} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Filtra automaticamente pelas subcategorias da categoria selecionada.</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                </TabsContent>

                <TabsContent value="img" className="space-y-4 mt-0">
                  <FormField control={form.control} name="images" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fotos do produto (até 12)</FormLabel>
                      <ProductImagesField value={field.value ?? []} onChange={(next) => {
                        field.onChange(next);
                        form.setValue('image', next[0] ?? '');
                      }} />
                      <FormMessage />
                    </FormItem>
                  )} />
                </TabsContent>

                <TabsContent value="stock" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="stock" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estoque base</FormLabel>
                        <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                        <p className="text-xs text-muted-foreground">Usado quando o produto não tem variantes.</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="min_stock" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alerta de estoque mínimo</FormLabel>
                        <FormControl><Input type="number" placeholder="10" {...field} /></FormControl>
                        <p className="text-xs text-muted-foreground">Sistema avisa ao atingir este nível.</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="visible_in_all" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Visível em "Todos"</FormLabel>
                        <p className="text-xs text-muted-foreground">Quando desativado, o produto só aparece dentro da sua categoria.</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />
                </TabsContent>

                <TabsContent value="variants" className="mt-0">
                  {product ? (
                    <VariantsTable productId={product.id} productName={product.name} />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Lock className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Salve o produto primeiro para gerenciar variantes.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="discount" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="discount_type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de desconto</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percent">Percentual (%)</SelectItem>
                            <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="discount_value" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{form.watch('discount_type') === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}</FormLabel>
                        <FormControl>
                          <Input type="number"
                            step={form.watch('discount_type') === 'percent' ? '1' : '0.01'}
                            min="0"
                            max={form.watch('discount_type') === 'percent' ? '100' : undefined}
                            placeholder={form.watch('discount_type') === 'percent' ? '0-100' : '0,00'}
                            {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <SheetFooter className="p-6 border-t bg-muted/20 flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">{product ? 'Salvar alterações' : 'Criar produto'}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
