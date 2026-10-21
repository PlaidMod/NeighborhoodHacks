import type { QuizBodyType } from '@/lib/contracts/bodyTypes';

// The `bodies` rows ingest needs before it can write meetings and items (they reference bodies.id).
// P1 owns the bodies table: these rows are inserted only when missing and never overwritten,
// so P1 can fill in descriptions, elected_or_appointed, tax_set_by_body_id and the rest.
// IDs match data/sources.yaml (including section_body_map) and lib/lookup/standIn.ts.
// sms_eligible follows Project_Plan.md: city councils, Commissioners Court (with Flood Control),
// school boards, community college boards, MUDs and ESDs.

export type BodySeed = {
  id: string;
  name: string;
  type: QuizBodyType;
  category: 'tracked';
  sms_eligible: boolean;
};

export const TRACKED_BODIES: readonly BodySeed[] = [
  { id: 'houston_city_council', name: 'Houston City Council', type: 'city_council', category: 'tracked', sms_eligible: true },
  { id: 'commissioners_court', name: 'Harris County Commissioners Court', type: 'commissioners_court', category: 'tracked', sms_eligible: true },
  { id: 'flood_control', name: 'Harris County Flood Control District', type: 'flood_control', category: 'tracked', sms_eligible: true },
  { id: 'port_houston', name: 'Port of Houston Authority', type: 'port', category: 'tracked', sms_eligible: false },
  { id: 'hisd_board', name: 'Houston ISD Board of Managers', type: 'school_board', category: 'tracked', sms_eligible: true },
  { id: 'cfisd_board', name: 'Cypress-Fairbanks ISD Board of Trustees', type: 'school_board', category: 'tracked', sms_eligible: true },
  { id: 'hcc_board', name: 'Houston Community College Board of Trustees', type: 'college_board', category: 'tracked', sms_eligible: true },
  { id: 'lone_star_board', name: 'Lone Star College Board of Trustees', type: 'college_board', category: 'tracked', sms_eligible: true },
  { id: 'hcmud_489', name: 'Harris County MUD 489', type: 'mud', category: 'tracked', sms_eligible: true },
  { id: 'hcad', name: 'Harris Central Appraisal District', type: 'hcad', category: 'tracked', sms_eligible: false },
];
