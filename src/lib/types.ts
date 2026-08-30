export interface UserRow {
  id: string;
  name: string;
  nickname?: string;
  start_date?: string | null; // YYYY-MM-DD — set on the day user completes their first task (null before that)
  created_at: string;
}

export interface ProgressRow {
  id: string;
  user_id: string;
  day_number: number;
  aptitude: boolean;
  reasoning: boolean;
  verbal: boolean;
  cs_fundamentals: boolean;
  java_core: boolean;
  dsa_concept: boolean;
  leetcode: boolean;
  gpp_project?: boolean;
  updated_at: string;
}
