import { useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  value: string | null;
  onChange: (userId: string | null, name: string | null) => void;
}

export function InfluencerCombobox({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles-influencer-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .order("full_name", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
  });

  const selected = profiles.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="truncate">
              {selected.full_name || "Sem nome"}
              {selected.phone ? ` · ${selected.phone}` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">Selecione um parceiro...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nome ou telefone..." />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Carregando parceiros...
              </div>
            ) : (
              <>
                <CommandEmpty>Nenhum parceiro encontrado.</CommandEmpty>
                <CommandGroup>
                  {value && (
                    <CommandItem
                      value="__clear__"
                      onSelect={() => {
                        onChange(null, null);
                        setOpen(false);
                      }}
                      className="text-muted-foreground"
                    >
                      Limpar seleção
                    </CommandItem>
                  )}
                  {profiles.map((p) => {
                    const label = `${p.full_name || "Sem nome"} ${p.phone || ""}`;
                    return (
                      <CommandItem
                        key={p.id}
                        value={label}
                        onSelect={() => {
                          onChange(p.id, p.full_name || null);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === p.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm">{p.full_name || "Sem nome"}</span>
                          {p.phone && (
                            <span className="text-xs text-muted-foreground">{p.phone}</span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
