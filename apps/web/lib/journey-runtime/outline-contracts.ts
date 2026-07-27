import type { JourneyPresentation } from "@/lib/journey-runtime/contracts";

export type JourneyOutlineActivity = {
  step_instance_id: string;
  step_status: string;
  step_aggregate_version: number;
  available_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  step_code: string;
  is_required: boolean;
  position: number;
  metadata: Record<string, unknown>;
  activity_version_id: string;
  activity_title: string;
  activity_description: string | null;
  activity_type: string;
  estimated_minutes: number | null;
  can_open: boolean;
  can_start: boolean;
};

export type JourneyOutlineModule = {
  module_key: string;
  module_id: string | null;
  module_title: string;
  module_description: string;
  module_position: number;
  estimated_minutes: number | null;
  metadata: Record<string, unknown> & { is_required?: boolean; tone?: string; icon?: string };
  path_name: string;
  activity_count: number;
  completed_count: number;
  activities: JourneyOutlineActivity[];
};

export type ParticipantJourneyOutline = {
  journey_instance_id: string;
  journey_status: string;
  journey_aggregate_version: number;
  journey_version_id: string;
  journey_title: string;
  journey_description: string | null;
  journey_version_number: number;
  presentation?: JourneyPresentation;
  progress: number;
  completed_required_steps: number;
  total_required_steps: number;
  modules: JourneyOutlineModule[];
};