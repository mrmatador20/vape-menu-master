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

interface Props {
  value: string;
  onChange: (name: string) => void;
  departmentId?: string | null;
  disabled?: boolean;
}

export function CategoryCombobox({ value, onChange, departmentId, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: categories = [], isLoading } = useCategories(departmentId ?? undefined);
  const qc = useQueryClient();

  const handleCreate = async () => {
    const name = search.trim();
    if (!name) return;
    const payload: any = { name };
    if (departmentId) payload.department_id = departmentId;
    const { error } = await supabase.from('categories').insert(payload);
    if (error) {
      toast.error('Erro ao criar categoria: ' + error.message);
      return;
    }
    toast.success(`Categoria "${name}" criada`);
    qc.invalidateQueries({ queryKey: ['categories'] });
    onChange(name);
    setSearch('');
    setOpen(false);
  };

  const exists = categories.some((c) => c.name.toLowerCase() === search.trim().toLowerCase());

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
          {value || <span className="text-muted-foreground">{disabled ? 'Selecione um departamento primeiro' : 'Selecione uma categoria...'}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar ou criar categoria..."
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
                'Nenhuma categoria.'
              )}
            </CommandEmpty>
            <CommandGroup>
              {isLoading && <div className="p-2 text-sm text-muted-foreground">Carregando...</div>}
              {categories.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.name}
                  onSelect={() => {
                    onChange(c.name);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === c.name ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex-1">{c.name}</span>
                  <Badge variant="secondary" className="ml-2">
                    {c.product_count}
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
