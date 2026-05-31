import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, FileText, History, RotateCcw, Eye, ShieldAlert } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useCurrentLegalDocument,
  useLegalDocumentHistory,
  usePublishLegalDocument,
  useRollbackLegalDocument,
  type LegalDocType,
  type LegalDocument,
} from '@/hooks/useLegalDocuments';
import { useAAL2Guard, type AAL2Challenge } from '@/hooks/useAAL2Guard';
import { MFAVerificationGate } from '@/components/MFAVerificationGate';
import { sanitizeUserText } from '@/lib/domPurify';
import { logActivity } from '@/hooks/useActivityLogs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const DOC_LABELS: Record<LegalDocType, string> = {
  privacy_policy: 'Política de Privacidade',
  terms_of_use: 'Termos de Uso',
};

function DocEditor({ docType }: { docType: LegalDocType }) {
  const { data: current, isLoading } = useCurrentLegalDocument(docType);
  const { data: history = [] } = useLegalDocumentHistory(docType);
  const publish = usePublishLegalDocument();
  const rollback = useRollbackLegalDocument();
  const { verifyAAL2 } = useAAL2Guard();

  const [version, setVersion] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [preview, setPreview] = useState<LegalDocument | null>(null);
  const [challenge, setChallenge] = useState<AAL2Challenge | null>(null);
  const [pendingAction, setPendingAction] = useState<null | { kind: 'publish' } | { kind: 'rollback'; versionId: string; newVersion: string }>(null);

  // Pre-fill editor with current content when it loads
  if (!content && current?.content) {
    setContent(current.content);
  }

  const suggestedNextVersion = (() => {
    if (!current) return '1.0';
    const parts = current.version.split('.').map(Number);
    if (parts.length >= 2 && !isNaN(parts[1])) return `${parts[0]}.${parts[1] + 1}`;
    return `${current.version}.1`;
  })();

  const runPublish = async () => {
    const cleanContent = content; // markdown/plain — rendered as text only
    if (cleanContent.trim().length < 50) {
      toast.error('Conteúdo muito curto (mínimo 50 caracteres).');
      return;
    }
    const ver = version.trim() || suggestedNextVersion;
    if (current && ver === current.version) {
      toast.error('Use um número de versão diferente do atual.');
      return;
    }
    try {
      await publish.mutateAsync({
        doc_type: docType,
        version: ver,
        content: cleanContent,
        change_summary: sanitizeUserText(summary) || undefined,
      });
      await logActivity('admin_settings_changed', {
        resourceType: 'legal_document',
        severity: 'warning',
        metadata: { action: 'publish', doc_type: docType, version: ver },
      });
      toast.success(`${DOC_LABELS[docType]} v${ver} publicada.`);
      setVersion('');
      setSummary('');
    } catch (e: any) {
      toast.error(e.message ?? 'Falha ao publicar.');
    }
  };

  const runRollback = async (versionId: string, newVersion: string) => {
    try {
      await rollback.mutateAsync({ version_id: versionId, new_version: newVersion, doc_type: docType });
      toast.success(`Rollback concluído (v${newVersion}).`);
    } catch (e: any) {
      toast.error(e.message ?? 'Falha no rollback.');
    }
  };

  const guardThenRun = async (action: NonNullable<typeof pendingAction>) => {
    const result = await verifyAAL2(`publish_legal_${docType}`);
    if (result.allowed) {
      if (action.kind === 'publish') await runPublish();
      else await runRollback(action.versionId, action.newVersion);
    } else if (result.challenge) {
      setPendingAction(action);
      setChallenge(result.challenge);
    } else {
      toast.error(result.error ?? 'É necessário configurar 2FA para publicar documentos legais.');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> {DOC_LABELS[docType]}
              </CardTitle>
              <CardDescription>
                {current
                  ? <>Versão atual: <Badge variant="secondary">v{current.version}</Badge> · publicada em {new Date(current.published_at).toLocaleString('pt-BR')}</>
                  : <>Nenhuma versão publicada ainda. A primeira publicação se torna a versão vigente.</>}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`version-${docType}`}>Nova versão</Label>
              <Input
                id={`version-${docType}`}
                placeholder={suggestedNextVersion}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor={`summary-${docType}`}>Resumo da alteração (opcional)</Label>
              <Input
                id={`summary-${docType}`}
                placeholder="Ex.: ajuste na retenção de dados"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`content-${docType}`}>
              Conteúdo (texto/markdown — HTML não é interpretado, evita XSS)
            </Label>
            <Textarea
              id={`content-${docType}`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[420px] font-mono text-sm"
              placeholder="Conteúdo completo do documento..."
            />
            <p className="text-xs text-muted-foreground">
              {content.length} caracteres
            </p>
          </div>

          <div className="rounded-md border border-warning/30 bg-warning/5 p-3 flex gap-2 text-sm">
            <ShieldAlert className="h-4 w-4 mt-0.5 text-warning" />
            <div>
              A publicação exige verificação de 2FA, registra auditoria imutável e marca todos os
              usuários para reaceitar no próximo login.
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={() => current && setPreview(current)} disabled={!current}>
              <Eye className="h-4 w-4 mr-2" /> Visualizar atual
            </Button>
            <Button
              onClick={() => guardThenRun({ kind: 'publish' })}
              disabled={publish.isPending || content.trim().length < 50}
            >
              {publish.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publicar nova versão
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Histórico</CardTitle>
          <CardDescription>Versões anteriores são imutáveis e nunca podem ser excluídas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma versão publicada.</p>}
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-2 rounded border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={h.is_current ? 'default' : 'outline'}>v{h.version}</Badge>
                  {h.is_current && <Badge variant="secondary">vigente</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {new Date(h.published_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                {h.change_summary && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">{h.change_summary}</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button size="sm" variant="ghost" onClick={() => setPreview(h)}>
                  <Eye className="h-4 w-4" />
                </Button>
                {!h.is_current && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const next = prompt(`Nova versão para rollback (atual sugerida: ${suggestedNextVersion}):`, suggestedNextVersion);
                      if (!next) return;
                      guardThenRun({ kind: 'rollback', versionId: h.id, newVersion: next });
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" /> Rollback
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{DOC_LABELS[docType]} — v{preview?.version}</DialogTitle>
            <DialogDescription>
              Publicada em {preview && new Date(preview.published_at).toLocaleString('pt-BR')}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto flex-1 rounded border bg-muted/30 p-4">
            <pre className="text-sm whitespace-pre-wrap font-sans">{preview?.content}</pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {challenge && pendingAction && (
        <MFAVerificationGate
          open
          operation={`publish_legal_${docType}`}
          operationLabel={
            pendingAction.kind === 'publish'
              ? `publicar ${DOC_LABELS[docType]}`
              : `realizar rollback de ${DOC_LABELS[docType]}`
          }
          challengeData={challenge}
          onVerified={async () => {
            const action = pendingAction;
            setChallenge(null);
            setPendingAction(null);
            if (action.kind === 'publish') await runPublish();
            else await runRollback(action.versionId, action.newVersion);
          }}
          onCancel={() => { setChallenge(null); setPendingAction(null); }}
        />
      )}
    </div>
  );
}

export default function LegalDocuments() {
  const { data: role, isLoading } = useUserRole();
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documentos Legais</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie versões da Política de Privacidade e dos Termos de Uso. Cada publicação é
          auditada, imutável e força os usuários a reaceitarem.
        </p>
      </div>

      <Tabs defaultValue="privacy_policy">
        <TabsList>
          <TabsTrigger value="privacy_policy">Política de Privacidade</TabsTrigger>
          <TabsTrigger value="terms_of_use">Termos de Uso</TabsTrigger>
        </TabsList>
        <TabsContent value="privacy_policy" className="mt-4">
          <DocEditor docType="privacy_policy" />
        </TabsContent>
        <TabsContent value="terms_of_use" className="mt-4">
          <DocEditor docType="terms_of_use" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
