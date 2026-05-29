import type { ReactNode } from 'react';
import { Children, Fragment, isValidElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppLogo, ScreenLayout } from '../../components';
import { ShadowSurface } from '../../components/layout/ShadowSurface';
import { colors, layout, radii, spacing, typography } from '../../theme';
import { authNoticeContainerStyle } from './authScreenStyles';

function flattenAuthChildren(children: ReactNode): ReactNode[] {
  const items: ReactNode[] = [];

  Children.forEach(children, (child) => {
    if (child == null || child === false) {
      return;
    }

    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) {
      items.push(...flattenAuthChildren(child.props.children));
      return;
    }

    items.push(child);
  });

  return items;
}

function AuthForm({ children }: { children: ReactNode }) {
  const items = flattenAuthChildren(children);

  return (
    <View style={{ width: '100%', alignSelf: 'stretch' }}>
      {items.map((child, index) => (
        <View
          key={index}
          style={{
            width: '100%',
            alignSelf: 'stretch',
            marginTop: index > 0 ? spacing.md : 0,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

export function AuthFormShell({
  title,
  subtitle,
  children,
  scroll = true,
  compact = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  scroll?: boolean;
  compact?: boolean;
}) {
  return (
    <ScreenLayout
      scroll={scroll}
      keyboardAvoiding
      bottomTabPadding={false}
      scrollBottomPadding={compact ? spacing['3xl'] + 48 : spacing['4xl'] + 48}
      contentStyle={{
        flexGrow: 1,
        alignSelf: 'stretch',
        ...(compact ? { justifyContent: 'center' } : {}),
      }}
    >
      <View style={{ alignSelf: 'stretch', paddingTop: compact ? spacing.md : spacing.lg }}>
        <View style={{ alignItems: 'center' }}>
          <AppLogo size={72} />
          <View style={{ marginTop: spacing.md, alignItems: 'center', maxWidth: 320 }}>
            <Text style={[typography.largeTitle, { textAlign: 'center' }]}>{title}</Text>
            <Text style={[typography.subtitle, { textAlign: 'center', marginTop: spacing.xs }]}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <ShadowSurface
            shadow="card"
            borderRadius={radii['2xl']}
            style={{ alignSelf: 'stretch' }}
            innerStyle={{ padding: layout.cardPadding }}
          >
            <AuthForm>{children}</AuthForm>
          </ShadowSurface>
        </View>
      </View>
    </ScreenLayout>
  );
}

export function AuthLink({ text, action, onPress }: { text: string; action: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', paddingVertical: spacing.xs }}>
      <Text style={[typography.caption, { textAlign: 'center' }]}>
        {text} <Text style={{ color: colors.primary, fontWeight: '700' }}>{action}</Text>
      </Text>
    </Pressable>
  );
}

export function ForgotPasswordLink({ onPress }: { onPress: () => void }) {
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Pressable onPress={onPress} hitSlop={8} style={{ paddingVertical: spacing.xs }}>
        <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
          Forgot password?
        </Text>
      </Pressable>
    </View>
  );
}

export function AuthNoticeText({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <Pressable onPress={onDismiss} style={authNoticeContainerStyle}>
      <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>{message}</Text>
    </Pressable>
  );
}
