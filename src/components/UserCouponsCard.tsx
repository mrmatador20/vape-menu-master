import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, Copy, Check } from "lucide-react";
import { useUserCoupons } from "@/hooks/useUserCoupons";
import { useState } from "react";
import { toast } from "sonner";

export const UserCouponsCard = () => {
  const { data: coupons, isLoading } = useUserCoupons();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Cupom copiado!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sem validade';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Meus Cupons de Desconto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Meus Cupons de Desconto
        </CardTitle>
        <CardDescription>
          Cupons ganhos através do programa de indicações
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!coupons || coupons.length === 0 ? (
          <div className="text-center py-8">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Você ainda não possui cupons disponíveis
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ganhe pontos indicando amigos e resgate cupons de desconto!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="border rounded-lg p-4 bg-accent/50 hover:bg-accent/70 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-lg font-bold font-mono bg-background px-3 py-1 rounded">
                        {coupon.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(coupon.code)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedCode === coupon.code ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="secondary">
                        {coupon.type === 'percent' 
                          ? `${coupon.value}% OFF` 
                          : `R$ ${coupon.value.toFixed(2)} OFF`}
                      </Badge>
                      <Badge variant="outline">
                        Uso único
                      </Badge>
                      <span className="text-muted-foreground">
                        Válido até: {formatDate(coupon.valid_until)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
