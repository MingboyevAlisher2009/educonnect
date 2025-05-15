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
  due_date: Date | string;
  group: GroupType;
  teacher: User;
  task: SubmissionType;
  file_path: string;
}

export interface CardProps {
  icon: React.ReactNode;
  number: number;
  label: string;
  bg: string;
}

export interface SectionProps {
  title: string;
  message: string;
}

export interface TabItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

export interface IGroup {
  id: string;
  name: string;
  description: string;
  created_at: string;
  teacher_id: string;
  tasks_count?: number;
  tasks: SubmissionType[];
}
