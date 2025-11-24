import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MapPin, Plus, Star } from 'lucide-react';
import { useSavedAddresses } from '@/hooks/useSavedAddresses';
import { Tables } from '@/integrations/supabase/types';

type SavedAddress = Tables<'saved_addresses'>;

interface SavedAddressSelectorProps {
  onSelect: (address: SavedAddress | null) => void;
  selectedAddressId?: string | null;
}

export const SavedAddressSelector = ({ onSelect, selectedAddressId }: SavedAddressSelectorProps) => {
  const { addresses, isLoading } = useSavedAddresses();
  const [showManualEntry, setShowManualEntry] = useState(false);

  if (isLoading) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">Carregando endereços...</p>
      </Card>
    );
  }

  if (addresses.length === 0 || showManualEntry) {
    return (
      <div className="space-y-4">
        {addresses.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowManualEntry(false);
              onSelect(null);
            }}
            className="w-full"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Usar endereço salvo
          </Button>
        )}
        {addresses.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum endereço salvo. Preencha abaixo e ele será salvo automaticamente.
          </p>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Endereços Salvos
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setShowManualEntry(true);
            onSelect(null);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Endereço
        </Button>
      </div>

      <RadioGroup
        value={selectedAddressId || ''}
        onValueChange={(value) => {
          const address = addresses.find(addr => addr.id === value);
          onSelect(address || null);
        }}
      >
        {addresses.map((address) => (
          <div
            key={address.id}
            className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent transition-colors"
          >
            <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
            <Label
              htmlFor={address.id}
              className="flex-1 cursor-pointer space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{address.label}</span>
                {address.is_default && (
                  <Star className="h-3 w-3 fill-primary text-primary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {address.street}, {address.number}
                <br />
                {address.neighborhood} - {address.city}
                {address.state && `, ${address.state}`}
                <br />
                CEP: {address.cep}
              </p>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </Card>
  );
};
