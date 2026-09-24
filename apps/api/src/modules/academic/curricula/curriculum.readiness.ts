// apps/api/src/modules/academic/curricula/curriculum.readiness.ts

import type { CurriculumActivationSnapshot } from './curriculum.repository.js';

/**
 * Pure activation-readiness evaluation for a CurriculumVersion. No I/O, no
 * Prisma, no throwing: it takes a snapshot the repository loaded inside the
 * activation transaction and returns every violation found, so the service
 * can report them all at once as a single 422.
 *
 * Rules (DRAFT -> ACTIVE):
 *   1. The version belongs to a program with a valid totalSemesters.
 *   2. It has exactly `program.totalSemesters` semesters.
 *   3. Semester numbers are exactly 1..totalSemesters (none missing/out of range).
 *   4. No duplicate semester numbers (also DB-unique; checked defensively).
 *   5. Every semester has at least one subject.
 *   6. Every subject that names an elective group references a group that
 *      belongs to the SAME semester.
 *   7. Every elective group satisfies minSelect <= maxSelect (the existing
 *      domain invariant from ElectiveGroupService).
 *
 * Elective groups are NOT mandatory. Not enforced (no existing rule to
 * derive them from): isElective/electiveGroupId agreement, and a minimum
 * subject count per group.
 */

const MAX_REPORTED_VIOLATIONS = 10;

const sortedList = (values: Iterable<number>): string =>
  [...values].sort((a, b) => a - b).join(', ');

export function evaluateActivationReadiness(snapshot: CurriculumActivationSnapshot): string[] {
  const violations: string[] = [];

  const expected = snapshot.program.totalSemesters;
  if (!Number.isInteger(expected) || expected < 1) {
    violations.push(`the program defines an invalid total semester count (${expected})`);
    return violations;
  }

  const semesters = snapshot.semesterCatalogs;

  if (semesters.length !== expected) {
    violations.push(`expected ${expected} semesters but found ${semesters.length}`);
  }

  const seen = new Set<number>();
  const duplicated = new Set<number>();
  const outOfRange = new Set<number>();
  for (const semester of semesters) {
    if (seen.has(semester.number)) duplicated.add(semester.number);
    seen.add(semester.number);
    if (semester.number < 1 || semester.number > expected) outOfRange.add(semester.number);
  }

  const missing: number[] = [];
  for (let n = 1; n <= expected; n += 1) {
    if (!seen.has(n)) missing.push(n);
  }

  if (missing.length > 0) violations.push(`missing semester number(s): ${sortedList(missing)}`);
  if (duplicated.size > 0) {
    violations.push(`duplicate semester number(s): ${sortedList(duplicated)}`);
  }
  if (outOfRange.size > 0) {
    violations.push(`semester number(s) outside 1..${expected}: ${sortedList(outOfRange)}`);
  }

  for (const semester of semesters) {
    if (semester.subjects.length === 0) {
      violations.push(`semester ${semester.number} has no subjects`);
    }

    for (const group of semester.electiveGroups) {
      if (group.minSelect > group.maxSelect) {
        violations.push(
          `elective group "${group.name}" in semester ${semester.number} has minSelect greater than maxSelect`,
        );
      }
    }

    const groupIdsInSemester = new Set(semester.electiveGroups.map((group) => group.id));
    for (const subject of semester.subjects) {
      if (subject.electiveGroupId === null) continue;
      const belongsHere =
        groupIdsInSemester.has(subject.electiveGroupId) &&
        subject.electiveGroup?.semesterCatalogId === semester.id;
      if (!belongsHere) {
        violations.push(
          `subject ${subject.code} in semester ${semester.number} references an elective group outside its semester`,
        );
      }
    }
  }

  return violations;
}

export function formatReadinessFailure(violations: readonly string[]): string {
  const shown = violations.slice(0, MAX_REPORTED_VIOLATIONS);
  const remaining = violations.length - shown.length;
  return (
    `Curriculum version is not ready for activation: ${shown.join('; ')}` +
    (remaining > 0 ? ` (and ${remaining} more)` : '')
  );
}
