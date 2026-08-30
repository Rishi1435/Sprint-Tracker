export interface UserRow {
  id: string;
  name: string;
  nickname?: string;
  start_date: string; // YYYY-MM-DD — day 1 of that user's sprint
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
