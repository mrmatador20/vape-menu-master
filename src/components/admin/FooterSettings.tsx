import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, PanelBottom } from 'lucide-react';
import { useFooterSettings, FOOTER_SETTINGS_KEYS, FooterSettings as FooterSettingsType } from '@/hooks/useFooterSettings';
import { useUpdateSetting } from '@/hooks/useSettings';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const GROUPS: {
  title: string;
  fields: { key: keyof FooterSettingsType; label: string; description: string; multiline?: boolean; maxLength?: number }[];
}[] = [
  {
    title: 'Informações da Marca & Contato',
    fields: [
      { key: 'site_footer_brand_description', label: 'Descrição curta', description: 'Texto exibido abaixo do nome da loja no rodapé.', multiline: true, maxLength: 200 },
      { key: 'site_footer_contact_email', label: 'E-mail de atendimento', description: 'E-mail exibido no rodapé.', maxLength: 120 },
      { key: 'site_footer_contact_phone', label: 'Telefone / WhatsApp (opcional)', description: 'Deixe em branco para ocultar.', maxLength: 40 },
    ],
  },
  {
    title: 'Rodapé Legal (LGPD / Titular)',
    fields: [
      { key: 'site_footer_legal_controller', label: 'Nome do controlador', description: 'Responsável legal pelos dados (LGPD).', maxLength: 120 },
      { key: 'site_footer_legal_city_state', label: 'Cidade/UF', description: 'Ex: Cuité/PB', maxLength: 60 },
      { key: 'site_footer_copyright_year', label: 'Ano do copyright', description: 'Deixe em branco para usar o ano atual automaticamente.', maxLength: 9 },
      { key: 'site_footer_custom_copyright', label: 'Texto legal completo (opcional)', description: 'Se preenchido, substitui a linha legal montada automaticamente.', multiline: true, maxLength: 300 },
    ],
  },
];

export default function FooterSettings() {
  const { data: settings, isLoading } = useFooterSettings();
  const updateSetting = useUpdateSetting();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<FooterSettingsType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && !values) setValues(settings);
  }, [settings, values]);

  if (isLoading || !values) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const key of FOOTER_SETTINGS_KEYS) {
        await updateSetting.mutateAsync({ key, value: values[key] ?? '' });
      }
      await queryClient.invalidateQueries({ queryKey: ['footer-settings'] });
      toast.success('Rodapé atualizado!');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message ?? 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const year = values.site_footer_copyright_year || String(new Date().getFullYear());
  const previewLegal =
    values.site_footer_custom_copyright ||
    `© ${year} Fox Velour. Controlador: ${values.site_footer_legal_controller} · ${values.site_footer_legal_city_state} · Em conformidade com a LGPD (Lei 13.709/2018).`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <PanelBottom className="h-5 w-5 text-primary" />
          <CardTitle>Configurações do Rodapé</CardTitle>
        </div>
        <CardDescription>Edite os textos de contato e as informações legais exibidas no rodapé do site.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {GROUPS.map((group) => (
          <div key={group.title} className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{group.title}</h3>
            {group.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                {field.multiline ? (
                  <Textarea
                    id={field.key}
                    rows={2}
                    maxLength={field.maxLength}
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                  />
                ) : (
                  <Input
                    id={field.key}
                    maxLength={field.maxLength}
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                  />
                )}
                <p className="text-xs text-muted-foreground">{field.description}</p>
              </div>
            ))}
          </div>
        ))}

        <div className="rounded-md border bg-muted/40 p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Pré-visualização</p>
          <p className="text-sm">{values.site_footer_brand_description}</p>
          <p className="text-sm text-muted-foreground">{values.site_footer_contact_email}</p>
          {values.site_footer_contact_phone && (
            <p className="text-sm text-muted-foreground">{values.site_footer_contact_phone}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">{previewLegal}</p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Salvar alterações</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
