export const PAYMENT_COPY_FEEDBACK: Record<string, string> = {
  name: 'Name copied',
  email: 'Email copied',
  phone: 'Phone copied',
  amount: 'Amount copied',
  message: 'Message copied',
  all: 'Payment info copied',
};

export function buildPaymentMessage(input: {
  groupName: string;
  payerName?: string;
  receiverName?: string;
  includeNames?: boolean;
}): string {
  const groupName = input.groupName.trim();
  const base = `${groupName} settlement`;

  if (input.includeNames !== false && input.payerName?.trim() && input.receiverName?.trim()) {
    return `${base} - ${input.payerName.trim()} to ${input.receiverName.trim()}`;
  }

  return base;
}

export function buildPaymentDetailsCopyText(input: {
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  amountLabel: string;
  message: string;
  groupName?: string;
}): string {
  const lines = [`Recipient: ${input.recipientName}`];

  if (input.recipientEmail?.trim()) {
    lines.push(`Email: ${input.recipientEmail.trim()}`);
  }
  if (input.recipientPhone?.trim()) {
    lines.push(`Phone: ${input.recipientPhone.trim()}`);
  }

  lines.push(`Amount: ${input.amountLabel}`);
  if (input.groupName?.trim()) {
    lines.push(`Group: ${input.groupName.trim()}`);
  }
  lines.push(`Message: ${input.message}`);
  return lines.join('\n');
}
