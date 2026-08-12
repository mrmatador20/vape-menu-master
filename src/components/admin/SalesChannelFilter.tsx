import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SalesChannelFilter as Channel } from '@/hooks/useBalcaoSales';

interface Props {
  value: Channel;
  onChange: (v: Channel) => void;
}

export function SalesChannelFilter({ value, onChange }: Props) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as Channel)}>
      <TabsList>
        <TabsTrigger value="all">Todos os canais</TabsTrigger>
        <TabsTrigger value="online">Loja online</TabsTrigger>
        <TabsTrigger value="balcao">Balcão (PDV)</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
