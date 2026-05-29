import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Tag, Percent } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const KEYS = ["store_discount_active", "store_discount_type", "store_discount_value"] as const;

export default function AdminStoreDiscount() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();

  const [active, setActive] = useState(false);
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState<string>("0");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-store-discount"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", KEYS as unknown as string[]);
      if (error) throw error;
      const map = new Map((data || []).map((r) => [r.key, r.value]));
      return {
        active: (map.get("store_discount_active") || "false") === "true",
        type: ((map.get("store_discount_type") as "percent" | "fixed") || "percent"),
        value: map.get("store_discount_value") || "0",
      };
    },
  });

  useEffect(() => {
    if (data) {
      setActive(data.active);
      setType(data.type);
      setValue(data.value);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = [
        { key: "store_discount_active", value: active ? "true" : "false" },
        { key: "store_discount_type", value: type },
        { key: "store_discount_value", value: String(Number(value) || 0) },
      ];
      for (const row of payload) {
        const { data: existing } = await supabase
          .from("settings")
          .select("id")
          .eq("key", row.key)
          .maybeSingle();
        if (existing) {
          const { error } = await supabase
            .from("settings")
            .update({ value: row.value })
            .eq("key", row.key);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("settings")
            .insert({ key: row.key, value: row.value });
          if (error) throw error;
        }
      }

    onSuccess: () => {
      toast.success("Desconto da loja salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-store-discount"] });
      queryClient.invalidateQueries({ queryKey: ["store-discount"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  if (roleLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "admin") return <Navigate to="/" replace />;

  const numericValue = Number(value) || 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Tag className="h-7 w-7 text-primary" />
          Desconto Loja
        </h1>
        <p className="text-muted-foreground">
          Aplica um desconto global em todas as peças do site. Produtos com desconto individual
          mantêm o desconto próprio.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
          <CardDescription>
            Quando ativo, todos os produtos sem desconto próprio recebem este desconto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Ativar desconto global</Label>
              <p className="text-sm text-muted-foreground">
                Liga/desliga o desconto da loja inteira.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de desconto</Label>
              <Select value={type} onValueChange={(v) => setType(v as "percent" | "fixed")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {type === "percent" ? "%" : "R$"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium mb-1">
              <Percent className="h-4 w-4" />
              Pré-visualização
            </div>
            {active && numericValue > 0 ? (
              <p className="text-muted-foreground">
                Um produto de <strong>R$ 100,00</strong> será exibido por{" "}
                <strong>
                  R${" "}
                  {(type === "percent"
                    ? 100 * (1 - numericValue / 100)
                    : Math.max(0, 100 - numericValue)
                  ).toFixed(2)}
                </strong>
                .
              </p>
            ) : (
              <p className="text-muted-foreground">Desconto global desativado.</p>
            )}
          </div>

          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full sm:w-auto">
            {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar alterações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
