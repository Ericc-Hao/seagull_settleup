import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { useAppData } from '../../context/AppDataContext';
import { INACTIVE_GROUP_MUTATION_MESSAGE } from '../../services/groupAccess';
import {
  getCurrentUserId,
  getGroupById,
  reactivateGroup,
} from '../../services/groupService';
import { colors, spacing, typography } from '../../theme';
import { toUserFriendlyError } from '../../utils/errors';
import { createLogger } from '../../utils/logger';
import { invalidateAfterReactivateGroup } from '../../utils/mutationInvalidation';
import { PrimaryButton } from '../PrimaryButton';
import { ScreenLayout } from '../ScreenLayout';
import { ScreenPageHeader } from '../home/ScreenPageHeader';
import { SecondaryButton } from '../SecondaryButton';
import { ReactivateGroupModal } from './GroupSettingsModals';

const logger = createLogger('InactiveGroupMutationBlock');

export function InactiveGroupMutationBlock({
  groupId,
  title,
}: {
  groupId: string;
  title: string;
}) {
  const { invalidate, versions, getGroupDetailVersion } = useAppData();
  const groupDetailVersion = getGroupDetailVersion(groupId);
  const group = useMemo(
    () => getGroupById(groupId),
    [groupId, versions.groups, groupDetailVersion],
  );
  const userId = getCurrentUserId();
  const canReactivate = group?.ownerId === userId;
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const backToGroup = () => {
    router.replace(`/group/${groupId}`);
  };

  const handleReactivate = async () => {
    setReactivating(true);
    setError(undefined);
    logger.info('Reactivate group from mutation block started', { groupId });
    try {
      await reactivateGroup(groupId);
      invalidateAfterReactivateGroup(invalidate, groupId);
      setShowReactivateModal(false);
      logger.info('Reactivate group from mutation block succeeded', { groupId });
      router.replace(`/group/${groupId}`);
    } catch (err) {
      logger.error('Reactivate group from mutation block failed', err, { groupId });
      setError(toUserFriendlyError(err, 'Unable to reactivate group.'));
    } finally {
      setReactivating(false);
    }
  };

  return (
    <>
      <ScreenLayout
        header={
          <ScreenPageHeader
            title={title}
            subtitle={group?.name}
            onBack={backToGroup}
            showMascot={false}
          />
        }
      >
        <View style={{ gap: spacing.lg }}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {INACTIVE_GROUP_MUTATION_MESSAGE}
          </Text>
          {error ? (
            <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>
              {error}
            </Text>
          ) : null}
          <PrimaryButton label="Back to Group" onPress={backToGroup} />
          {canReactivate ? (
            <SecondaryButton
              label="Reactivate Group"
              variant="outline"
              onPress={() => setShowReactivateModal(true)}
            />
          ) : null}
        </View>
      </ScreenLayout>

      <ReactivateGroupModal
        visible={showReactivateModal}
        loading={reactivating}
        onCancel={() => {
          if (!reactivating) {
            setShowReactivateModal(false);
          }
        }}
        onConfirm={() => {
          void handleReactivate();
        }}
      />
    </>
  );
}
