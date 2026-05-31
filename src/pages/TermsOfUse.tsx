import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useCurrentLegalDocument } from '@/hooks/useLegalDocuments';

const TermsOfUse = () => {
  usePageMeta({
    title: 'Termos de Uso - Fox Velour',
    description: 'Termos e condições para uso da plataforma Fox Velour.',
    path: '/terms-of-use',
  });

  const { data: doc, isLoading } = useCurrentLegalDocument('terms_of_use');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto max-w-3xl px-4 py-10">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : doc ? (
          <article className="prose prose-sm dark:prose-invert max-w-none">
            <h1>Termos de Uso</h1>
            <p className="text-sm text-muted-foreground">
              <strong>Versão {doc.version}</strong> · publicada em{' '}
              {new Date(doc.published_at).toLocaleDateString('pt-BR')}
            </p>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{doc.content}</pre>
          </article>
        ) : (
          <article className="prose prose-sm dark:prose-invert">
            <h1>Termos de Uso</h1>
            <p><strong>Versão 1.0</strong></p>
            <p>
              A versão publicada está sendo carregada. Em caso de dúvidas, entre em contato pelo{' '}
              <a href="mailto:foxvelour@gmail.com">foxvelour@gmail.com</a>.
            </p>
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfUse;
