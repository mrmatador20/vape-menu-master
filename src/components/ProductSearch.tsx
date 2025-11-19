import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
}

const ProductSearch = ({ value, onChange }: ProductSearchProps) => {
  return (
    <div className="relative max-w-md mx-auto mb-8">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        type="text"
        placeholder="Buscar produtos por nome ou descrição..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 bg-card border-border focus:border-primary"
      />
    </div>
  );
};

export default ProductSearch;
