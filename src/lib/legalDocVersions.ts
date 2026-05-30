/**
 * Versionamento dos documentos legais.
 * Ao publicar uma nova versão, incremente o valor e, se desejar,
 * use-o para solicitar novo aceite a usuários existentes
 * (comparando com a última versão aceita em `user_consents`).
 */
export const LEGAL_DOC_VERSIONS = {
  terms_of_use: '1.0',
  privacy_policy: '1.0',
} as const;

export type LegalConsentType = keyof typeof LEGAL_DOC_VERSIONS;
