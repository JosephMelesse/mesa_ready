export interface Major {
  id: number;
  name: string;
  university: string;
}

export interface CatalogCourse {
  id: number;
  course_prefix: string;
  course_number: string;
  course_title: string;
  department: string | null;
  min_units: string;
  max_units: string | null;
  former_identifiers: string[] | null;
}

export interface SemesterClass {
  id: number;
  value: string;
}

export interface Semester {
  id: number;
  name: string;
  classes: SemesterClass[];
}

export interface SatisfiedReq {
  artType: string;
  uciCourse: string;
  uciTitle: string;
  satisfiedBy: string[];
}

export interface MissingReq {
  artType: string;
  uciCourse: string;
  uciTitle: string;
  uciUnits: number | null;
  options: string[];
}

export interface NoArticulationReq {
  uciCourse: string;
  uciTitle: string;
  reason: string;
}

export interface TransferResult {
  ready: boolean;
  totalUnits: number;
  satisfied: SatisfiedReq[];
  missing: MissingReq[];
  noArticulation: NoArticulationReq[];
}

export interface CalGetcAreaEntry {
  area: string;
  name: string;
  courses: string[];
  note: string | null;
  needed?: number;
}

export interface CalGetcResult {
  ready: boolean;
  satisfied: CalGetcAreaEntry[];
  missing: CalGetcAreaEntry[];
}

export type CheckResult =
  | { type: "transfer"; data: TransferResult }
  | { type: "calgetc"; data: CalGetcResult };
