
export type Gender = 'Gents' | 'Ladies';

export type GentsGroup = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Volunteer {
  id: string;
  name: string;
  role: string;
  password: string;
}

export interface Sewadar {
  id: string;
  name: string;
  gender: Gender;
  group: GentsGroup | 'Ladies';
}

export interface AttendanceRecord {
  sewadarId: string;
  name: string; // Added to match Supabase requirement
  date: string; // YYYY-MM-DD
  timestamp: number;
  volunteerId: string;
}

export interface ScoreRecord {
  id: string;
  sewadarId: string;
  name: string; // Added to match Supabase requirement
  game: string;
  points: number;
  timestamp: number;
  volunteerId: string;
  isDeleted?: boolean;
}

export type ViewState = 'Participant' | 'Attendance' | 'Points' | 'Dashboard' | 'Login';

export const GAMES = [
  'Spiritual Quiz',
  'Chess',
  'Carrom Board',
  'Tambola',
  'Break the glass',
  'Ludo',
  'Volleyball',
  'Cricket'
] as const;
