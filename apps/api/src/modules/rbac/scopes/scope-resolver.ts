// apps/api/src/modules/rbac/scopes/scope-resolver.ts

import type { ScopeContext } from './scope.types.js';

/**
 * Pure scope-coverage resolver.
 *
 * Hierarchy (single-college architecture — two levels only):
 *
 *   COLLEGE
 *     └── DEPARTMENT
 *
 * No relationship fact is required anywhere in this hierarchy: COLLEGE
 * unconditionally covers DEPARTMENT, and DEPARTMENT only covers an
 * identical DEPARTMENT. There is no third tier needing a trusted
 * cross-reference (unlike the removed DIVISION tier, which needed a
 * Department↔Division fact this schema no longer has a table for).
 *
 * A scope mismatch is an ordinary outcome (`false`), not an exception.
 * The exhaustive `never` checks guard only against a value that is
 * impossible under the ScopeContext type but could still reach this
 * function via an unsafe cast upstream — a genuine defect, not a mismatch.
 */
export function scopeCovers(granted: ScopeContext, requested: ScopeContext): boolean {
  switch (granted.type) {
    case 'COLLEGE':
      return true;

    case 'DEPARTMENT': {
      switch (requested.type) {
        case 'COLLEGE':
          return false;

        case 'DEPARTMENT':
          return requested.departmentId === granted.departmentId;

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
