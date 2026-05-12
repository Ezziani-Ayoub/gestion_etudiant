// auth.ts — Client-safe auth types and utilities only.
// DO NOT import next/headers here — this file is used by client components.

export type UserRole = "teacher" | "student" | "administration";

export interface SessionUser {
  name: string;
  role: UserRole;
  code: string;
  classId?: string;
  studentId?: string;
  module?: string;
}

// AuthUser is used by DashboardLayout (client component)
export interface AuthUser {
  name: string;
  role: UserRole;
  classId?: string;
  studentId?: string;
  module?: string;
}

export function getDefaultPathForRole(role: UserRole): string {
  if (role === "student") return "/student";
  if (role === "administration") return "/admin";
  return "/";
}

export function isPathAllowedForRole(role: UserRole, path: string): boolean {
  if (role === "student") {
    return (
      path.startsWith("/student") ||
      path.startsWith("/lessons") ||
      path.startsWith("/student/courses-devoirs") ||
      path.startsWith("/student/absences")
    );
  }
  if (role === "administration") {
    return path.startsWith("/admin");
  }
  // Teacher
  return (
    path === "/" ||
    path.startsWith("/grades") ||
    path.startsWith("/lessons") ||
    path.startsWith("/absences") ||
    path.startsWith("/admin")
  );
}
