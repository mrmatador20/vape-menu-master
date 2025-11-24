import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface CepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

interface UseCepLookupReturn {
  isLoading: boolean;
  lookupCep: (cep: string) => Promise<CepData | null>;
}

export const useCepLookup = (): UseCepLookupReturn => {
  const [isLoading, setIsLoading] = useState(false);

  const lookupCep = useCallback(async (cep: string): Promise<CepData | null> => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      return null;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      
      if (!response.ok) {
        throw new Error('Erro ao consultar CEP');
      }

      const data: CepData = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return null;
      }

      toast.success('CEP encontrado! Endereço preenchido automaticamente.');
      return data;
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao consultar CEP. Verifique sua conexão.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    lookupCep,
  };
};
