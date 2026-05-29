import type { CurrencyCode } from '../../types/currency';
import type { SplitMethod } from '../../types/models';
import { formatAmountInputValue, parseAmountInput } from '../../utils/currency';
import { addCents, splitAmountEvenly } from '../../utils/money';

export function computeEqualSplitShares(amountCents: number, participantCount: number): number[] {
  if (participantCount <= 0 || amountCents <= 0) {
    return [];
  }
  return splitAmountEvenly(amountCents, participantCount);
}

export function parseCustomShareCentsByMember(
  splitMemberIds: string[],
  customAmounts: Record<string, string>,
  currency: CurrencyCode,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const memberId of splitMemberIds) {
    const raw = customAmounts[memberId] ?? '';
    map[memberId] = parseAmountInput(raw, currency);
  }
  return map;
}

export function computeCustomAssignedTotal(
  splitMemberIds: string[],
  customShareCentsByMember: Record<string, number>,
): number {
  return addCents(splitMemberIds.map((id) => customShareCentsByMember[id] ?? 0));
}

export function isCustomSplitTotalValid(
  splitMethod: SplitMethod,
  amountCents: number,
  customAssignedTotal: number,
): boolean {
  return splitMethod !== 'custom' || (amountCents > 0 && customAssignedTotal === amountCents);
}

export function computeFillRemainingAmountCents(
  splitMemberIds: string[],
  customShareCentsByMember: Record<string, number>,
  amountCents: number,
): number {
  if (splitMemberIds.length === 0) {
    return 0;
  }
  const assigned = addCents(
    splitMemberIds.slice(0, -1).map((id) => customShareCentsByMember[id] ?? 0),
  );
  return Math.max(0, amountCents - assigned);
}

export function buildEqualCustomAmountInputs(
  splitMemberIds: string[],
  amountCents: number,
  currency: CurrencyCode,
): Record<string, string> {
  if (splitMemberIds.length === 0 || amountCents <= 0) {
    return {};
  }
  const shares = splitAmountEvenly(amountCents, splitMemberIds.length);
  const next: Record<string, string> = {};
  splitMemberIds.forEach((id, index) => {
    next[id] = formatAmountInputValue(shares[index] ?? 0, currency);
  });
  return next;
}

export function shouldAutoFillCustomSplit(
  splitMethod: SplitMethod,
  amountCents: number,
  splitMemberIds: string[],
  customAmounts: Record<string, string>,
): boolean {
  if (splitMethod !== 'custom' || amountCents <= 0) {
    return false;
  }
  return splitMemberIds.every((id) => !(customAmounts[id] ?? '').trim());
}
