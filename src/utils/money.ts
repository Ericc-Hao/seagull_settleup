/** Money helpers — always use integer cents for storage and math. */

export function formatCAD(cents: number, options?: { includeSuffix?: boolean }): string {
  const includeSuffix = options?.includeSuffix ?? true;
  const formatted = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
  if (!includeSuffix) {
    return formatted.replace(/\s*CA\$/, '$').replace(/\s*CAD$/, '');
  }
  return formatted.includes('CAD') ? formatted : `${formatted} CAD`;
}

/** @deprecated Use formatCAD */
export const formatCad = formatCAD;

export function dollarsToCents(value: string | number): number {
  if (typeof value === 'number') {
    return Math.round(value * 100);
  }
  const normalized = value.replace(/[^0-9.-]/g, '');
  const dollars = Number.parseFloat(normalized);
  if (Number.isNaN(dollars)) {
    return 0;
  }
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function addCents(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

export const sumCents = addCents;

export function splitAmountEvenly(amountCents: number, memberCount: number): number[] {
  if (memberCount <= 0) {
    return [];
  }
  const base = Math.floor(amountCents / memberCount);
  const remainder = amountCents % memberCount;
  return Array.from({ length: memberCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function formatAmountInputValue(cents: number): string {
  if (cents <= 0) {
    return '';
  }
  return (cents / 100).toFixed(2);
}

export function parseAmountInput(value: string): number {
  return dollarsToCents(value);
}
