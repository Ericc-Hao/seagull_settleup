import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { FormSection, PrimaryButton, ScreenLayout, ScreenPageHeader, SecondaryButton } from '../components';
import { DateField, FormInput } from '../components/form';
import { GroupTypeSelector } from '../components/groups';
import { useAppData } from '../context/AppDataContext';
import { getGroupById, updateGroupDetails } from '../services/groupService';
import type { GroupType } from '../types/models';
import { formatDateForSupabase, isEndDateValid, parseSupabaseDate } from '../utils/date';
import { toUserFriendlyError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { colors, layout, spacing, typography } from '../theme';
import { safeBack } from '../utils/navigation';

const logger = createLogger('EditGroupScreen');

interface EditGroupScreenProps {
  groupId: string;
}

export function EditGroupScreen({ groupId }: EditGroupScreenProps) {
  const { version, refresh } = useAppData();
  const group = useMemo(() => getGroupById(groupId), [groupId, version]);

  const [name, setName] = useState(group?.name ?? '');
  const [groupType, setGroupType] = useState<GroupType>(group?.type ?? 'Trip');
  const [startDate, setStartDate] = useState(group?.startDate ?? formatDateForSupabase(new Date()));
  const [endDate, setEndDate] = useState(group?.endDate ?? '');
  const [dateError, setDateError] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!group) {
      return;
    }
    setName(group.name);
    setGroupType(group.type);
    setStartDate(group.startDate);
    setEndDate(group.endDate ?? '');
  }, [group?.id, group?.name, group?.type, group?.startDate, group?.endDate]);

  const validateDates = (start: string, end: string) => {
    if (!start) {
      return 'Start date is required.';
    }
    if (end && !isEndDateValid(start, end)) {
      return 'End date cannot be before start date.';
    }
    return undefined;
  };

  const save = async () => {
    if (!group) {
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Group name is required.');
      return;
    }
    const nextDateError = validateDates(startDate, endDate);
    if (nextDateError) {
      setDateError(nextDateError);
      return;
    }

    setSaving(true);
    setError(undefined);
    logger.info('Update group details submit started', { groupId });
    try {
      await updateGroupDetails(groupId, {
        name: trimmedName,
        type: groupType,
        startDate,
        endDate: endDate || null,
      });
      await refresh();
      logger.info('Update group details submit succeeded', { groupId });
      router.back();
    } catch (err) {
      logger.error('Update group details submit failed', err, { groupId });
      setError(toUserFriendlyError(err, 'Could not update the group. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (!group) {
    return (
      <ScreenLayout
        header={
          <ScreenPageHeader title="Edit Group" subtitle="Group not found." onBack={() => safeBack(`/group/${groupId}`)} />
        }
      >
        <Text style={[typography.body, { color: colors.textSecondary }]}>This group could not be loaded.</Text>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      header={
        <ScreenPageHeader
          title="Edit Group Details"
          subtitle={group.name}
          onBack={() => safeBack(`/group/${groupId}`)}
          showMascot={false}
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
            gap: spacing.sm,
          }}
        >
          {error ? <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>{error}</Text> : null}
          <PrimaryButton label={saving ? 'Saving...' : 'Save Changes'} onPress={() => void save()} disabled={saving} />
          <SecondaryButton label="Cancel" variant="outline" onPress={() => safeBack(`/group/${groupId}`)} />
        </View>
      }
    >
      <View style={{ gap: spacing.lg }}>
        <FormSection label="Group Name">
          <FormInput value={name} onChangeText={setName} placeholder="Group name" />
        </FormSection>

        <FormSection label="Group Type">
          <GroupTypeSelector value={groupType} onChange={setGroupType} />
        </FormSection>

        <FormSection label="Dates">
          <View style={{ gap: spacing.md }}>
            <DateField label="Start Date" value={startDate} onChange={setStartDate} />
            <DateField
              label="End Date (Optional)"
              value={endDate}
              onChange={(value) => {
                setEndDate(value);
                setDateError(validateDates(startDate, value));
              }}
              optional
              clearable
              placeholder="No end date"
              minimumDate={startDate ? parseSupabaseDate(startDate) : undefined}
            />
            {dateError ? <Text style={[typography.caption, { color: colors.danger }]}>{dateError}</Text> : null}
          </View>
        </FormSection>
      </View>
    </ScreenLayout>
  );
}
