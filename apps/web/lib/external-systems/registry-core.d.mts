export const externalSystems: Readonly<{
  trainingPlatform: Readonly<{
    code: "existing_training_platform";
    name: "Plataforma de capacitação existente";
    url: "https://meus-projetos.igor-vitor215821.workers.dev/";
    accessModel: "public_signup_manual_admin";
  }>;
  interviewAi: Readonly<{
    code: "interview_analysis_ai";
    name: "IA de análise de entrevista";
    baseUrl: string;
    identifierSemantics: "owner_reported_external_business_identifier_unverified";
  }>;
  dataHub: Readonly<{
    code: "estimulo_data_hub";
    name: "Data Hub Estímulo";
    url: "https://data-hub-estimulo.lovable.app/";
    accessModel: "external_domain_access_plus_dashboard_security";
  }>;
}>;
export function buildInterviewAiUrl(externalIdentifier: string): string;
