import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { colors, layout, radii, spacing, typography } from '../../theme';
import { Icon } from '../Icon';
import { PrimaryButton } from '../PrimaryButton';
import type { GroupSelectorOption } from '../../types/views';

export function GroupSelectModal({
  visible,
  groups,
  selectedGroupId,
  onSelect,
  onClose,
  onCreateGroup,
}: {
  visible: boolean;
  groups: GroupSelectorOption[];
  selectedGroupId?: string;
  onSelect: (groupId: string) => void;
  onClose: () => void;
  onCreateGroup?: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(28, 35, 64, 0.4)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: radii['2xl'],
            borderTopRightRadius: radii['2xl'],
            paddingTop: spacing.md,
            paddingBottom: layout.cardGap,
            paddingHorizontal: layout.screenPadding,
            maxHeight: '80%',
            gap: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={typography.title}>Select Group</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="x-mark" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {groups.length === 0 ? (
            <View style={{ gap: spacing.md, paddingVertical: spacing.lg, alignItems: 'center' }}>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                No groups yet
              </Text>
              {onCreateGroup ? <PrimaryButton label="Create Group" onPress={onCreateGroup} /> : null}
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ gap: spacing.sm }}>
              {groups.map((group) => {
                const selected = group.id === selectedGroupId;
                return (
                  <Pressable
                    key={group.id}
                    onPress={() => {
                      onSelect(group.id);
                      onClose();
                    }}
                    style={{
                      padding: layout.cardPadding,
                      borderRadius: radii.lg,
                      backgroundColor: selected ? colors.tertiary : colors.background,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.borderSubtle,
                      gap: 4,
                    }}
                  >
                    <Text style={typography.bodyMedium}>{group.name}</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {group.type} · {group.memberCount} members
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
