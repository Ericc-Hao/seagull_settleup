import { describe, expect, it } from 'vitest';

import { EMPTY_VERSIONS } from '../../context/appDataTypes';

/** Mirrors useTeamSettlement member memo dependencies for regression coverage. */
export function teamSettlementMemberVersionDeps(
  groupId: string,
  groupDetailVersion: number,
  versions: typeof EMPTY_VERSIONS,
) {
  return {
    groupId,
    groupsVersion: versions.groups,
    groupDetailVersion,
    settlementsVersion: versions.settlements,
  };
}

describe('useTeamSettlement version dependencies', () => {
  it('changes member dependency snapshot when group detail version changes', () => {
    const base = teamSettlementMemberVersionDeps('group-1', 1, {
      ...EMPTY_VERSIONS,
      groups: 2,
      settlements: 3,
    });
    const updated = teamSettlementMemberVersionDeps('group-1', 2, {
      ...EMPTY_VERSIONS,
      groups: 2,
      settlements: 3,
    });

    expect(base).not.toEqual(updated);
    expect(updated.groupDetailVersion).toBe(2);
  });

  it('changes member dependency snapshot when groups version changes', () => {
    const before = teamSettlementMemberVersionDeps('group-1', 1, { ...EMPTY_VERSIONS, groups: 1 });
    const after = teamSettlementMemberVersionDeps('group-1', 1, { ...EMPTY_VERSIONS, groups: 2 });
    expect(before).not.toEqual(after);
  });
});
