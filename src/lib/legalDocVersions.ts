/**
 * Versionamento *base* dos documentos legais usado durante o signup quando
 * ainda não há nenhuma versão publicada no banco. A versão real apresentada
 * ao usuário em runtime vem de `public.legal_documents.is_current = true`
 * (ver `useCurrentLegalDocument`) e é registrada em `user_consents`.
 *
 * Estes valores existem apenas como fallback histórico. Não os edite à mão —
 * publique uma nova versão pelo painel admin (Sistema → Documentos Legais).
 */
export const LEGAL_DOC_VERSIONS = {
  terms_of_use: '1.0',
  privacy_policy: '1.0',
} as const;

export type LegalConsentType = keyof typeof LEGAL_DOC_VERSIONS;
