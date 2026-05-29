import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors, layout, typography } from '../../theme';
import { Icon } from '../Icon';
import { SeagullMascot } from '../SeagullAvatar';

export function ScreenPageHeader({
  title,
  subtitle,
  onBack,
  showMascot = false,
  rightAction,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  showMascot?: boolean;
  rightAction?: ReactNode;
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
          <Text style={typography.title}>{title}</Text>
          {subtitle ? (
            <Text style={[typography.caption, { marginTop: 4, lineHeight: 18 }]}>{subtitle}</Text>
          ) : null}
        </View>

        {showMascot ? <SeagullMascot size={52} /> : rightAction ?? <View style={{ width: 52 }} />}
      </View>
    </View>
  );
}
