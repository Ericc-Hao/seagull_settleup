import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Icon } from '../components/Icon';
import { ScreenLayout, ScreenPageHeader, SectionCard, SectionTitle } from '../components';
import { CategoryIconBadge } from '../components/expenses/CategoryIconBadge';
import { DeleteExpenseModal } from '../components/expenses/DeleteExpenseModal';
import { ReceiptPreviewCard } from '../components/expenses/ReceiptPreviewCard';
import { ReceiptViewerModal } from '../components/expenses/ReceiptViewerModal';
import { UserAvatar } from '../components/common/UserAvatar';
import { useAppData } from '../context/AppDataContext';
import {
  canDeleteExpense,
  deleteExpense,
  getExpenseById,
  getExpenseDetail,
  getExpenseDetailView,
} from '../services/expenseService';
import { colors, layout, spacing, typography } from '../theme';
import type { CurrencyCode } from '../types/currency';
import type { ExpenseReceiptView } from '../types/views';
import { formatCurrency } from '../utils/currency';
import { formatDateForDisplay, parseSupabaseDate } from '../utils/date';
import { toUserFriendlyError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { invalidateAfterDeleteExpense } from '../utils/mutationInvalidation';
import { safeBack } from '../utils/navigation';

const logger = createLogger('ExpenseDetailScreen');

interface ExpenseDetailScreenProps {
  expenseId: string;
}

export function ExpenseDetailScreen({ expenseId }: ExpenseDetailScreenProps) {
  const { versions, invalidate } = useAppData();
  const [receipt, setReceipt] = useState<ExpenseReceiptView | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const detail = useMemo(() => getExpenseDetailView(expenseId), [expenseId, versions.expenses]);
  const expense = useMemo(() => getExpenseById(expenseId), [expenseId, versions.expenses]);
  const canDelete = useMemo(() => canDeleteExpense(expenseId), [expenseId, versions.expenses]);

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

  const openDeleteModal = useCallback(() => {
    logger.info('Delete expense pressed', {
      expenseId,
      groupId: expense?.groupId,
      type: expense?.type,
    });
    logger.info('Delete expense confirmation opened', { expenseId });
    setDeleteError(undefined);
    setShowDeleteModal(true);
  }, [expense?.groupId, expense?.type, expenseId]);

  const navigateAfterDelete = useCallback(
    (result: { groupId?: string | null; type?: 'personal' | 'split' }) => {
      if (result.type === 'split' && result.groupId) {
        router.replace(`/group/${result.groupId}`);
        return;
      }
      router.replace('/(tabs)/expenses');
    },
    [],
  );

  const handleDeleteConfirm = useCallback(async () => {
    setDeleting(true);
    setDeleteError(undefined);
    try {
      const result = await deleteExpense(expenseId);
      invalidateAfterDeleteExpense(invalidate, {
        expenseId: result.expenseId,
        groupId: result.groupId ?? undefined,
        type: result.type,
      });
      setShowDeleteModal(false);
      Alert.alert('Expense deleted', 'This expense has been removed.');
      navigateAfterDelete(result);
    } catch (error) {
      const message = toUserFriendlyError(error, 'Unable to delete expense.');
      setDeleteError(message);
      logger.error('Delete expense failed', error, {
        expenseId,
        groupId: expense?.groupId,
        type: expense?.type,
      });
    } finally {
      setDeleting(false);
    }
  }, [expense?.groupId, expense?.type, expenseId, invalidate, navigateAfterDelete]);

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
  const receiptConversionNote =
    receipt?.originalAmountMinor &&
    receipt.originalCurrency &&
    receipt.convertedAmountMinor &&
    receipt.convertedCurrency &&
    receipt.originalCurrency !== receipt.convertedCurrency
      ? `Receipt was ${formatCurrency(receipt.originalAmountMinor, receipt.originalCurrency as CurrencyCode)}, converted to ${formatCurrency(receipt.convertedAmountMinor, receipt.convertedCurrency as CurrencyCode)}.`
      : null;

  return (
    <>
      <ScreenLayout
        bottomTabPadding={false}
        header={
          <ScreenPageHeader
            title={detail.label}
            subtitle={detail.categoryName}
            onBack={() => safeBack('/(tabs)/expenses')}
            rightAction={
              canDelete ? (
                <Pressable
                  onPress={openDeleteModal}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Delete expense"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.white,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="trash" size={20} color={colors.danger} strokeWidth={1.5} />
                </Pressable>
              ) : undefined
            }
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
            conversionNote={receiptConversionNote}
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

        {canDelete ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <SectionTitle title="Actions" />
            <Pressable
              onPress={openDeleteModal}
              style={{
                borderRadius: layout.cardRadius,
                backgroundColor: colors.white,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={[typography.bodyMedium, { color: colors.danger }]}>Delete Expense</Text>
            </Pressable>
            {deleteError ? (
              <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>{deleteError}</Text>
            ) : null}
          </View>
        ) : null}

        <ReceiptViewerModal
          visible={viewerVisible}
          receiptUrl={receiptUrl}
          fileName={receipt?.fileName}
          onClose={() => setViewerVisible(false)}
        />
      </ScreenLayout>

      <DeleteExpenseModal
        visible={showDeleteModal}
        loading={deleting}
        onCancel={() => {
          if (!deleting) {
            setShowDeleteModal(false);
            setDeleteError(undefined);
          }
        }}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </>
  );
}
