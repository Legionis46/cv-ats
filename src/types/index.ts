export type CandidateStatus = 'Yeni' | 'İncelendi' | 'Görüşme Planlandı' | 'Teklif Yapıldı' | 'Reddedildi';

export interface Language {
  language: string;
  level: string;
}

export interface Candidate {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  university: string | null;
  department: string | null;
  graduation_year: string | null;
  skills: string[];
  experience_years: number | null;
  last_position: string | null;
  last_company: string | null;
  languages: Language[];
  summary: string | null;
  status: CandidateStatus;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  candidate_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateWithNotes extends Candidate {
  notes: Note[];
}

export interface ParsedCV {
  name: string;
  email: string;
  phone: string;
  location: string;
  university: string;
  department: string;
  graduation_year: string;
  skills: string[];
  experience_years: number;
  last_position: string;
  last_company: string;
  languages: Language[];
  summary: string;
}

export interface FilterParams {
  search?: string;
  university?: string;
  department?: string;
  skills?: string[];
  min_experience?: number;
  max_experience?: number;
  status?: CandidateStatus;
}
