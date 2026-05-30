import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePrivacyRights } from '@/hooks/usePrivacyRights';
import { supabase } from '@/integrations/supabase/client';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Download, Shield, Loader2 } from 'lucide-react';

const REQUEST_LABEL: Record<string, string> = {
  access: 'Acesso aos dados',
  correction: 'Correção de dados',
  deletion: 'Exclusão da conta',
  export: 'Exportação',
  portability: 'Portabilidade',
  revoke_consent: 'Revogação de consentimento',
  complaint: 'Reclamação',
};

const STATUS_COLOR: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  in_progress: 'default',
  completed: 'outline',
  rejected: 'destructive',
};

const DataRights = () => {
  usePageMeta({
    title: 'Direitos do Titular - Fox Velour',
    description: 'Exerça seus direitos garantidos pela LGPD: acesso, correção, exclusão e portabilidade.',
    path: '/data-rights',
  });

  const { exportData, isExporting, createRequest } = usePrivacyRights();
  const [requests, setRequests] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [type, setType] = useState<string>('access');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [r, c] = await Promise.all([
      supabase.from('data_subject_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('user_consents').select('*').eq('user_id', user.id).order('granted_at', { ascending: false }),
    ]);
    setRequests(r.data ?? []);
    setConsents(c.data ?? []);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSubmitting(true);
    await createRequest(type as any, notes || undefined);
    setNotes('');
    await load();
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" />Direitos do Titular dos Dados</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Garantidos pelo Art. 18 da Lei Geral de Proteção de Dados (Lei 13.709/2018).
            Respondemos em até 15 dias. Canal: <a href="mailto:foxvelour@gmail.com" className="underline">foxvelour@gmail.com</a>.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ações imediatas</CardTitle>
            <CardDescription>Exporte ou abra solicitações sem esperar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={exportData} disabled={isExporting} variant="outline">
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Exportar meus dados (JSON)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Abrir nova solicitação</CardTitle>
            <CardDescription>Descreva claramente o que deseja. Não inclua senhas ou dados de cartão.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(REQUEST_LABEL).filter(([k]) => k !== 'deletion').map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Detalhes (opcional, máx. 1000 caracteres)"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
              rows={4}
            />
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enviar solicitação
            </Button>
            <p className="text-xs text-muted-foreground">
              Para excluir sua conta, use o botão dedicado em <a href="/profile" className="underline">Meu Perfil</a>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Minhas solicitações</CardTitle></CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma solicitação ainda.</p>
            ) : (
              <ul className="space-y-2">
                {requests.map((r) => (
                  <li key={r.id} className="flex items-start justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{REQUEST_LABEL[r.request_type] ?? r.request_type}</p>
                      <p className="text-xs text-muted-foreground">
                        Criada em {new Date(r.created_at).toLocaleDateString('pt-BR')} ·
                        Prazo: {new Date(r.legal_deadline).toLocaleDateString('pt-BR')}
                      </p>
                      {r.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{r.notes}"</p>}
                    </div>
                    <Badge variant={STATUS_COLOR[r.status] ?? 'secondary'}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meus consentimentos</CardTitle>
            <CardDescription>Registro auditável e imutável conforme LGPD.</CardDescription>
          </CardHeader>
          <CardContent>
            {consents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum consentimento registrado.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {consents.map((c) => (
                  <li key={c.id} className="flex justify-between border-b pb-2 last:border-0">
                    <span>{c.consent_type} <span className="text-xs text-muted-foreground">v{c.consent_version}</span></span>
                    <span className="text-xs text-muted-foreground">{new Date(c.granted_at).toLocaleString('pt-BR')}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default DataRights;
