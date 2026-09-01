// apps/api/src/modules/academic/electives/elective.mapper.ts

import type { ElectiveGroup } from '@spark/database/client';

import type { ElectiveGroupDTO } from './elective.types.js';

/**
 * Persistence → DTO boundary for the ElectiveGroup domain. This must be
 * the ONLY place a Prisma `ElectiveGroup` row is shaped into
 * `ElectiveGroupDTO` — route every ElectiveGroup-returning endpoint
 * through this file, the same convention subject.mapper.ts establishes
 * for `Subject` and semester.mapper.ts establishes for `SemesterCatalog`.
 *
 * It does not:
 * - query the database
 * - perform authorization
 * - validate uniqueness or existence
 * - enforce `minSelect <= maxSelect` or any other domain invariant
 * - write audit records
 * - mutate the input record
 *
 * Deterministic and side-effect free. `name`, `minSelect`, and
 * `maxSelect` are exposed exactly as persisted — no trimming,
 * normalization, or recalculation from subject counts; that belongs at
 * the input boundary (elective.validation.ts) or the service layer, not
 * here. A row with an invalid domain state (e.g. `minSelect > maxSelect`)
 * is mapped faithfully, not silently corrected.
 *
 * Relations (`semesterCatalog`, `subjects`, `selections`) are
 * intentionally never read or serialized here. `ElectiveGroupDTO`
 * (elective.types.ts) exposes only ElectiveGroup's own fields plus
 * `semesterCatalogId` — an elective group enriched with its subjects or
 * selection data is a deliberate, separately modeled response, not
 * something this mapper silently grows into.
 */

export function toElectiveGroupDTO(electiveGroup: ElectiveGroup): ElectiveGroupDTO {
  return {
    id: electiveGroup.id,
    semesterCatalogId: electiveGroup.semesterCatalogId,
    name: electiveGroup.name,
    minSelect: electiveGroup.minSelect,
    maxSelect: electiveGroup.maxSelect,
    createdAt: electiveGroup.createdAt.toISOString(),
    updatedAt: electiveGroup.updatedAt.toISOString(),
  };
}

export function toElectiveGroupDTOList(
  electiveGroups: readonly ElectiveGroup[],
): ElectiveGroupDTO[] {
  return electiveGroups.map(toElectiveGroupDTO);
}
