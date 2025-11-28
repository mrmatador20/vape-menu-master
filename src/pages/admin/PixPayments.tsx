import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PixPayments() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['pix-payments', statusFilter, searchTerm, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .eq('payment_method', 'pix')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (startDate) {
        query = query.gte('created_at', new Date(startDate).toISOString());
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDateTime.toISOString());
      }

      const { data: ordersData, error } = await query;

      if (error) throw error;

      // Get user profiles for each order
      const ordersWithProfiles = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', order.user_id)
            .single();

          return {
            ...order,
            profile,
          };
        })
      );

      if (searchTerm) {
        return ordersWithProfiles.filter(order => 
          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return ordersWithProfiles;
    },
  });

  const getStatusBadge = (status: string, expiresAt?: string | null) => {
    if (status === 'pending_payment') {
      if (expiresAt && new Date(expiresAt) < new Date()) {
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Expirado
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="w-3 h-3 animate-pulse" />
          Aguardando
        </Badge>
      );
    }
    if (status === 'confirmed') {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-500">
          <CheckCircle2 className="w-3 h-3" />
          Confirmado
        </Badge>
      );
    }
    if (status === 'expired') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Expirado
        </Badge>
      );
    }
    if (status === 'cancelled') {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Cancelado
        </Badge>
      );
    }
    return <Badge>{status}</Badge>;
  };

  const getTimeRemaining = (expiresAt?: string | null) => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expirado';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  };

  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter(o => o.status === 'pending_payment' && (!o.expires_at || new Date(o.expires_at) > new Date())).length || 0,
    confirmed: orders?.filter(o => o.status === 'confirmed').length || 0,
    expired: orders?.filter(o => (o.status === 'expired' || (o.status === 'pending_payment' && o.expires_at && new Date(o.expires_at) < new Date()))).length || 0,
    totalValue: orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pagamentos PIX</h1>
          <p className="text-muted-foreground">Gerencie e monitore todos os pagamentos PIX</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Expirados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre os pagamentos por status, data ou cliente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending_payment">Aguardando</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <Input
                placeholder="ID ou nome do cliente"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Data Inicial</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Data Final</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">#{order.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.profile?.full_name || 'Cliente'} - {order.profile?.phone || 'N/A'}
                      </div>
                    </div>
                    {getStatusBadge(order.status, order.expires_at)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Valor: </span>
                      <span className="font-medium">R$ {Number(order.total_amount).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data: </span>
                      <span className="font-medium">
                        {format(new Date(order.created_at!), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {order.expires_at && order.status === 'pending_payment' && (
                      <div>
                        <span className="text-muted-foreground">Expira em: </span>
                        <span className={`font-medium ${
                          new Date(order.expires_at) < new Date() 
                            ? 'text-red-600' 
                            : new Date(order.expires_at).getTime() - new Date().getTime() < 300000 
                              ? 'text-yellow-600' 
                              : ''
                        }`}>
                          {getTimeRemaining(order.expires_at)}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">CEP: </span>
                      <span className="font-medium">{order.cep}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pagamento PIX encontrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
