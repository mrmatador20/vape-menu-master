import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type LegalDocType = 'privacy_policy' | 'terms_of_use';

export interface LegalDocument {
  id: string;
  doc_type: LegalDocType;
  version: string;
  content: string;
  change_summary: string | null;
  is_current: boolean;
  published_by: string;
  published_at: string;
  created_at: string;
}

/** Current published version (public). Returns null if none published yet. */
export const useCurrentLegalDocument = (docType: LegalDocType) =>
  useQuery({
    queryKey: ['legal-doc-current', docType],
    queryFn: async (): Promise<LegalDocument | null> => {
      const { data, error } = await supabase
        .from('legal_documents' as any)
        .select('*')
        .eq('doc_type', docType)
        .eq('is_current', true)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as LegalDocument) ?? null;
    },
  });

/** Full version history (admin view, but readable by anyone for transparency). */
export const useLegalDocumentHistory = (docType: LegalDocType) =>
  useQuery({
    queryKey: ['legal-doc-history', docType],
    queryFn: async (): Promise<LegalDocument[]> => {
      const { data, error } = await supabase
        .from('legal_documents' as any)
        .select('*')
        .eq('doc_type', docType)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as LegalDocument[]) ?? [];
    },
  });

export const usePublishLegalDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      doc_type: LegalDocType;
      version: string;
      content: string;
      change_summary?: string;
    }) => {
      const { data, error } = await supabase.rpc('publish_legal_document' as any, {
        p_doc_type: args.doc_type,
        p_version: args.version,
        p_content: args.content,
        p_change_summary: args.change_summary ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['legal-doc-current', vars.doc_type] });
      qc.invalidateQueries({ queryKey: ['legal-doc-history', vars.doc_type] });
    },
  });
};

export const useRollbackLegalDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { version_id: string; new_version: string; doc_type: LegalDocType }) => {
      const { data, error } = await supabase.rpc('rollback_legal_document' as any, {
        p_version_id: args.version_id,
        p_new_version: args.new_version,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['legal-doc-current', vars.doc_type] });
      qc.invalidateQueries({ queryKey: ['legal-doc-history', vars.doc_type] });
    },
  });
};

/** Returns the list of doc types the current user has NOT re-accepted yet. */
export const usePendingLegalReaccept = (enabled: boolean) =>
  useQuery({
    queryKey: ['legal-doc-pending-reaccept'],
    enabled,
    queryFn: async (): Promise<Array<{ doc_type: LegalDocType; current_version: string }>> => {
      const { data, error } = await supabase.rpc('user_needs_legal_reaccept' as any);
      if (error) throw error;
      return (data as any) ?? [];
    },
  });
