import { Pressable, Text, View } from 'react-native';

import { colors, layout, typography } from '../../theme';
import { Icon } from '../Icon';
import { SeagullAvatar, SeagullMascot } from '../SeagullAvatar';

type TabPageHeaderProps =
  | {
      variant: 'home';
      greeting: string;
      subtitle: string;
      userId?: string;
      userName?: string;
      onNotificationPress?: () => void;
    }
  | {
      variant: 'tab';
      title: string;
      subtitle?: string;
      showAvatar?: boolean;
      userId?: string;
      userName?: string;
    };

export function TabPageHeader(props: TabPageHeaderProps) {
  return (
    <View
      style={{
        paddingHorizontal: layout.screenPadding,
        paddingTop: layout.headerTopPadding,
        paddingBottom: layout.headerBottomPadding,
      }}
    >
      {props.variant === 'home' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <SeagullMascot size={48} />
          <View style={{ flex: 1, marginLeft: 14, paddingRight: 8 }}>
            <Text style={[typography.title, { fontSize: 20, lineHeight: 26 }]} numberOfLines={2}>
              {props.greeting}
            </Text>
            <Text style={[typography.subtitle, { marginTop: 4, lineHeight: 20 }]} numberOfLines={2}>
              {props.subtitle}
            </Text>
          </View>
          <Pressable
            onPress={props.onNotificationPress}
            hitSlop={12}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.white,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 0,
            }}
          >
            <Icon name="bell" size={20} color={colors.textPrimary} strokeWidth={1.5} />
            <View
              style={{
                position: 'absolute',
                top: 9,
                right: 9,
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: colors.danger,
              }}
            />
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={typography.title}>{props.title}</Text>
            {props.subtitle ? (
              <Text style={[typography.subtitle, { marginTop: 4, lineHeight: 20 }]}>{props.subtitle}</Text>
            ) : null}
          </View>
          {props.showAvatar && props.userId && props.userName ? (
            <SeagullAvatar id={props.userId} label={props.userName} size={52} />
          ) : (
            <SeagullMascot size={48} />
          )}
        </View>
      )}
    </View>
  );
}
