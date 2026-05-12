import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStockForecast } from "@/hooks/useAnalytics";

const labelForLevel = (level: 'critical' | 'warning' | 'ok') =>
  level === 'critical' ? { text: 'Crítico', cls: 'bg-red-100 text-red-800 border-red-200' } :
  level === 'warning' ? { text: 'Atenção', cls: 'bg-amber-100 text-amber-800 border-amber-200' } :
  { text: 'OK', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' };

const formatDays = (days: number, dailyAvg: number) => {
  if (!isFinite(days)) return 'sem vendas recentes';
  if (days < 1) return 'esgota hoje';
  return `esgota em ~${Math.round(days)} ${Math.round(days) === 1 ? 'dia' : 'dias'} (média ${dailyAvg.toFixed(1)}/dia)`;
};

export function LowStockAlert() {
  const { data: forecasts, isLoading } = useStockForecast(30);

  if (isLoading || !forecasts || forecasts.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-500/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-500">
          <AlertTriangle className="h-5 w-5" />
          Alertas Inteligentes de Reestoque
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <TrendingDown className="h-3.5 w-3.5" />
          Previsão baseada nas vendas dos últimos 30 dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {forecasts.map((p) => {
            const lvl = labelForLevel(p.level);
            return (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Estoque: {p.stock} · Mín: {p.min_stock} — {formatDays(p.daysLeft, p.dailyAvg)}
                  </p>
                </div>
                <Badge className={`whitespace-nowrap border ${lvl.cls}`} variant="outline">
                  {p.stock === 0 ? 'Sem estoque' : lvl.text}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
