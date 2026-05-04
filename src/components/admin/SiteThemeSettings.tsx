import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Palette, Check } from 'lucide-react';
import { useSiteTheme, THEME_KEYS, THEME_PRESETS, SiteTheme } from '@/hooks/useSiteTheme';
import { useUpdateSetting } from '@/hooks/useSettings';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// HSL helpers ("H S% L%" <-> hex)
const hslStringToHex = (hsl: string): string => {
  const m = hsl.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return '#000000';
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) r = g = b = l;
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToHslString = (hex: string): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const COLOR_FIELDS: { key: keyof SiteTheme; label: string }[] = [
  { key: 'theme_primary', label: 'Cor primária' },
  { key: 'theme_accent', label: 'Cor de destaque' },
  { key: 'theme_background', label: 'Cor de fundo' },
  { key: 'theme_foreground', label: 'Cor do texto' },
  { key: 'theme_card', label: 'Fundo dos cartões' },
  { key: 'theme_card_foreground', label: 'Texto dos cartões' },
  { key: 'theme_border', label: 'Bordas' },
];

export default function SiteThemeSettings() {
  const { data: theme, isLoading } = useSiteTheme();
  const updateSetting = useUpdateSetting();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<SiteTheme | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (theme && !values) setValues(theme);
  }, [theme, values]);

  if (isLoading || !values) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const applyPreset = (presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setValues({ theme_preset: preset.id, ...preset.values });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const key of THEME_KEYS) {
        await updateSetting.mutateAsync({ key, value: values[key] ?? '' });
      }
      await queryClient.invalidateQueries({ queryKey: ['site-theme'] });
      toast.success('Tema do site atualizado!');
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
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle>Aparência do Site</CardTitle>
        </div>
        <CardDescription>
          Escolha um tema pronto ou personalize as cores do site. As mudanças são aplicadas em tempo real para todos os visitantes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Presets */}
        <div className="space-y-3">
          <Label>Temas prontos</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {THEME_PRESETS.map((preset) => {
              const active = values.theme_preset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={cn(
                    'text-left rounded-lg border p-3 transition hover:border-primary/60',
                    active ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{preset.name}</span>
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{preset.description}</p>
                  <div className="flex gap-1.5">
                    {(['theme_background', 'theme_card', 'theme_primary', 'theme_accent', 'theme_foreground'] as const).map(
                      (k) => (
                        <span
                          key={k}
                          className="h-6 w-6 rounded-full border border-border/60"
                          style={{ background: `hsl(${preset.values[k]})` }}
                        />
                      )
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom color pickers */}
        <div className="space-y-3 pt-2 border-t">
          <Label>Personalizar cores</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COLOR_FIELDS.map((field) => {
              const value = values[field.key] ?? '';
              const hex = hslStringToHex(value);
              return (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={field.key} className="text-xs">{field.label}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={hex}
                      onChange={(e) =>
                        setValues({
                          ...values,
                          theme_preset: 'custom',
                          [field.key]: hexToHslString(e.target.value),
                        })
                      }
                      className="h-10 w-12 rounded border border-input cursor-pointer bg-transparent"
                    />
                    <Input
                      id={field.key}
                      value={value}
                      onChange={(e) =>
                        setValues({ ...values, theme_preset: 'custom', [field.key]: e.target.value })
                      }
                      placeholder="H S% L%"
                      className="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Formato HSL: <code>matiz saturação% luminosidade%</code> (ex: <code>195 100% 50%</code>).
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Salvar tema</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
