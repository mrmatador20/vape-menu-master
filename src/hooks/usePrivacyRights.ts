import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePrivacyRights = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const exportData = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.rpc('export_user_data');
      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fox-velour-meus-dados-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Seus dados foram exportados com sucesso (LGPD Art. 18, V).');
    } catch (e: any) {
      toast.error(e.message || 'Falha ao exportar dados');
    } finally {
      setIsExporting(false);
    }
  };

  const requestDeletion = async (reason?: string) => {
    setIsRequesting(true);
    try {
      const { data, error } = await supabase.rpc('request_account_deletion', { p_reason: reason ?? null });
      if (error) throw error;
      toast.success('Solicitação registrada. Processaremos em até 15 dias úteis.');
      return data as string;
    } catch (e: any) {
      toast.error(e.message || 'Falha ao solicitar exclusão');
      return null;
    } finally {
      setIsRequesting(false);
    }
  };

  const createRequest = async (request_type: 'access' | 'correction' | 'export' | 'portability' | 'revoke_consent' | 'complaint', notes?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Você precisa estar autenticado');
      return null;
    }
    const { data, error } = await supabase.from('data_subject_requests').insert({
      user_id: user.id,
      request_type,
      notes: notes ?? null,
    }).select().single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    toast.success('Solicitação enviada. Retornaremos em até 15 dias.');
    return data;
  };

  return { exportData, isExporting, requestDeletion, isRequesting, createRequest };
};
