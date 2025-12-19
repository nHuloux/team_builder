
import { Group, User, Member, TOTAL_GROUPS, ClassType, QUOTAS, AppConfig, DEFAULT_CORE_TEAM_DEADLINE, DEFAULT_CONSOLIDATION_DEADLINE, DEFAULT_LEADER_LOCK_DATE, DEFAULT_CHALLENGE_START, Story, DBStory } from '../types';
import { supabase } from './supabaseClient';

const STORAGE_KEY_CURRENT_USER = 'teambuilder_current_user';

// --- Helper Functions ---

const hashPassword = async (password: string): Promise<string> => {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("HTTPS requis pour le chiffrement.");
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const normalizeClassType = (raw: string): ClassType => {
  if (!raw) return ClassType.INGENIEUR;
  const normalized = raw.trim().toLowerCase();
  if (normalized.includes('mind')) return ClassType.MIND;
  if (normalized.includes('clic')) return ClassType.CLIC;
  return ClassType.INGENIEUR;
};

export const fetchGroups = async (): Promise<Group[]> => {
  try {
    const { data: members, error: mError } = await supabase.rpc('get_project_members');
    if (mError) throw mError;

    const { data: config, error: cError } = await supabase.rpc('get_all_challenge_config');

    const groups: Group[] = Array.from({ length: TOTAL_GROUPS }, (_, i) => ({
      id: i + 1,
      name: `Groupe ${i + 1}`,
      members: [],
      bonusCompleted: false,
      manifesto: ''
    }));

    (members || []).forEach((u: any) => {
      if (u.group_id > 0 && u.group_id <= TOTAL_GROUPS) {
        groups[u.group_id - 1].members.push({
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          classType: normalizeClassType(u.class_type),
          groupId: u.group_id,
          isLeader: Boolean(u.is_leader) // Forced conversion to boolean
        });
      }
    });

    (config || []).forEach((row: any) => {
      if (row.key.startsWith('GROUP_NAME_')) {
        const id = parseInt(row.key.replace('GROUP_NAME_', ''));
        if (groups[id - 1]) groups[id - 1].name = row.value;
      } else if (row.key.startsWith('GROUP_MANIFESTO_')) {
        const id = parseInt(row.key.replace('GROUP_MANIFESTO_', ''));
        if (groups[id - 1]) groups[id - 1].manifesto = row.value;
      } else if (row.key.startsWith('GROUP_BONUS_PROGRESS_')) {
        const id = parseInt(row.key.replace('GROUP_BONUS_PROGRESS_', ''));
        try {
          const solvedIds = JSON.parse(row.value);
          if (Array.isArray(solvedIds) && solvedIds.length >= 20) {
            if (groups[id - 1]) groups[id - 1].bonusCompleted = true;
          }
        } catch (e) {
          console.error("Error parsing bonus progress for group", id, e);
        }
      }
    });

    return groups;
  } catch (error: any) {
    console.error("fetchGroups error:", error.message || error);
    return [];
  }
};

export const loginAndCheckUser = async (userCandidate: User, passwordRaw: string): Promise<User> => {
  const generatedId = `${userCandidate.firstName.trim().toLowerCase()}-${userCandidate.lastName.trim().toLowerCase()}`;
  const hashedPassword = await hashPassword(passwordRaw.trim());

  const { data, error } = await supabase.rpc('login_or_register_user', {
    p_id: generatedId,
    p_first_name: userCandidate.firstName.trim(),
    p_last_name: userCandidate.lastName.trim(),
    p_class_type: userCandidate.classType,
    p_password: hashedPassword,
    p_password_plain: passwordRaw.trim()
  });

  if (error) {
    console.error("Login RPC Error:", error);
    if (error.message.includes('Mot de passe incorrect')) throw new Error('Mot de passe incorrect');
    throw new Error(`Erreur de connexion: ${error.message} (Hint: Check .env.local and RPC signature)`);
  }

  if (!data || data.length === 0) throw new Error("Réponse serveur invalide.");

  const user: User = {
    id: data[0].id,
    firstName: data[0].first_name,
    lastName: data[0].last_name,
    classType: normalizeClassType(data[0].class_type),
    groupId: data[0].group_id,
    isLeader: Boolean(data[0].is_leader)
  };

  localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
  return user;
};

export const joinGroup = async (userId: string, groupId: number): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('join_team', { p_user_id: userId, p_group_id: groupId });
    if (!error) {
      const user = getCurrentUser();
      if (user) {
        user.groupId = groupId;
        user.isLeader = false;
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
      }
    }
    return !error;
  } catch { return false; }
};

export const leaveGroup = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('leave_team', { p_user_id: userId });
    if (!error) {
      const user = getCurrentUser();
      if (user) {
        user.groupId = null;
        user.isLeader = false;
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
      }
    }
    return !error;
  } catch { return false; }
};

export const updateGroupName = async (groupId: number, name: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('update_group_name', { p_group_id: groupId, p_name: name });
    return !error;
  } catch { return false; }
};

export const updateGroupManifesto = async (groupId: number, manifesto: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('challenge_config').upsert({
      key: `GROUP_MANIFESTO_${groupId}`,
      value: manifesto
    });
    return !error;
  } catch { return false; }
};

export const assignLeader = async (groupId: number, memberId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('assign_team_leader', {
      p_group_id: groupId,
      p_leader_id: memberId
    });

    if (error) {
      console.error("RPC assign_team_leader error:", error.message);
      return false;
    }

    // Immediately update local storage to reflect the change for the current user
    const user = getCurrentUser();
    if (user && user.groupId === groupId) {
      user.isLeader = (user.id === memberId);
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
    }

    return true;
  } catch (err) {
    console.error("assignLeader exception:", err);
    return false;
  }
};

export const logoutUser = () => localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
  return data ? JSON.parse(data) : null;
};

export const fetchAppConfig = async (): Promise<AppConfig> => {
  try {
    const { data } = await supabase.rpc('get_all_challenge_config');
    const config: any = {};
    (data || []).forEach((row: any) => {
      if (row.key === 'CORE_TEAM_DEADLINE') config.coreTeamDeadline = new Date(row.value);
      if (row.key === 'CONSOLIDATION_DEADLINE') config.consolidationDeadline = new Date(row.value);
      if (row.key === 'LEADER_LOCK_DATE') config.leaderLockDate = new Date(row.value);
      if (row.key === 'CHALLENGE_START') config.challengeStart = new Date(row.value);
    });
    return {
      coreTeamDeadline: config.coreTeamDeadline || DEFAULT_CORE_TEAM_DEADLINE,
      consolidationDeadline: config.consolidationDeadline || DEFAULT_CONSOLIDATION_DEADLINE,
      leaderLockDate: config.leaderLockDate || DEFAULT_LEADER_LOCK_DATE,
      challengeStart: config.challengeStart || DEFAULT_CHALLENGE_START
    };
  } catch {
    return { coreTeamDeadline: DEFAULT_CORE_TEAM_DEADLINE, consolidationDeadline: DEFAULT_CONSOLIDATION_DEADLINE, leaderLockDate: DEFAULT_LEADER_LOCK_DATE, challengeStart: DEFAULT_CHALLENGE_START };
  }
};

export const canJoinGroup = (groups: Group[], groupId: number, userClass: ClassType): { allowed: boolean; reason?: string } => {
  const group = groups.find(g => g.id === groupId);
  if (!group) return { allowed: false, reason: 'Groupe non trouvé' };
  const currentClassCount = group.members.filter(m => m.classType === userClass).length;
  const requiredClassCount = QUOTAS[userClass];
  if (currentClassCount < requiredClassCount) return { allowed: true };
  const allGroupsMeetClassRequirement = groups.every(g => g.members.filter(m => m.classType === userClass).length >= requiredClassCount);
  if (!allGroupsMeetClassRequirement) return { allowed: false, reason: `Quotas prioritaires : chaque groupe doit avoir ${requiredClassCount} ${userClass}(s).` };
  if (group.members.length >= 9) {
    if (!groups.every(g => g.members.length >= 9)) return { allowed: false, reason: 'Ce groupe est plein. Complétez les autres équipes.' };
  }
  return { allowed: true };
};

export const getDailyStoryId = (): number => {
  const start = new Date('2025-03-01T00:00:00').getTime();
  const now = new Date().getTime();
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return (Math.max(0, diffDays) % 20) + 1;
};

export const fetchStory = async (id: number, isSurferMode: boolean): Promise<Story | null> => {
  try {
    const dailyId = getDailyStoryId();
    if (!isSurferMode && id !== dailyId) return null;
    const { data, error } = await supabase.from('stories').select('*').eq('id', id).single();
    if (error || !data) throw error;
    const dbStory = data as DBStory;
    return {
      id: dbStory.id, title: dbStory.title, intro: dbStory.intro,
      options: [
        { text: dbStory.opt1_text, outcome: dbStory.opt1_outcome, emoji: dbStory.opt1_emoji },
        { text: dbStory.opt2_text, outcome: dbStory.opt2_outcome, emoji: dbStory.opt2_emoji }
      ]
    };
  } catch { return null; }
};

export const getGroupBonusProgress = async (groupId: number): Promise<number[]> => {
  try {
    const { data } = await supabase.from('group_progress').select('solved_ids').eq('group_id', groupId).maybeSingle();
    return data?.solved_ids || [];
  } catch { return []; }
};

export const saveGroupBonusProgress = async (groupId: number, solvedIds: number[]): Promise<boolean> => {
  try {
    const { error } = await supabase.from('group_progress').upsert({ group_id: groupId, solved_ids: solvedIds });
    return !error;
  } catch { return false; }
};

export const getBonusWinner = async (): Promise<number | null> => {
  try {
    const { data } = await supabase.from('challenge_config').select('value').eq('key', 'BONUS_WINNER_GROUP_ID').maybeSingle();
    return data ? parseInt(data.value) : null;
  } catch { return null; }
};

export const claimBonusVictory = async (groupId: number): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('claim_bonus_booster', { p_group_id: groupId });
    return !!data && !error;
  } catch { return false; }
};

export const fetchSolvedTitles = async (solvedIds: number[]): Promise<{ id: number, title: string }[]> => {
  if (!solvedIds || solvedIds.length === 0) return [];
  try {
    const { data } = await supabase.from('stories').select('id, title').in('id', solvedIds);
    return data || [];
  } catch { return []; }
};

export const validateTitles = async (guesses: { id: number, title: string }[]): Promise<{ id: number, is_correct: boolean }[]> => {
  try {
    const { data, error } = await supabase.rpc('validate_story_titles', { p_guesses: guesses });
    if (error) throw error;
    return data || guesses.map(g => ({ id: g.id, is_correct: false }));
  } catch { return guesses.map(g => ({ id: g.id, is_correct: false })); }
};
