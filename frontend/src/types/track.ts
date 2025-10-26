export interface Track {
  id: string;
  trackName: string;
  description?: string | null;
  fitScore?: number | null;
  items: TrackItem[];
}

export interface TrackItem {
  id: string;
  position?: number | null;
  matchRating?: number | null;
  college?: TrackCollege | null;
  program?: TrackProgram | null;
}

export interface TrackCollege {
  id: string;
  name: string;
  location?: string | null;
  ranking?: number | null;
  average_cost?: number | null;
  acceptance_rate?: number | null;
}

export interface TrackProgram {
  id: number;
  name: string;
  degree_type?: string | null;
  field_of_study?: string | null;
  specialty?: string | null;
  notable_features?: string | null;
  description?: string | null;
  college?: TrackCollege | null;
}
