export interface Member {
  id: string;
  name: string;
  part: string;
}

export interface PracticeMark {
  id: string;
  markName: string; // e.g., "A", "B", "Intro"
  guidance: string; // 指導したこと
  remainingTasks: string; // 残っている課題
}

export interface Piece {
  id: string;
  title: string;
  composer?: string;
}

export interface PieceLog {
  id: string;
  pieceTitle: string;
  marks: PracticeMark[];
}

export interface RehearsalLog {
  date: string; // YYYY-MM-DD
  pieces?: PieceLog[];
  overallNotes: string;
  // legacy backward compatibility
  pieceTitle?: string;
  marks?: PracticeMark[];
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  memberId: string;
  status: AttendanceStatus;
}

export interface DailyAttendance {
  date: string;
  records: AttendanceRecord[];
}

export interface DictionaryTerm {
  term: string;
  reading: string;
  meaning: string;
  category: 'tempo' | 'dynamics' | 'expression' | 'articulation' | 'other';
}
