import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Send, Eye, EyeOff, MessageCircle, RotateCcw, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DEFAULT_TELEGRAM_TEMPLATE, TELEGRAM_TEMPLATE_TAGS } from '@/lib/telegramTemplate';

const TOKEN_KEY = 'telegram_bot_token';
const CHAT_KEY = 'telegram_chat_id';
const TEMPLATE_KEY = 'telegram_message_template';

export default function TelegramNotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [template, setTemplate] = useState(DEFAULT_TELEGRAM_TEMPLATE);
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from('system_secrets')
        .select('key, value')
        .in('key', [TOKEN_KEY, CHAT_KEY, TEMPLATE_KEY]);

      if (error) {
        toast.error('Erro ao carregar configurações do Telegram');
      } else {
        const map = Object.fromEntries((data ?? []).map((s: any) => [s.key, s.value]));
        setBotToken(map[TOKEN_KEY] ?? '');
        setChatId(map[CHAT_KEY] ?? '');
        setTemplate(map[TEMPLATE_KEY]?.trim() ? map[TEMPLATE_KEY] : DEFAULT_TELEGRAM_TEMPLATE);
      }
      setLoading(false);
    })();
  }, []);

  const persist = async () => {
    const { error } = await (supabase as any)
      .from('system_secrets')
      .upsert(
        [
          { key: TOKEN_KEY, value: botToken.trim(), description: 'Token do bot do Telegram' },
          { key: CHAT_KEY, value: chatId.trim(), description: 'ID do chat do Telegram' },
        ],
        { onConflict: 'key' },
      );
    if (error) throw error;
  };

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
      const { error } = await (supabase as any)
        .from('system_secrets')
        .upsert(
          [{ key: TEMPLATE_KEY, value: template, description: 'Modelo da mensagem do Telegram' }],
          { onConflict: 'key' },
        );
      if (error) throw error;
      toast.success('Modelo da mensagem salvo!');
    } catch (e: any) {
      toast.error('Erro ao salvar o modelo: ' + (e?.message ?? 'desconhecido'));
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleRestoreDefault = () => {
    setTemplate(DEFAULT_TELEGRAM_TEMPLATE);
    toast.info('Modelo padrão restaurado. Clique em "Salvar Template" para aplicar.');
  };

  const handleSave = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      toast.error('Informe o token do bot e o ID do chat.');
      return;
    }
    setSaving(true);
    try {
      await persist();
      toast.success('Configurações do Telegram salvas com segurança!');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message ?? 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      toast.error('Informe o token do bot e o ID do chat antes de testar.');
      return;
    }
    setTesting(true);
    try {
      // Garante que as credenciais atuais estejam salvas antes do teste
      await persist();

      const { data, error } = await supabase.functions.invoke('notify-order-telegram', {
        body: { test: true, template },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Notificação de teste enviada no Telegram!');
    } catch (e: any) {
      toast.error('Falha no teste: ' + (e?.message ?? 'verifique o token e o ID do chat'));
    } finally {
      setTesting(false);
    }
  };


  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <CardTitle>Notificações de Vendas (Telegram)</CardTitle>
        </div>
        <CardDescription>
          Receba um aviso no Telegram a cada nova venda confirmada. As credenciais ficam armazenadas
          em uma tabela protegida, acessível apenas por administradores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="telegram-token">Token do Bot do Telegram</Label>
          <div className="relative">
            <Input
              id="telegram-token"
              type={showToken ? 'text' : 'password'}
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456789:AAF..."
              autoComplete="off"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showToken ? 'Ocultar token' : 'Revelar token'}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Gere o token com o @BotFather no Telegram.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="telegram-chat">ID do Chat do Telegram</Label>
          <Input
            id="telegram-chat"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="-1001234567890"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Pode ser o seu ID pessoal ou o ID do grupo que receberá os avisos.
          </p>
        </div>

        <div className="space-y-2 border-t pt-5">
          <Label htmlFor="telegram-template">Modelo da Mensagem do Telegram</Label>
          <Textarea
            id="telegram-template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={16}
            spellCheck={false}
            className="font-mono text-xs"
            placeholder="Digite o modelo da mensagem usando as tags disponíveis..."
          />
          <p className="text-xs text-muted-foreground">
            Formatação HTML suportada pelo Telegram: &lt;b&gt;negrito&lt;/b&gt;, &lt;i&gt;itálico&lt;/i&gt;,
            &lt;code&gt;código&lt;/code&gt;.
          </p>

          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-xs font-semibold mb-2">Tags dinâmicas disponíveis</p>
            <ul className="grid gap-1 sm:grid-cols-2">
              {TELEGRAM_TEMPLATE_TAGS.map(({ tag, label }) => (
                <li key={tag} className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(tag);
                      toast.success(`Tag ${tag} copiada!`);
                    }}
                    className="inline-flex items-center gap-1 rounded bg-background border px-1.5 py-0.5 font-mono text-[11px] hover:bg-accent"
                    title="Copiar tag"
                  >
                    <Copy className="h-3 w-3" />
                    {tag}
                  </button>
                  <span className="text-muted-foreground">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={handleRestoreDefault} disabled={savingTemplate}>
              <RotateCcw className="h-4 w-4 mr-2" />Restaurar Padrão
            </Button>
            <Button variant="secondary" onClick={handleSaveTemplate} disabled={savingTemplate}>
              {savingTemplate ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />Salvar Template</>
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={handleTest} disabled={testing || saving}>
            {testing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando teste...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" />Testar Notificação</>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Salvar Configurações do Telegram</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
