import { Pressable, View } from 'react-native';

import { colors, spacing } from '../../theme';
import { Icon } from '../Icon';
import { SeagullAvatar } from '../SeagullAvatar';

export interface AvatarOption {
  id: string;
  label: string;
}

export function AvatarSelectRow({
  options,
  selectedId,
  onSelect,
}: {
  options: AvatarOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      {options.map((option) => {
        const active = selectedId === option.id;
        return (
          <Pressable key={option.id} onPress={() => onSelect(option.id)} style={{ position: 'relative' }}>
            <SeagullAvatar id={option.id} label={option.label} size={44} />
            {active ? (
              <View style={{ position: 'absolute', bottom: -2, right: -2 }}>
                <Icon name="check-circle" size={16} color={colors.primary} solid />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
