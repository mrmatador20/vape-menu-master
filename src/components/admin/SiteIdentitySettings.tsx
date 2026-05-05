import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Globe } from 'lucide-react';
import { useSiteIdentity, SITE_IDENTITY_KEYS, SiteIdentity } from '@/hooks/useSiteIdentity';
import { useUpdateSetting } from '@/hooks/useSettings';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const FIELDS: {
  key: keyof SiteIdentity;
  label: string;
  description: string;
  multiline?: boolean;
  maxLength?: number;
}[] = [
  { key: 'site_name', label: 'Nome da loja', description: 'Aparece no header e como nome do app instalado.', maxLength: 60 },
  { key: 'site_browser_title', label: 'Título da aba do navegador', description: 'Texto exibido na aba e em compartilhamentos.', maxLength: 70 },
  { key: 'site_tagline', label: 'Slogan / frase curta', description: 'Frase curta de identidade da loja.', maxLength: 120 },
  { key: 'site_description', label: 'Descrição (SEO)', description: 'Aparece em meta tags para Google e redes sociais.', multiline: true, maxLength: 200 },
  { key: 'site_pwa_short_name', label: 'Nome curto do app (PWA)', description: 'Nome exibido na tela inicial do celular ao instalar.', maxLength: 20 },
  { key: 'site_footer_text', label: 'Texto do rodapé', description: 'Aparece no rodapé do site.', maxLength: 150 },
  { key: 'site_hero_title', label: 'Título de boas-vindas (home)', description: 'Texto grande exibido no topo da página inicial.', maxLength: 80 },
  { key: 'site_hero_subtitle', label: 'Subtítulo de boas-vindas (home)', description: 'Texto menor logo abaixo do título da página inicial.', multiline: true, maxLength: 280 },
];

export default function SiteIdentitySettings() {
  const { data: identity, isLoading } = useSiteIdentity();
  const updateSetting = useUpdateSetting();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<SiteIdentity | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (identity && !values) setValues(identity);
  }, [identity, values]);

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
      for (const key of SITE_IDENTITY_KEYS) {
        await updateSetting.mutateAsync({ key, value: values[key] ?? '' });
      }
      await queryClient.invalidateQueries({ queryKey: ['site-identity'] });
      toast.success('Identidade da loja atualizada!');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message ?? 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle>Identidade da Loja</CardTitle>
        </div>
        <CardDescription>
          Edite o nome da loja, slogan, descrição e textos exibidos no site, na aba do navegador e no app instalado (PWA).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            {field.multiline ? (
              <Textarea
                id={field.key}
                value={values[field.key] ?? ''}
                maxLength={field.maxLength}
                onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                rows={3}
              />
            ) : (
              <Input
                id={field.key}
                value={values[field.key] ?? ''}
                maxLength={field.maxLength}
                onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
              />
            )}
            <p className="text-xs text-muted-foreground">{field.description}</p>
          </div>
        ))}

        <div className="flex justify-end pt-2">
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
