
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

// FETCH GROUPS
export const fetchGroups = async (): Promise<Group[]> => {
  try {
    const { data: members, error: mError } = await supabase.rpc('get_project_members');
    if (mError) throw mError;

    const { data: config, error: cError } = await supabase.rpc('get_all_challenge_config');
    
    const groups: Group[] = Array.from({ length: TOTAL_GROUPS }, (_, i) => ({
      id: i + 1,
      name: `Groupe ${i + 1}`,
      members: [],
      bonusCompleted: false
    }));

    (members || []).forEach((u: any) => {
      if (u.group_id > 0 && u.group_id <= TOTAL_GROUPS) {
        groups[u.group_id - 1].members.push({
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          classType: normalizeClassType(u.class_type),
          groupId: u.group_id,
          isLeader: u.is_leader || false
        });
      }
    });

    (config || []).forEach((row: any) => {
      if (row.key.startsWith('GROUP_NAME_')) {
        const id = parseInt(row.key.replace('GROUP_NAME_', ''));
        if (groups[id - 1]) groups[id - 1].name = row.value;
      }
    });

    return groups;
  } catch (error: any) {
    console.error("fetchGroups error:", error.message || error);
    return [];
  }
};

// LOGIN
export const loginAndCheckUser = async (userCandidate: User, passwordRaw: string): Promise<User> => {
  const generatedId = `${userCandidate.firstName.trim().toLowerCase()}-${userCandidate.lastName.trim().toLowerCase()}`;
  const hashedPassword = await hashPassword(passwordRaw.trim());
  
  const { data, error } = await supabase.rpc('login_or_register_user', {
    p_id: generatedId,
    p_first_name: userCandidate.firstName.trim(),
    p_last_name: userCandidate.lastName.trim(),
    p_class_type: userCandidate.classType,
    p_password_hash: hashedPassword,
    p_password_plain: passwordRaw.trim()
  });

  if (error) {
    console.error("Login RPC Error:", error.message);
    throw new Error(error.message === 'Mot de passe incorrect' ? error.message : "Erreur de base de données. Vérifiez l'installation des fonctions SQL.");
  }

  const user: User = {
    id: data[0].id,
    firstName: data[0].first_name,
    lastName: data[0].last_name,
    classType: normalizeClassType(data[0].class_type),
    groupId: data[0].group_id,
    isLeader: data[0].is_leader
  };
  
  localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
  return user;
};

// JOIN GROUP
export const joinGroup = async (userId: string, groupId: number): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('join_team', {
      p_user_id: userId,
      p_group_id: groupId
    });

    if (error) {
      console.error("joinGroup RPC Error:", error.message || JSON.stringify(error));
      return false;
    }
    return true;
  } catch (error: any) {
    console.error("joinGroup exception:", error.message || error);
    return false;
  }
};

// LEAVE GROUP
export const leaveGroup = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('leave_team', { p_user_id: userId });
    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error("leaveGroup error:", error.message || error);
    return false;
  }
};

export const updateGroupName = async (groupId: number, name: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('update_group_name', { p_group_id: groupId, p_name: name });
    return !error;
  } catch { return false; }
};

export const assignLeader = async (groupId: number, memberId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('assign_team_leader', { p_group_id: groupId, p_leader_id: memberId });
    return !error;
  } catch { return false; }
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

export const updateAppConfig = async (config: AppConfig): Promise<boolean> => {
  try {
    await supabase.from('challenge_config').upsert({ key: 'CORE_TEAM_DEADLINE', value: config.coreTeamDeadline.toISOString() });
    await supabase.from('challenge_config').upsert({ key: 'CONSOLIDATION_DEADLINE', value: config.consolidationDeadline.toISOString() });
    await supabase.from('challenge_config').upsert({ key: 'LEADER_LOCK_DATE', value: config.leaderLockDate.toISOString() });
    await supabase.from('challenge_config').upsert({ key: 'CHALLENGE_START', value: config.challengeStart.toISOString() });
    return true;
  } catch { return false; }
};

export const fetchStory = async (id: number, isSurferMode: boolean = false): Promise<Story | null> => {
    try {
        const { data, error } = await supabase.from('stories').select('*').eq('id', id).single();
        if (error || !data) return null;
        return {
            id: data.id, title: data.title, intro: data.intro,
            options: [
                { text: data.opt1_text, outcome: data.opt1_outcome, emoji: data.opt1_emoji },
                { text: data.opt2_text, outcome: data.opt2_outcome, emoji: data.opt2_emoji }
            ]
        };
    } catch { return null; }
};

export const getDailyStoryId = (): number => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    return (dayOfYear % 20) + 1;
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

export const getGroupBonusProgress = async (id: number) => [];
export const getBonusWinner = async () => null;
export const fetchSolvedTitles = async (ids: number[]) => [];
export const validateTitles = async (g: any) => [];
export const saveGroupBonusProgress = async (id: number, ids: number[]) => true;
export const claimBonusVictory = async (id: number) => false;
