// apps/api/src/modules/rbac/scopes/scope-resolver.ts

import type { ScopeContext } from './scope.types.js';

/**
 * Trusted Department → Division relationship fact.
 *
 * scope-resolver.ts has no repository access and no Prisma dependency,
 * so it cannot itself determine which Department a Division belongs to.
 * Neither scope.repository.ts nor role-assignment.repository.ts
 * currently exposes that relationship (see the follow-up note in the
 * accompanying report).
 *
 * When the requested scope is DIVISION and the granted scope is
 * DEPARTMENT, the caller (eventually authorization.service.ts) must
 * resolve the requested division's owning department through a trusted
 * source and pass the fact here. Omitting it, or passing a fact for a
 * different division, is always treated as "relationship unknown" and
 * resolves to false — never guessed as true.
 */
export interface DivisionDepartmentFact {
  readonly divisionId: string;
  readonly departmentId: string;
}

/**
 * Pure scope-coverage resolver.
 *
 * This module answers exactly one question:
 *
 *   "Does the granted scope cover the requested scope?"
 *
 * It does not own:
 * - whether a Department or Division exists (scope.service.ts)
 * - whether a user holds a role or permission (authorization.service.ts,
 *   permission-resolver.ts)
 * - the final ALLOW/DENY authorization decision (authorization.service.ts)
 *
 * It never inspects an actor, a User, a Role, a Permission, a JWT, a
 * session, or an AuthorizationSubject — it operates purely on two
 * ScopeContext values and, when genuinely required, an explicitly
 * supplied relationship fact.
 *
 * Hierarchy (single-college architecture — no ORGANIZATION scope exists
 * above COLLEGE):
 *
 *   COLLEGE
 *     └── DEPARTMENT
 *           └── DIVISION
 *
 * A scope mismatch is an ordinary, expected outcome, not an exceptional
 * one — this function returns `false` rather than throwing for a normal
 * "does not cover" result. The one exception is a value that is
 * impossible under the ScopeContext type but could still reach this
 * function at runtime (e.g. via an unsafe cast upstream); that is a
 * genuine defect, not a mismatch, and is rejected via the exhaustive
 * `never` check.
 *
 * Security-critical default: when the Department → Division relationship
 * needed to resolve a DEPARTMENT-grants-DIVISION check is not supplied,
 * or does not match the requested division, the result is `false`.
 * Coverage is never inferred from matching ID strings alone.
 */
export function scopeCovers(
  granted: ScopeContext,
  requested: ScopeContext,
  divisionDepartment?: DivisionDepartmentFact,
): boolean {
  switch (granted.type) {
    case 'COLLEGE':
      // COLLEGE is the top of the hierarchy: it covers itself and every
      // narrower scope, unconditionally.
      return true;

    case 'DEPARTMENT': {
      switch (requested.type) {
        case 'COLLEGE':
          // A DEPARTMENT grant never covers the whole college.
          return false;

        case 'DEPARTMENT':
          return requested.departmentId === granted.departmentId;

        case 'DIVISION':
          // Only covers the division if the caller has supplied a
          // trusted fact tying THIS requested division to THIS granted
          // department. No fact, or a fact for a different division,
          // resolves to false rather than being assumed true.
          return (
            divisionDepartment?.divisionId === requested.divisionId &&
            divisionDepartment.departmentId === granted.departmentId
          );

        default: {
          const exhaustiveCheck: never = requested;
          throw new Error(`Invalid ScopeContext: unknown scope type "${String(exhaustiveCheck)}".`);
        }
      }
    }

    case 'DIVISION': {
      switch (requested.type) {
        case 'COLLEGE':
          // A DIVISION grant never covers the whole college.
          return false;

        case 'DEPARTMENT':
          // A DIVISION grant never covers its parent department, or any
          // department — narrower scopes never cover broader ones.
          return false;

        case 'DIVISION':
          return requested.divisionId === granted.divisionId;

        default: {
          const exhaustiveCheck: never = requested;
          throw new Error(`Invalid ScopeContext: unknown scope type "${String(exhaustiveCheck)}".`);
        }
      }
    }

    default: {
      const exhaustiveCheck: never = granted;
      throw new Error(`Invalid ScopeContext: unknown scope type "${String(exhaustiveCheck)}".`);
    }
  }
}
