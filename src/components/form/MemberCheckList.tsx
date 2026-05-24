import { Pressable, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { Icon } from '../Icon';
import { SeagullAvatar } from '../SeagullAvatar';

export interface MemberCheckItem {
  id: string;
  name: string;
  included: boolean;
}

export function MemberCheckList({
  members,
  onToggle,
}: {
  members: MemberCheckItem[];
  onToggle?: (id: string) => void;
}) {
  return (
    <View>
      {members.map((member, index) => (
        <Pressable
          key={member.id}
          onPress={() => onToggle?.(member.id)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingVertical: 12,
            borderBottomWidth: index < members.length - 1 ? 1 : 0,
            borderBottomColor: colors.borderSubtle,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: member.included ? colors.primary : colors.white,
              borderWidth: member.included ? 0 : 1.5,
              borderColor: colors.borderSubtle,
            }}
          >
            {member.included ? (
              <Icon name="check-circle" size={14} color={colors.white} solid />
            ) : null}
          </View>
          <SeagullAvatar id={member.id} label={member.name} size={36} />
          <Text style={[typography.bodyMedium, { flex: 1 }]}>{member.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}
