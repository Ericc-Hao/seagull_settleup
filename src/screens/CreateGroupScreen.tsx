import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  CREATE_GROUP_MOCK,
  GROUP_TYPE_OPTIONS,
  SETTLEMENT_OPTIONS,
  type SettlementModeOption,
} from '../data/createGroupMock';
import type { GroupType } from '../data/types';
import {
  FormSection,
  Icon,
  PrimaryButton,
  ScreenLayout,
  ScreenPageHeader,
  SeagullAvatar,
} from '../components';
import { colors, layout, radii, spacing, typography } from '../theme';

const SECTION_GAP = 24;

export function CreateGroupScreen() {
  const [name, setName] = useState<string>(CREATE_GROUP_MOCK.defaultName);
  const [groupType, setGroupType] = useState<GroupType>('Trip');
  const [settlementMode, setSettlementMode] = useState<SettlementModeOption>('team');

  return (
    <ScreenLayout
      header={
        <ScreenPageHeader
          title={CREATE_GROUP_MOCK.title}
          subtitle={CREATE_GROUP_MOCK.subtitle}
          onBack={() => router.back()}
        />
      }
      footer={
        <View
          style={{
            paddingHorizontal: layout.screenPadding,
            paddingTop: layout.cardGap,
            paddingBottom: layout.cardGap,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.borderSubtle,
          }}
        >
          <PrimaryButton
            label={CREATE_GROUP_MOCK.ctaLabel}
            onPress={() => router.push('/group/group-banff/add-expense')}
          />
        </View>
      }
    >
      <View style={{ gap: SECTION_GAP }}>
        <FormSection label="Group Name">
          <View style={fieldRowStyle}>
            <TextInput
              value={name}
              onChangeText={setName}
              style={[typography.body, { flex: 1, padding: 0 }]}
              placeholderTextColor={colors.textTertiary}
            />
            {name.length > 0 ? (
              <Pressable onPress={() => setName('')} hitSlop={8}>
                <Icon name="x-mark" size={18} color={colors.textTertiary} strokeWidth={1.5} />
              </Pressable>
            ) : null}
          </View>
        </FormSection>

        <FormSection label="Group Type">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {GROUP_TYPE_OPTIONS.map((option) => {
              const active = groupType === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setGroupType(option.id)}
                  style={{
                    width: '31%',
                    paddingVertical: 12,
                    borderRadius: radii.md,
                    alignItems: 'center',
                    backgroundColor: active ? colors.primary : colors.background,
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      { fontWeight: '600', color: active ? colors.white : colors.textSecondary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormSection>

        <FormSection label="Currency" hint={CREATE_GROUP_MOCK.currencyHint}>
          <View style={[fieldRowStyle, { opacity: 0.85 }]}>
            <Text style={[typography.body, { flex: 1, color: colors.textSecondary }]}>
              {CREATE_GROUP_MOCK.currency}
            </Text>
            <Icon name="lock-closed" size={18} color={colors.textTertiary} strokeWidth={1.5} />
          </View>
        </FormSection>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormSection label="Start Date">
              <View style={fieldRowStyle}>
                <Text style={[typography.body, { flex: 1, fontSize: 14 }]}>{CREATE_GROUP_MOCK.startDate}</Text>
                <Icon name="calendar" size={18} color={colors.textTertiary} strokeWidth={1.5} />
              </View>
            </FormSection>
          </View>
          <View style={{ flex: 1 }}>
            <FormSection label="End Date">
              <View style={fieldRowStyle}>
                <Text style={[typography.body, { flex: 1, fontSize: 14 }]}>{CREATE_GROUP_MOCK.endDate}</Text>
                <Icon name="calendar" size={18} color={colors.textTertiary} strokeWidth={1.5} />
              </View>
            </FormSection>
          </View>
        </View>

        <FormSection label="Settlement Mode" noPadding>
          {SETTLEMENT_OPTIONS.map((option, index) => (
            <SettlementRow
              key={option.id}
              title={option.title}
              description={option.description}
              active={settlementMode === option.id}
              onPress={() => setSettlementMode(option.id)}
              showDivider={index < SETTLEMENT_OPTIONS.length - 1}
            />
          ))}
        </FormSection>

        <FormSection label="Members Preview" hint="Add or invite members in the next step.">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {CREATE_GROUP_MOCK.members.map((id) => (
              <SeagullAvatar key={id} id={id} label={id} size={40} />
            ))}
            <Pressable
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.background,
              }}
            >
              <Icon name="plus" size={20} color={colors.primary} strokeWidth={2} />
            </Pressable>
          </View>
        </FormSection>
      </View>
    </ScreenLayout>
  );
}

const fieldRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: colors.background,
  borderRadius: radii.md,
  paddingHorizontal: spacing.md,
  paddingVertical: 12,
  gap: spacing.sm,
};

function SettlementRow({
  title,
  description,
  active,
  onPress,
  showDivider,
}: {
  title: string;
  description: string;
  active: boolean;
  onPress: () => void;
  showDivider: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: colors.borderSubtle,
        backgroundColor: active ? '#F7F8FF' : colors.white,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={typography.bodyMedium}>{title}</Text>
          <Text style={[typography.caption, { marginTop: 2 }]}>{description}</Text>
        </View>
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 1.5,
            borderColor: active ? colors.primary : colors.borderSubtle,
            backgroundColor: active ? colors.primary : colors.white,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {active ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white }} /> : null}
        </View>
      </View>
    </Pressable>
  );
}
