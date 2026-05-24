import { Pressable, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '../../theme';
import { Icon } from '../Icon';
import { SeagullAvatar } from '../SeagullAvatar';

export interface TeamOption {
  id: string;
  name: string;
  memberIds: readonly string[];
}

export function TeamSelectCard({
  team,
  selected,
  onPress,
}: {
  team: TeamOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.lg,
        backgroundColor: colors.white,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.primary : colors.borderSubtle,
        ...shadows.cardSoft,
      }}
    >
      {selected ? (
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <Icon name="check-circle" size={16} color={colors.primary} solid />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {team.memberIds.map((id) => (
          <SeagullAvatar key={id} id={id} label={id} size={34} />
        ))}
      </View>
      <Text style={[typography.bodyMedium, { marginTop: spacing.sm, fontSize: 14 }]}>{team.name}</Text>
    </Pressable>
  );
}
