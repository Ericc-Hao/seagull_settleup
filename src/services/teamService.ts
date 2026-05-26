import { mapTeam } from '../lib/mappers';
import { supabase } from '../lib/supabase';
import type { Team } from '../types/models';
import { readDb } from './dbHelpers';

export function getTeamsByGroup(groupId: string): Team[] {
  return readDb().teams.filter((team) => team.groupId === groupId);
}

export async function createTeam(input: {
  groupId: string;
  name: string;
  receiverMemberId?: string;
  memberIds?: string[];
}): Promise<Team> {
  const { data, error } = await supabase.from('teams').insert({
    group_id: input.groupId,
    name: input.name,
    receiver_member_id: input.receiverMemberId ?? null,
  }).select('*').single();

  if (error) {
    throw error;
  }

  const team = mapTeam(data);
  if (input.memberIds?.length) {
    const { error: membersError } = await supabase.from('team_members').insert(
      input.memberIds.map((memberId) => ({
        team_id: team.id,
        member_id: memberId,
      })),
    );
    if (membersError) {
      throw membersError;
    }
  }

  return team;
}

export async function deleteTeam(teamId: string): Promise<void> {
  const { error } = await supabase.from('teams').delete().eq('id', teamId);
  if (error) {
    throw error;
  }
}
