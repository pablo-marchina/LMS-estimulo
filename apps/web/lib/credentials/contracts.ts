export type BadgeAward = {
  award_id: string;
  journey_instance_id: string;
  title: string;
  description: string;
  journey_title: string;
  awarded_at: string;
  status: string;
};

export type CertificateIssuance = {
  issuance_id: string;
  journey_instance_id: string;
  certificate_name: string;
  journey_title: string;
  verification_code: string;
  certificate_number: string | null;
  issuer_name: string | null;
  issuer_cnpj: string | null;
  display_name: string;
  status: string;
  issued_at: string;
  expires_at: string | null;
  valid: boolean;
};

export type ParticipantCredentials = {
  entrepreneur_id: string | null;
  badges: BadgeAward[];
  certificates: CertificateIssuance[];
};

export type CredentialIssuanceResult = {
  journey_instance_id: string;
  step_instance_id: string | null;
  journey_completed: boolean;
  required_steps_completed: boolean;
  required_assessments_passed: boolean;
  badges: Array<Record<string, unknown>>;
  certificates: Array<Record<string, unknown>>;
};

export type CertificateVerification = {
  valid: boolean;
  reason: string;
  verification_code?: string;
  certificate_number?: string | null;
  certificate_name?: string;
  journey_title?: string;
  display_name?: string;
  issued_at?: string;
  expires_at?: string | null;
  issuer_name?: string | null;
  issuer_cnpj?: string | null;
  representative_name?: string | null;
  representative_role?: string | null;
};
