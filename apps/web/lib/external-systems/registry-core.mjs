export const externalSystems = Object.freeze({
  trainingPlatform: Object.freeze({
    code: "existing_training_platform",
    name: "Plataforma de capacitação existente",
    url: "https://meus-projetos.igor-vitor215821.workers.dev/",
    accessModel: "public_signup_manual_admin",
  }),
  interviewAi: Object.freeze({
    code: "interview_analysis_ai",
    name: "IA de análise de entrevista",
    baseUrl: "https://script.google.com/a/macros/estimulo.org/s/AKfycbyCEU66u-63ywe0v8zsquxWILmvVgRbSuJHN372lt3sEGHGLgqC7pp6pk8ztVd7WbHu/exec",
    identifierSemantics: "owner_reported_external_business_identifier_unverified",
  }),
  dataHub: Object.freeze({
    code: "estimulo_data_hub",
    name: "Data Hub Estímulo",
    url: "https://data-hub-estimulo.lovable.app/",
    accessModel: "external_domain_access_plus_dashboard_security",
  }),
});

const externalIdentifierPattern = /^\d{1,20}$/;

export function buildInterviewAiUrl(externalIdentifier) {
  const normalized = externalIdentifier.trim();
  if (!externalIdentifierPattern.test(normalized)) {
    throw new Error("INTERVIEW_AI_EXTERNAL_ID_INVALID");
  }
  const url = new URL(externalSystems.interviewAi.baseUrl);
  url.searchParams.set("id", normalized);
  return url.toString();
}
