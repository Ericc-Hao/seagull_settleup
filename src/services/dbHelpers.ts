import { readCache } from '../lib/dataCache';
import type { DatabaseSnapshot } from '../storage/types';
import type { Expense, ExpenseSplit, Group, GroupMember, Team, TeamMember } from '../types/models';
import { isoNow } from '../utils/date';

export function readDb(): DatabaseSnapshot {
  return readCache();
}

export function getGroupMembers(groupId: string, db = readDb()): GroupMember[] {
  return db.groupMembers.filter((member) => member.groupId === groupId);
}

export function getTeams(groupId: string, db = readDb()): Team[] {
  return db.teams.filter((team) => team.groupId === groupId);
}

export function getTeamMembersForGroup(groupId: string, db = readDb()): TeamMember[] {
  const teamIds = new Set(getTeams(groupId, db).map((team) => team.id));
  return db.teamMembers.filter((link) => teamIds.has(link.teamId));
}

export function getMemberTeamId(memberId: string, groupId: string, db = readDb()): string | undefined {
  const teamIds = new Set(getTeams(groupId, db).map((team) => team.id));
  const link = db.teamMembers.find((entry) => entry.memberId === memberId && teamIds.has(entry.teamId));
  return link?.teamId;
}

export function getGroupExpenses(groupId: string, db = readDb()): Expense[] {
  return db.expenses.filter((expense) => expense.groupId === groupId && expense.type === 'split');
}

export function getExpenseSplits(expenseId: string, db = readDb()): ExpenseSplit[] {
  return db.expenseSplits.filter((split) => split.expenseId === expenseId);
}

export function findMemberForUser(groupId: string, userId: string, db = readDb()): GroupMember | undefined {
  return db.groupMembers.find((member) => member.groupId === groupId && member.userId === userId);
}

export function touch<T extends { updatedAt: string }>(record: T): T {
  return { ...record, updatedAt: isoNow() };
}

export function getGroupOrThrow(groupId: string, db = readDb()): Group {
  const group = db.groups.find((entry) => entry.id === groupId);
  if (!group) {
    throw new Error(`Group not found: ${groupId}`);
  }
  return group;
}
