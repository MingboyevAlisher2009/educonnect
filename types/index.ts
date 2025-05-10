import { User } from "@supabase/supabase-js";

export interface GroupType {
  id: string;
  name: string;
  description: string;
  teacher_id: string;
  teacher: User;
  created_at: string;
  updated_at: string;
}

export interface SubmissionType {
  id: string;
  title: string;
  description: string;
  due_date: Date;
  group: GroupType;
  teacher: User;
}
