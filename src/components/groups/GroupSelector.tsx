import { Pressable, Text, View } from 'react-native';

import type { GroupSelectorOption } from '../../types/views';
import { colors, layout, radii, shadows, spacing, typography } from '../../theme';
import { Icon } from '../Icon';
import { PrimaryButton } from '../PrimaryButton';

export function GroupSelector({
  groups,
  selectedGroup,
  initialLoading,
  loading,
  error,
  onPress,
  onRetry,
  onCreateGroup,
}: {
  groups: GroupSelectorOption[];
  selectedGroup?: GroupSelectorOption | null;
  initialLoading?: boolean;
  loading?: boolean;
  error?: string | null;
  onPress: () => void;
  onRetry?: () => void;
  onCreateGroup?: () => void;
}) {
  const showInitialLoading = Boolean(initialLoading);
  const isEmpty = !showInitialLoading && !error && groups.length === 0;

  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        onPress={onPress}
        disabled={showInitialLoading || Boolean(error) || isEmpty}
        style={[
          {
            borderRadius: radii.lg,
            backgroundColor: colors.white,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            padding: layout.cardPadding,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          },
          shadows.cardSoft,
        ]}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Group</Text>
          {showInitialLoading ? (
            <Text style={typography.bodyMedium}>Loading groups…</Text>
          ) : error ? (
            <Text style={[typography.bodyMedium, { color: colors.danger }]}>Could not load groups</Text>
          ) : isEmpty ? (
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>No groups yet</Text>
          ) : selectedGroup ? (
            <>
              <Text style={typography.bodyMedium}>{selectedGroup.name}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {selectedGroup.type} · {selectedGroup.memberCount} members
              </Text>
            </>
          ) : (
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Choose a group</Text>
          )}
        </View>
        {!showInitialLoading && !error && !isEmpty ? (
          <Icon name="chevron-right" size={18} color={colors.textTertiary} />
        ) : null}
      </Pressable>

      {error && onRetry ? (
        <PrimaryButton label="Retry" onPress={onRetry} />
      ) : null}

      {isEmpty && onCreateGroup ? (
        <PrimaryButton label="Create Group" onPress={onCreateGroup} />
      ) : null}
    </View>
  );
}
