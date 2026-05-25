import { createElement, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

import {
  formatDateForDisplay,
  formatDateForSupabase,
  parseSupabaseDate,
} from '../../utils/date';
import { colors, radii, spacing, typography } from '../../theme';
import { Icon } from '../Icon';

type NativeDateTimePicker = typeof import('@react-native-community/datetimepicker').default;
type NativeDateTimePickerEvent = import('@react-native-community/datetimepicker').DateTimePickerEvent;

const NativeDateTimePicker: NativeDateTimePicker | null =
  Platform.OS === 'web' ? null : require('@react-native-community/datetimepicker').default;

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  error,
  placeholder = 'Select date',
  optional = false,
  clearable = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  error?: string;
  placeholder?: string;
  optional?: boolean;
  clearable?: boolean;
}) {
  const selectedDate = value ? parseSupabaseDate(value) : null;
  const displayText = selectedDate ? formatDateForDisplay(selectedDate) : placeholder;
  const canClear = (optional || clearable) && Boolean(value);

  return (
    <View style={{ gap: spacing.xs, flex: 1 }}>
      {label ? (
        <Text style={[typography.sectionTitle, { paddingHorizontal: 2 }]}>{label}</Text>
      ) : null}

      {Platform.OS === 'web' ? (
        <WebDateInput
          value={value}
          onChange={onChange}
          minimumDate={minimumDate}
          displayText={displayText}
          hasValue={Boolean(selectedDate)}
          canClear={canClear}
        />
      ) : (
        <NativeDateInput
          value={value}
          onChange={onChange}
          minimumDate={minimumDate}
          displayText={displayText}
          hasValue={Boolean(selectedDate)}
          canClear={canClear}
        />
      )}

      {error ? (
        <Text style={[typography.caption, { color: colors.danger, paddingHorizontal: 2 }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function WebDateInput({
  value,
  onChange,
  minimumDate,
  displayText,
  hasValue,
  canClear,
}: {
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  displayText: string;
  hasValue: boolean;
  canClear: boolean;
}) {
  return (
    <View style={fieldRowStyle}>
      {createElement('input', {
        type: 'date',
        value: value || '',
        min: minimumDate ? formatDateForSupabase(minimumDate) : undefined,
        onChange: (event: Event) => {
          const nextValue = (event.target as HTMLInputElement).value;
          onChange(nextValue);
        },
        style: {
          flex: 1,
          border: 'none',
          outline: 'none',
          backgroundColor: 'transparent',
          fontSize: 14,
          color: hasValue ? colors.textPrimary : colors.textTertiary,
          fontFamily: 'inherit',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
        },
        'aria-label': displayText,
      })}
      {canClear ? (
        <Pressable onPress={() => onChange('')} hitSlop={8}>
          <Icon name="x-mark" size={16} color={colors.textTertiary} strokeWidth={1.5} />
        </Pressable>
      ) : null}
      <Icon name="calendar" size={18} color={colors.textTertiary} strokeWidth={1.5} />
    </View>
  );
}

function NativeDateInput({
  value,
  onChange,
  minimumDate,
  displayText,
  hasValue,
  canClear,
}: {
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  displayText: string;
  hasValue: boolean;
  canClear: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() =>
    value ? parseSupabaseDate(value) : new Date(),
  );

  const openPicker = () => {
    setPickerDate(value ? parseSupabaseDate(value) : new Date());
    setShowPicker(true);
  };

  const closePicker = () => {
    setShowPicker(false);
  };

  const handleChange = (event: NativeDateTimePickerEvent, nextDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed' || !nextDate) {
      return;
    }
    setPickerDate(nextDate);
    onChange(formatDateForSupabase(nextDate));
  };

  if (!NativeDateTimePicker) {
    return null;
  }

  const Picker = NativeDateTimePicker;

  return (
    <>
      <Pressable onPress={openPicker} style={fieldRowStyle}>
        <Text
          style={[
            typography.body,
            {
              flex: 1,
              fontSize: 14,
              color: hasValue ? colors.textPrimary : colors.textTertiary,
            },
          ]}
        >
          {displayText}
        </Text>
        {canClear ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onChange('');
            }}
            hitSlop={8}
          >
            <Icon name="x-mark" size={16} color={colors.textTertiary} strokeWidth={1.5} />
          </Pressable>
        ) : null}
        <Icon name="calendar" size={18} color={colors.textTertiary} strokeWidth={1.5} />
      </Pressable>

      {showPicker && Platform.OS === 'android' ? (
        <Picker
          value={pickerDate}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      ) : null}

      {showPicker && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide" onRequestClose={closePicker}>
          <Pressable
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: 'rgba(28, 35, 64, 0.35)',
            }}
            onPress={closePicker}
          >
            <Pressable
              style={{
                backgroundColor: colors.white,
                borderTopLeftRadius: radii.xl,
                borderTopRightRadius: radii.xl,
                paddingBottom: spacing.lg,
              }}
              onPress={(event) => event.stopPropagation()}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  paddingHorizontal: spacing.lg,
                  paddingTop: spacing.md,
                  paddingBottom: spacing.sm,
                }}
              >
                <Pressable onPress={closePicker} hitSlop={8}>
                  <Text style={[typography.bodyMedium, { color: colors.primary }]}>Done</Text>
                </Pressable>
              </View>
              <Picker
                value={pickerDate}
                mode="date"
                display="spinner"
                minimumDate={minimumDate}
                onChange={handleChange}
                themeVariant="light"
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
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
