import type { Locale } from './data';

export const LEGAL_DOC_KEYS = ['terms', 'privacy', 'cookies', 'dpa', 'imprint'] as const;
export type LegalDocKey = (typeof LEGAL_DOC_KEYS)[number];

interface LegalMeta {
  backLink: string;
  lastUpdatedLabel: string; // e.g. "Last updated:" -- the date itself stays as-is
  docs: Record<LegalDocKey, { title: string; description: string }>;
}

export const LEGAL_META: Record<Locale, LegalMeta> = {
  en: {
    backLink: '← Back to Tenants10',
    lastUpdatedLabel: 'Last updated:',
    docs: {
      terms: { title: 'Terms of Service', description: 'Tenants10 Terms of Service.' },
      privacy: { title: 'Privacy Policy', description: 'Tenants10 Privacy Policy.' },
      cookies: { title: 'Cookie Policy', description: 'Tenants10 Cookie Policy.' },
      dpa: { title: 'Data Processing Agreement', description: 'Tenants10 Data Processing Agreement.' },
      imprint: { title: 'Imprint', description: 'Tenants10 legal imprint.' },
    },
  },
  de: {
    backLink: '← Zurück zu Tenants10',
    lastUpdatedLabel: 'Zuletzt aktualisiert:',
    docs: {
      terms: { title: 'Nutzungsbedingungen', description: 'Nutzungsbedingungen von Tenants10.' },
      privacy: { title: 'Datenschutzerklärung', description: 'Datenschutzerklärung von Tenants10.' },
      cookies: { title: 'Cookie-Richtlinie', description: 'Cookie-Richtlinie von Tenants10.' },
      dpa: { title: 'Datenverarbeitungsvereinbarung', description: 'Datenverarbeitungsvereinbarung von Tenants10.' },
      imprint: { title: 'Impressum', description: 'Impressum von Tenants10.' },
    },
  },
  fr: {
    backLink: '← Retour à Tenants10',
    lastUpdatedLabel: 'Dernière mise à jour :',
    docs: {
      terms: { title: "Conditions d'utilisation", description: "Conditions d'utilisation de Tenants10." },
      privacy: { title: 'Politique de confidentialité', description: 'Politique de confidentialité de Tenants10.' },
      cookies: { title: 'Politique de cookies', description: 'Politique de cookies de Tenants10.' },
      dpa: { title: 'Accord de traitement des données', description: 'Accord de traitement des données de Tenants10.' },
      imprint: { title: 'Mentions légales', description: 'Mentions légales de Tenants10.' },
    },
  },
  it: {
    backLink: '← Torna a Tenants10',
    lastUpdatedLabel: 'Ultimo aggiornamento:',
    docs: {
      terms: { title: 'Termini di servizio', description: 'Termini di servizio di Tenants10.' },
      privacy: { title: 'Informativa sulla privacy', description: 'Informativa sulla privacy di Tenants10.' },
      cookies: { title: 'Normativa sui cookie', description: 'Normativa sui cookie di Tenants10.' },
      dpa: { title: 'Accordo sul trattamento dei dati', description: 'Accordo sul trattamento dei dati di Tenants10.' },
      imprint: { title: 'Note legali', description: 'Note legali di Tenants10.' },
    },
  },
};
