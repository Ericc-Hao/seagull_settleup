import type { ExpenseSplit } from '../core/settlement';

export function buildCustomSplits(
  participantIds: string[],
  customSharesCents: Record<string, number>,
  amountCents: number,
): ExpenseSplit[] {
  if (participantIds.length === 0) {
    throw new Error('Select at least one participant.');
  }

  const splits = participantIds.map((memberId) => {
    const shareAmount = customSharesCents[memberId] ?? 0;
    if (!Number.isInteger(shareAmount) || shareAmount < 0) {
      throw new Error('Custom split values must be non-negative integer cents.');
    }
    return { memberId, shareAmountCents: shareAmount };
  });

  const total = splits.reduce((sum, split) => sum + split.shareAmountCents, 0);
  if (total !== amountCents) {
    throw new Error('Custom split total must equal expense amount.');
  }

  return splits;
}
