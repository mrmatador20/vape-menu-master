import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Copy, Loader2, TrendingUp, Receipt, Tag, Sparkles } from 'lucide-react';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAffiliateData } from '@/hooks/useAffiliateData';
import { usePageMeta } from '@/hooks/usePageMeta';
import { toast } from 'sonner';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Affiliate() {
  usePageMeta({
    title: 'Área do Afiliado - Fox Velour',
    description: 'Acompanhe o desempenho do seu cupom de parceiro.',
    path: '/affiliate',
  });

  const { data, isLoading } = useAffiliateData();
  const baseUrl = useMemo(() => window.location.origin, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`${baseUrl}/?cupom=${code}`);
    toast.success('Link de indicação copiado!');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            Área do Afiliado
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe as vendas geradas pelo seu cupom de parceiro
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !data?.coupons.length ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <p className="text-lg font-medium">Você ainda não é um afiliado</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Quando a equipe vincular um cupom de parceiro à sua conta, ele aparecerá aqui com
                todas as métricas de vendas em tempo real.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Coupons */}
            <div className="grid gap-4 md:grid-cols-2">
              {data.coupons.map((c) => (
                <Card key={c.id} className="border-primary/40">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardDescription>Seu cupom</CardDescription>
                        <CardTitle className="text-2xl font-mono">{c.code}</CardTitle>
                      </div>
                      <Badge variant={c.is_active ? 'default' : 'secondary'}>
                        {c.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Desconto:{' '}
                      <span className="font-medium text-foreground">
                        {c.type === 'percent' ? `${c.value}%` : formatBRL(Number(c.value))}
                      </span>
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyCode(c.code)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar código
                    </Button>
                    <Button size="sm" onClick={() => copyLink(c.code)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar link
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" /> Total de usos
                  </CardDescription>
                  <CardTitle className="text-2xl">{data.totals.totalUses}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Comissão
                  </CardDescription>
                  <CardTitle className="text-lg text-muted-foreground">Em breve</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Sales history */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de vendas</CardTitle>
                <CardDescription>
                  Apenas pedidos confirmados ou entregues aparecem aqui
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!data.conversions.length ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma venda registrada ainda.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Cupom</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Desconto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.conversions.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-sm">
                            {format(new Date(row.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{row.coupon_code}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            #{row.order_id.substring(0, 8)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatBRL(Number(row.order_total))}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatBRL(Number(row.discount_amount))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
