export interface Program {
  id: number;
  college_id: string;
  name: string;
  degree_type: string;
  field_of_study: string;
  prestige: number;
  ranking_in_field: number;
  specialty: string;
  notable_features: string;
  description: string;
}

export interface College {
  id: string;
  name: string;
  location: string;
  ranking: number;
  url: string;
  grad_rate: number;
  average_cost: number;
  acceptance_rate: number;
  median_salary: number;
  size: number;
  programs?: Program[];
  matchScore?: number;
  savedPrograms?: Program[];
  isVirtual?: boolean;
}