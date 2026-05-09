export interface ModuleGrade {
  control?: string;
  exam?: string;
}

export interface GradesMap {
  [moduleName: string]: ModuleGrade;
}

interface LocalGradesByStudent {
  [studentId: string]: GradesMap;
}

interface LocalGradesByClass {
  [classId: string]: LocalGradesByStudent;
}

const STORAGE_KEY = "local_student_grades_v1";

function readAllGrades(): LocalGradesByClass {
  if (typeof window === "undefined") return {};

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as LocalGradesByClass;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAllGrades(data: LocalGradesByClass) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getStudentGradesFromLocalStorage(classId: string, studentId: string): GradesMap {
  const all = readAllGrades();
  return all[classId]?.[studentId] || {};
}

export function saveStudentGradesToLocalStorage(classId: string, studentId: string, grades: GradesMap) {
  const all = readAllGrades();
  if (!all[classId]) all[classId] = {};
  all[classId][studentId] = grades;
  writeAllGrades(all);
}
