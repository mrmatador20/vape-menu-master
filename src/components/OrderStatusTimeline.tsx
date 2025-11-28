import { CheckCircle2, Clock, XCircle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusHistoryItem {
  status: string;
  changed_at: string;
}

interface OrderStatusTimelineProps {
  statusHistory: StatusHistoryItem[];
  currentStatus: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: {
    label: 'Pedido Criado',
    icon: Clock,
    color: 'text-yellow-500',
  },
  pending_payment: {
    label: 'Aguardando Pagamento',
    icon: Clock,
    color: 'text-yellow-500',
  },
  confirmed: {
    label: 'Pagamento Confirmado',
    icon: CheckCircle2,
    color: 'text-green-500',
  },
  delivered: {
    label: 'Pedido Entregue',
    icon: Package,
    color: 'text-blue-500',
  },
  cancelled: {
    label: 'Pedido Cancelado',
    icon: XCircle,
    color: 'text-red-500',
  },
  expired: {
    label: 'Pagamento Expirado',
    icon: XCircle,
    color: 'text-red-500',
  },
};

export function OrderStatusTimeline({ statusHistory, currentStatus }: OrderStatusTimelineProps) {
  // Sort by date ascending to show timeline from oldest to newest
  const sortedHistory = [...statusHistory].sort(
    (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  );

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground">
        Histórico do Pedido
      </h3>
      <div className="space-y-4">
        {sortedHistory.map((item, index) => {
          const config = statusConfig[item.status] || {
            label: item.status,
            icon: Clock,
            color: 'text-gray-500',
          };
          const Icon = config.icon;
          const isLast = index === sortedHistory.length - 1;

          return (
            <div key={index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'rounded-full p-2 bg-background border-2',
                    isLast ? 'border-primary' : 'border-muted'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isLast ? config.color : 'text-muted-foreground')} />
                </div>
                {!isLast && (
                  <div className="w-0.5 h-8 bg-border" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <p className={cn('font-medium text-sm', isLast && 'text-foreground')}>
                  {config.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(item.changed_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}