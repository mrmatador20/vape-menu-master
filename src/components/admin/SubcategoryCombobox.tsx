import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCategories } from '@/hooks/useCategories';
import { useSubcategories } from '@/hooks/useSubcategories';

interface Props {
  categoryName: string;
  value: string;
  onChange: (name: string) => void;
}

export function SubcategoryCombobox({ categoryName, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: cats = [] } = useCategories();
  const cat = cats.find((c) => c.name === categoryName);
  const { data: subs = [], isLoading } = useSubcategories(cat?.id, categoryName);
  const qc = useQueryClient();

  const disabled = !cat;

  const handleCreate = async () => {
    const name = search.trim();
    if (!name || !cat) return;
    const { error } = await supabase
      .from('subcategories' as any)
      .insert({ name, category_id: cat.id } as any);
    if (error) {
      toast.error('Erro ao criar subcategoria: ' + error.message);
      return;
    }
    toast.success(`Subcategoria "${name}" criada`);
    qc.invalidateQueries({ queryKey: ['subcategories', cat.id] });
    onChange(name);
    setSearch('');
    setOpen(false);
  };

  const exists = subs.some((s) => s.name.toLowerCase() === search.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {value || (
            <span className="text-muted-foreground">
              {disabled ? 'Selecione uma categoria primeiro' : 'Subcategoria (opcional)'}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar ou criar subcategoria..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.trim() ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded"
                >
                  <Plus className="h-4 w-4" />
                  Criar "{search.trim()}"
                </button>
              ) : (
                'Nenhuma subcategoria.'
              )}
            </CommandEmpty>
            <CommandGroup>
              {isLoading && <div className="p-2 text-sm text-muted-foreground">Carregando...</div>}
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className="text-muted-foreground"
                >
                  Sem subcategoria
                </CommandItem>
              )}
              {subs.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.name}
                  onSelect={() => {
                    onChange(s.name);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === s.name ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex-1">{s.name}</span>
                  <Badge variant="secondary" className="ml-2">
                    {s.product_count}
                  </Badge>
                </CommandItem>
              ))}
              {search.trim() && !exists && (
                <CommandItem onSelect={handleCreate} className="text-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar "{search.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
