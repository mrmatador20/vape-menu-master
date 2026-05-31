import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { Loader2 } from 'lucide-react';
import { useCurrentLegalDocument, type LegalDocType } from '@/hooks/useLegalDocuments';

interface LegalDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docType: LegalDocType;
}

const TITLES: Record<LegalDocType, string> = {
  terms_of_use: 'Termos de Uso',
  privacy_policy: 'Política de Privacidade',
};

export const LegalDocumentDialog = ({ open, onOpenChange, docType }: LegalDocumentDialogProps) => {
  const { data: doc, isLoading } = useCurrentLegalDocument(docType);
  const title = TITLES[docType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[85vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {doc && (
            <DialogDescription>
              Versão {doc.version} · publicada em{' '}
              {new Date(doc.published_at).toLocaleDateString('pt-BR')}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : doc ? (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
              {doc.content}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground py-6">
              A versão publicada está sendo carregada. Em caso de dúvidas, entre em contato pelo{' '}
              <a className="text-primary underline" href="mailto:foxvelour@gmail.com">
                foxvelour@gmail.com
              </a>
              .
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
