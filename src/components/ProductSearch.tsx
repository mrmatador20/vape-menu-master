import { Search } from 'lucide-react';

interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
}

const ProductSearch = ({ value, onChange }: ProductSearchProps) => {
  return (
    <div className="relative max-w-xl mx-auto">
      <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <input
        type="text"
        placeholder="Buscar"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-0 pl-7 pr-2 py-3 text-sm tracking-wide placeholder:text-muted-foreground/70 focus:outline-none focus:ring-0"
      />
    </div>
  );
};

export default ProductSearch;
