import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePendingLegalReaccept, type LegalDocType } from '@/hooks/useLegalDocuments';
import { useAuthState } from '@/context/AuthStateContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LABELS: Record<LegalDocType, { name: string; href: string }> = {
  privacy_policy: { name: 'Política de Privacidade', href: '/privacy-policy' },
  terms_of_use: { name: 'Termos de Uso', href: '/terms-of-use' },
};

/**
 * Renders a blocking dialog whenever the logged-in user has not accepted the
 * latest version of one of the legal documents.
 */
export default function LegalReacceptDialog() {
  const { authState } = useAuthState();
  const enabled = authState === 'AUTHENTICATED';
  const { data: pending = [], refetch, isLoading } = usePendingLegalReaccept(enabled);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setAccepted({}); }, [pending.length]);

  if (!enabled || isLoading || pending.length === 0) return null;

  const allChecked = pending.every((p) => accepted[p.doc_type]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada');
      const rows = pending.map((p) => ({
        user_id: user.id,
        consent_type: p.doc_type,
        consent_version: p.current_version,
        granted: true,
        metadata: { source: 'reaccept_dialog' },
        user_agent: navigator.userAgent,
      }));
      const { error } = await supabase.from('user_consents').insert(rows);
      if (error) throw error;
      toast.success('Aceite registrado. Obrigado!');
      await refetch();
    } catch (e: any) {
      toast.error(e.message ?? 'Não foi possível registrar o aceite.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning" />
            Atualização dos nossos documentos legais
          </DialogTitle>
          <DialogDescription>
            Atualizamos os documentos abaixo. Para continuar usando a Fox Velour, leia e aceite a nova versão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {pending.map((p) => {
            const meta = LABELS[p.doc_type];
            const id = `accept-${p.doc_type}`;
            return (
              <div key={p.doc_type} className="flex items-start gap-3 rounded border p-3">
                <Checkbox
                  id={id}
                  checked={!!accepted[p.doc_type]}
                  onCheckedChange={(c) => setAccepted((s) => ({ ...s, [p.doc_type]: !!c }))}
                />
                <Label htmlFor={id} className="text-sm leading-relaxed cursor-pointer">
                  Li e aceito a nova versão da{' '}
                  <Link to={meta.href} target="_blank" className="underline text-primary">
                    {meta.name}
                  </Link>{' '}
                  (v{p.current_version}).
                </Label>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/auth'; }}
            disabled={submitting}
          >
            Sair
          </Button>
          <Button onClick={submit} disabled={!allChecked || submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aceitar e continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
