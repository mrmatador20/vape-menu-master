import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function LowStockAlert() {
  const { data: lowStockProducts } = useQuery({
    queryKey: ['low-stock-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, stock, min_stock')
        .order('stock', { ascending: true });

      return data?.filter(p => p.stock <= (p.min_stock || 10)) || [];
    },
  });

  if (!lowStockProducts || lowStockProducts.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-500/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-500">
          <AlertTriangle className="h-5 w-5" />
          Alertas de Estoque Baixo
        </CardTitle>
        <CardDescription>
          Produtos que atingiram o nível mínimo de estoque
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {lowStockProducts.map((product) => (
            <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  Estoque atual: {product.stock} | Mínimo: {product.min_stock}
                </p>
              </div>
              <Badge variant="destructive" className="whitespace-nowrap">
                {product.stock === 0 ? 'Sem estoque' : 'Crítico'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
