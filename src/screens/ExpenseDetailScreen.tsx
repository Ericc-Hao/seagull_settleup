import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { ScreenLayout, ScreenPageHeader, SectionCard, SectionTitle } from '../components';
import { CategoryIconBadge } from '../components/expenses/CategoryIconBadge';
import { ReceiptPreviewCard } from '../components/expenses/ReceiptPreviewCard';
import { ReceiptViewerModal } from '../components/expenses/ReceiptViewerModal';
import { UserAvatar } from '../components/common/UserAvatar';
import { useAppData } from '../context/AppDataContext';
import { getExpenseById, getExpenseDetail, getExpenseDetailView } from '../services/expenseService';
import { colors, layout, spacing, typography } from '../theme';
import type { ExpenseReceiptView } from '../types/views';
import { formatDateForDisplay, parseSupabaseDate } from '../utils/date';
import { createLogger } from '../utils/logger';
import { safeBack } from '../utils/navigation';

const logger = createLogger('ExpenseDetailScreen');

interface ExpenseDetailScreenProps {
  expenseId: string;
}

export function ExpenseDetailScreen({ expenseId }: ExpenseDetailScreenProps) {
  const { versions } = useAppData();
  const [receipt, setReceipt] = useState<ExpenseReceiptView | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);

  const detail = useMemo(() => getExpenseDetailView(expenseId), [expenseId, versions.expenses]);
  const expense = useMemo(() => getExpenseById(expenseId), [expenseId, versions.expenses]);

  useEffect(() => {
    let mounted = true;

    const loadReceipt = async () => {
      if (!detail) {
        setReceipt(null);
        setReceiptLoading(false);
        return;
      }

      const cachedReceipt = detail.receipt ?? null;
      if (cachedReceipt) {
        setReceipt(cachedReceipt);
      }

      const mayHaveReceipt = Boolean(expense?.receiptId || cachedReceipt);
      if (!mayHaveReceipt) {
        setReceipt(null);
        setReceiptLoading(false);
        return;
      }

      const hasDisplayUrl = Boolean(cachedReceipt?.displayUrl ?? cachedReceipt?.publicUrl);
      setReceiptLoading(!hasDisplayUrl);
      logger.info('Expense detail receipt load started', { expenseId, hasCachedReceipt: Boolean(cachedReceipt) });

      try {
        const result = await getExpenseDetail(expenseId);
        if (!mounted) {
          return;
        }
        setReceipt(result?.receipt ?? null);
        logger.info('Expense detail receipt load succeeded', {
          expenseId,
          hasReceipt: Boolean(result?.receipt),
        });
      } catch (error) {
        logger.error('Expense detail receipt load failed', error, { expenseId });
      } finally {
        if (mounted) {
          setReceiptLoading(false);
        }
      }
    };

    void loadReceipt();

    return () => {
      mounted = false;
    };
  }, [expenseId, versions.expenses, detail, expense?.receiptId]);

  if (!detail) {
    return (
      <ScreenLayout
        bottomTabPadding={false}
        header={
          <ScreenPageHeader
            title="Expense"
            subtitle="Expense not found."
            onBack={() => safeBack('/(tabs)/expenses')}
          />
        }
      >
        <Text style={[typography.body, { color: colors.textSecondary }]}>This expense could not be loaded.</Text>
      </ScreenLayout>
    );
  }

  const dateLabel = formatDateForDisplay(parseSupabaseDate(detail.expenseDate.split('T')[0]));
  const receiptUrl = receipt?.displayUrl ?? receipt?.publicUrl ?? null;
  const showReceiptSection = receiptLoading || Boolean(receiptUrl);

  return (
    <ScreenLayout
      bottomTabPadding={false}
      header={
        <ScreenPageHeader
          title={detail.label}
          subtitle={detail.categoryName}
          onBack={() => safeBack('/(tabs)/expenses')}
        />
      }
    >
      <SectionCard>
        <View style={{ padding: layout.cardPadding, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <CategoryIconBadge categoryName={detail.categoryName} size="md" />
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyMedium}>{detail.label}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {detail.categoryName}
              </Text>
            </View>
          </View>

          {detail.groupName ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Group</Text>
              <Text style={typography.bodyMedium}>{detail.groupName}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Date</Text>
            <Text style={typography.bodyMedium}>{dateLabel}</Text>
          </View>

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
              paddingTop: spacing.md,
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Total</Text>
              <Text style={typography.sectionTitle}>{detail.totalAmountDisplay}</Text>
            </View>

            {detail.myShareAmountDisplay ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Your share</Text>
                <Text style={typography.bodyMedium}>{detail.myShareAmountDisplay}</Text>
              </View>
            ) : null}

            {detail.payerName ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Paid by</Text>
                <Text style={typography.bodyMedium}>{detail.payerName}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </SectionCard>

      {showReceiptSection ? (
        <ReceiptPreviewCard
          receiptUrl={receiptUrl}
          fileName={receipt?.fileName}
          loading={receiptLoading}
          onPress={receiptUrl ? () => setViewerVisible(true) : undefined}
        />
      ) : null}

      {detail.type === 'split' && detail.splits.length > 0 ? (
        <View style={{ gap: layout.cardGap }}>
          <SectionTitle title="Split between" />
          <SectionCard>
            {detail.splits.map((split, index) => (
              <View
                key={split.memberId}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingHorizontal: layout.cardPadding,
                  paddingVertical: 14,
                  borderBottomWidth: index < detail.splits.length - 1 ? 1 : 0,
                  borderBottomColor: colors.borderSubtle,
                }}
              >
                <UserAvatar
                  avatarUrl={split.avatarUrl}
                  displayName={split.displayName}
                  initials={split.avatarLabel}
                  size={36}
                  status={split.isPending ? 'pending' : undefined}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={typography.bodyMedium}>{split.displayName}</Text>
                  {split.isPending ? (
                    <Text style={[typography.caption, { color: '#F59E0B' }]}>Pending</Text>
                  ) : null}
                </View>
                <Text style={typography.bodyMedium}>{split.shareAmountDisplay}</Text>
              </View>
            ))}
          </SectionCard>
        </View>
      ) : null}

      {detail.groupId ? (
        <Text
          style={[typography.caption, { color: colors.primary, textAlign: 'center' }]}
          onPress={() => router.push(`/group/${detail.groupId}`)}
        >
          View group
        </Text>
      ) : null}

      <ReceiptViewerModal
        visible={viewerVisible}
        receiptUrl={receiptUrl}
        fileName={receipt?.fileName}
        onClose={() => setViewerVisible(false)}
      />
    </ScreenLayout>
  );
}
