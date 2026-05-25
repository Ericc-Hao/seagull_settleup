import { Pressable, Text, View } from 'react-native';

import type { Group } from '../../types/models';
import { colors, layout, typography } from '../../theme';
import { Icon } from '../Icon';

export function GroupHeader({
  group,
  subtitle,
  onBack,
  onOpenSettings,
  showSettings = true,
}: {
  group: Group;
  subtitle: string;
  onBack: () => void;
  onOpenSettings?: () => void;
  showSettings?: boolean;
}) {
  return (
    <View
      style={{
        paddingHorizontal: layout.screenPadding,
        paddingTop: layout.headerTopPadding,
        paddingBottom: layout.headerBottomPadding,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.white,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Icon name="chevron-left" size={22} color={colors.textPrimary} strokeWidth={1.5} />
        </Pressable>

        <View style={{ flex: 1, paddingTop: 4, paddingRight: 12 }}>
          <Text style={typography.title}>{group.name}</Text>
          <Text style={[typography.caption, { marginTop: 4, lineHeight: 18 }]}>{subtitle}</Text>
        </View>

        {showSettings && onOpenSettings ? (
          <Pressable
            onPress={onOpenSettings}
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.white,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="cog-6-tooth" size={22} color={colors.textPrimary} strokeWidth={1.5} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>
    </View>
  );
}
