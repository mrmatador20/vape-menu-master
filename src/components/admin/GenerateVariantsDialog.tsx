import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  productId: string;
  productName: string;
}

interface SizeChip { value: string; }
interface ColorChip { name: string; hex: string; }

export function GenerateVariantsDialog({ open, onOpenChange, productId, productName }: Props) {
  const [sizes, setSizes] = useState<SizeChip[]>([]);
  const [colors, setColors] = useState<ColorChip[]>([]);
  const [sizeInput, setSizeInput] = useState('');
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#000000');
  const [defaultStock, setDefaultStock] = useState(0);
  const [defaultPrice, setDefaultPrice] = useState('');
  const [skuPrefix, setSkuPrefix] = useState('');
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const addSize = () => {
    const v = sizeInput.trim();
    if (!v || sizes.some((s) => s.value === v)) return;
    setSizes([...sizes, { value: v }]);
    setSizeInput('');
  };
  const addColor = () => {
    const v = colorName.trim();
    if (!v || colors.some((c) => c.name === v)) return;
    setColors([...colors, { name: v, hex: colorHex }]);
    setColorName('');
    setColorHex('#000000');
  };

  const totalCombinations =
    sizes.length === 0 && colors.length === 0
      ? 0
      : Math.max(sizes.length, 1) * Math.max(colors.length, 1);

  const slug = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 6);

  const handleGenerate = async () => {
    if (totalCombinations === 0) {
      toast.error('Adicione ao menos um tamanho ou uma cor');
      return;
    }
    setLoading(true);
    const rows: any[] = [];
    const sizesArr = sizes.length ? sizes : [null];
    const colorsArr = colors.length ? colors : [null];
    let i = 1;
    for (const s of sizesArr) {
      for (const c of colorsArr) {
        const namePart = s ? `Tamanho ${s.value}` : (c ? c.name : 'Padrão');
        rows.push({
          product_id: productId,
          name: namePart,
          size: s?.value || null,
          color: c?.name || null,
          color_hex: c?.hex || null,
          stock: defaultStock,
          price: defaultPrice ? parseFloat(defaultPrice) : null,
          sku: skuPrefix
            ? `${skuPrefix}-${slug(s?.value || '')}${slug(c?.name || '')}-${String(i).padStart(2, '0')}`
            : null,
        });
        i++;
      }
    }

    const { error } = await supabase.from('flavors').insert(rows);
    setLoading(false);
    if (error) {
      toast.error('Erro: ' + error.message);
      return;
    }
    toast.success(`${rows.length} variante(s) criada(s)`);
    qc.invalidateQueries({ queryKey: ['flavors', productId] });
    setSizes([]);
    setColors([]);
    setDefaultStock(0);
    setDefaultPrice('');
    setSkuPrefix('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Gerar variantes</DialogTitle>
          <DialogDescription>
            Crie automaticamente combinações de tamanho × cor para <strong>{productName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Sizes */}
          <div className="space-y-2">
            <Label>Tamanhos</Label>
            <div className="flex gap-2">
              <Input placeholder="Ex: P, M, G..." value={sizeInput} onChange={(e) => setSizeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())} />
              <Button type="button" variant="outline" onClick={addSize}><Plus className="h-4 w-4" /></Button>
            </div>
            {sizes.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {sizes.map((s) => (
                  <Badge key={s.value} variant="secondary" className="gap-1 pr-1">
                    {s.value}
                    <button type="button" onClick={() => setSizes(sizes.filter((x) => x.value !== s.value))}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <Label>Cores</Label>
            <div className="flex gap-2">
              <Input placeholder="Nome da cor..." value={colorName} onChange={(e) => setColorName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())} />
              <Input type="color" className="w-14 h-10 p-1 cursor-pointer" value={colorHex} onChange={(e) => setColorHex(e.target.value)} />
              <Button type="button" variant="outline" onClick={addColor}><Plus className="h-4 w-4" /></Button>
            </div>
            {colors.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {colors.map((c) => (
                  <Badge key={c.name} variant="secondary" className="gap-1.5 pr-1">
                    <span className="inline-block h-3 w-3 rounded-full border" style={{ background: c.hex }} />
                    {c.name}
                    <button type="button" onClick={() => setColors(colors.filter((x) => x.name !== c.name))}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Defaults */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Estoque padrão</Label>
              <Input type="number" min={0} value={defaultStock} onChange={(e) => setDefaultStock(parseInt(e.target.value || '0'))} />
            </div>
            <div className="space-y-1.5">
              <Label>Preço (opcional)</Label>
              <Input type="number" step="0.01" placeholder="Preço base" value={defaultPrice} onChange={(e) => setDefaultPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Prefixo SKU</Label>
              <Input placeholder="Ex: FXV" value={skuPrefix} onChange={(e) => setSkuPrefix(e.target.value.toUpperCase())} />
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 border border-dashed p-3 text-sm">
            Serão geradas <strong>{totalCombinations}</strong> variante(s).
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={loading || totalCombinations === 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar {totalCombinations > 0 && `(${totalCombinations})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
