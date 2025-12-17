
import { Group, User, Member, TOTAL_GROUPS, ClassType, QUOTAS, AppConfig, DEFAULT_CORE_TEAM_DEADLINE, DEFAULT_CONSOLIDATION_DEADLINE, DEFAULT_LEADER_LOCK_DATE, DEFAULT_CHALLENGE_START, Story, DBStory } from '../types';
import { supabase } from './supabaseClient';

const STORAGE_KEY_CURRENT_USER = 'teambuilder_current_user';

// --- Helper Types for Database ---
interface DBUser {
  id: string;
  first_name: string;
  last_name: string;
  class_type: string;
  group_id: number | null;
  // password is removed from interface to ensure we never touch it in frontend logic
  is_leader?: boolean;
}

// --- Helper Functions ---

// Simple SHA-256 hash function using Web Crypto API
const hashPassword = async (password: string): Promise<string> => {
  if (!window.crypto || !window.crypto.subtle) {
    console.warn("Crypto API non disponible. HTTPS requis.");
    throw new Error("Environnement non sécurisé (HTTPS requis) : impossible de chiffrer le mot de passe.");
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const getDailyStoryId = (): number => {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const TOTAL_DB_STORIES = 20;
    return (dayOfYear % TOTAL_DB_STORIES) + 1;
};

// --- Core Service Logic ---

const transformUsersToGroups = (users: DBUser[]): Group[] => {
  const groups: Group[] = Array.from({ length: TOTAL_GROUPS }, (_, i) => ({
    id: i + 1,
    name: `Groupe ${i + 1}`,
    members: [],
    bonusCompleted: false
  }));

  users.forEach(u => {
    if (u.group_id !== null && u.group_id !== undefined && u.group_id > 0 && u.group_id <= TOTAL_GROUPS) {
      const groupIndex = u.group_id - 1;
      const member: Member = {
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        classType: u.class_type as ClassType,
        groupId: u.group_id,
        isLeader: u.is_leader || false
      };
      groups[groupIndex].members.push(member);
    }
  });

  return groups;
};

// FETCH GROUPS
export const fetchGroups = async (): Promise<Group[]> => {
  try {
    // SECURITY UPDATE: Select ONLY necessary columns. Do NOT select 'password'.
    const { data: membersData, error: membersError } = await supabase
      .from('project_members')
      .select('id, first_name, last_name, class_type, group_id, is_leader');

    if (membersError) {
      console.error("Supabase fetch members error:", membersError.message);
      return [];
    }

    // Fetch both Names AND Bonus Progress
    // We fetch all config keys starting with GROUP_ to optimize requests
    const { data: configData, error: configError } = await supabase
      .from('challenge_config')
      .select('key, value')
      .or('key.like.GROUP_NAME_%,key.like.GROUP_BONUS_PROGRESS_%');

    const groups = transformUsersToGroups(membersData as DBUser[]);

    if (!configError && configData) {
      const namesMap = new Map<number, string>();
      const bonusMap = new Map<number, boolean>();

      configData.forEach(row => {
        try {
          if (row.key.startsWith('GROUP_NAME_')) {
             const id = parseInt(row.key.replace('GROUP_NAME_', ''));
             if (!isNaN(id)) namesMap.set(id, row.value);
          } else if (row.key.startsWith('GROUP_BONUS_PROGRESS_')) {
             const id = parseInt(row.key.replace('GROUP_BONUS_PROGRESS_', ''));
             if (!isNaN(id)) {
                 const foundIds = JSON.parse(row.value);
                 // Check if completed (20 items)
                 if (Array.isArray(foundIds) && foundIds.length >= 20) {
                     bonusMap.set(id, true);
                 }
             }
          }
        } catch (e) { }
      });

      groups.forEach(g => {
        if (namesMap.has(g.id)) {
          g.name = namesMap.get(g.id)!;
        }
        if (bonusMap.has(g.id)) {
          g.bonusCompleted = true;
        }
      });
    }
    
    return groups;
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return [];
  }
};

// UPDATE GROUP NAME (Secure RPC)
export const updateGroupName = async (groupId: number, name: string): Promise<boolean> => {
  if (!name || name.trim().length === 0) return false;
  
  try {
    // SECURITY: Use RPC to allow SQL to check permissions if needed
    const { error } = await supabase.rpc('update_group_name', { 
        p_group_id: groupId, 
        p_name: name.trim() 
    });

    if (error) {
      console.error("Failed to update group name:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error updating group name:", error);
    return false;
  }
};

// FETCH APP CONFIG
export const fetchAppConfig = async (): Promise<AppConfig> => {
  try {
    const { data, error } = await supabase
      .from('challenge_config')
      .select('key, value');

    if (error || !data) {
      return {
        coreTeamDeadline: DEFAULT_CORE_TEAM_DEADLINE,
        consolidationDeadline: DEFAULT_CONSOLIDATION_DEADLINE,
        leaderLockDate: DEFAULT_LEADER_LOCK_DATE,
        challengeStart: DEFAULT_CHALLENGE_START
      };
    }

    const config: any = {};
    data.forEach(row => {
      if (row.key === 'CORE_TEAM_DEADLINE') config.coreTeamDeadline = new Date(row.value);
      if (row.key === 'CONSOLIDATION_DEADLINE') config.consolidationDeadline = new Date(row.value);
      if (row.key === 'LEADER_DEADLINE') config.consolidationDeadline = new Date(row.value);
      if (row.key === 'LEADER_LOCK_DATE') config.leaderLockDate = new Date(row.value);
      if (row.key === 'CHALLENGE_START') config.challengeStart = new Date(row.value);
    });

    return {
      coreTeamDeadline: config.coreTeamDeadline || DEFAULT_CORE_TEAM_DEADLINE,
      consolidationDeadline: config.consolidationDeadline || DEFAULT_CONSOLIDATION_DEADLINE,
      leaderLockDate: config.leaderLockDate || DEFAULT_LEADER_LOCK_DATE,
      challengeStart: config.challengeStart || DEFAULT_CHALLENGE_START
    };

  } catch (e) {
    return {
      coreTeamDeadline: DEFAULT_CORE_TEAM_DEADLINE,
      consolidationDeadline: DEFAULT_CONSOLIDATION_DEADLINE,
      leaderLockDate: DEFAULT_LEADER_LOCK_DATE,
      challengeStart: DEFAULT_CHALLENGE_START
    };
  }
};

// UPDATE APP CONFIG (Secure RPC)
export const updateAppConfig = async (config: AppConfig): Promise<boolean> => {
  try {
    // Use RPC to bundle updates and verify admin status server-side if possible
    // For now we use the table update but via a restricted function ideally
    // We will use a batched RPC call for security
    const { error } = await supabase.rpc('update_app_config_batch', {
        p_core_deadline: config.coreTeamDeadline.toISOString(),
        p_consolidation_deadline: config.consolidationDeadline.toISOString(),
        p_leader_lock: config.leaderLockDate.toISOString(),
        p_challenge_start: config.challengeStart.toISOString()
    });

    if (error) {
      console.error("Failed to update config:", error.message);
      throw error;
    }
    return true;
  } catch (e) {
    console.error("Error updating config:", e);
    return false;
  }
};

// --- BONUS / STORY GAME SERVICES ---

export const fetchStory = async (id: number, isSurferMode: boolean = false): Promise<Story | null> => {
  try {
    const authorizedId = getDailyStoryId();
    if (!isSurferMode && id !== authorizedId) {
        console.warn(`SECURITY ALERT: Attempt to access unauthorized story #${id}. Access denied.`);
        return null;
    }

    let data, error;

    if (isSurferMode) {
         // Admin can read directly (requires RLS policy for Admin ID)
        const result = await supabase
            .from('stories')
            .select('*')
            .eq('id', id)
            .single();
        data = result.data;
        error = result.error;
    } else {
        const result = await supabase
            .rpc('get_story_secure', { target_id: id });
        
        data = result.data ? result.data[0] : null;
        error = result.error;
    }

    if (error || !data) return null;

    const row = data;
    return {
      id: row.id,
      title: row.title,
      intro: row.intro,
      options: [
        { text: row.opt1_text, outcome: row.opt1_outcome, emoji: row.opt1_emoji },
        { text: row.opt2_text, outcome: row.opt2_outcome, emoji: row.opt2_emoji }
      ]
    };
  } catch (e) {
    return null;
  }
};

export const fetchSolvedTitles = async (ids: number[]): Promise<{id: number, title: string}[]> => {
  if (ids.length === 0) return [];
  try {
    // Secure fetch of only titles
    const { data, error } = await supabase
      .from('stories')
      .select('id, title')
      .in('id', ids)
      .order('id');
    
    if (error || !data) return [];
    return data;
  } catch (e) {
    return [];
  }
};

export const validateTitles = async (guesses: {id: number, title: string}[]): Promise<{id: number, is_correct: boolean}[]> => {
  if (guesses.length === 0) return [];
  try {
    const { data, error } = await supabase.rpc('validate_titles', { guesses });
    if (error) return [];
    return data as {id: number, is_correct: boolean}[];
  } catch (e: any) {
    return [];
  }
};

export const saveGroupBonusProgress = async (groupId: number, foundIds: number[]): Promise<boolean> => {
  try {
    // Using RPC to ensure we are appending/updating correctly without exposing full table write access
    const { error } = await supabase.rpc('save_bonus_progress', {
        p_group_id: groupId,
        p_found_ids: JSON.stringify(foundIds)
    });
    return !error;
  } catch (error) {
    return false;
  }
};

export const getGroupBonusProgress = async (groupId: number): Promise<number[]> => {
  try {
    const { data, error } = await supabase
      .from('challenge_config')
      .select('value')
      .eq('key', `GROUP_BONUS_PROGRESS_${groupId}`)
      .single();

    if (error || !data) return [];
    return JSON.parse(data.value);
  } catch (error) {
    return [];
  }
};

export const getBonusWinner = async (): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('challenge_config')
      .select('value')
      .eq('key', 'BONUS_WINNER_GROUP_ID')
      .single();

    if (error || !data) return null;
    return parseInt(data.value, 10);
  } catch (error) {
    return null;
  }
};

export const claimBonusVictory = async (groupId: number): Promise<boolean> => {
  try {
     const { data, error } = await supabase.rpc('claim_bonus_victory', { p_group_id: groupId });
     if (error) return false;
     return data as boolean;
  } catch (e) {
      return false;
  }
};


// LOGIN / REGISTER (SECURE RPC)
export const loginAndCheckUser = async (userCandidate: User, passwordRaw: string): Promise<User> => {
  const generatedId = `${userCandidate.firstName.trim().toLowerCase()}-${userCandidate.lastName.trim().toLowerCase()}`;
  
  if (!passwordRaw) throw new Error("Le mot de passe est requis.");
  const passwordTrimmed = passwordRaw.trim();
  let hashedPassword = await hashPassword(passwordTrimmed);
  
  try {
    // SECURITY: We call a database function that handles:
    // 1. Checking if user exists
    // 2. Creating if not exists
    // 3. Verifying password hash (server-side logic, though we send hash here)
    // 4. Updating password if it was plain text (migration)
    // 5. Returning the user object WITHOUT the password
    
    const { data, error } = await supabase.rpc('login_or_register_user', {
        p_id: generatedId,
        p_first_name: userCandidate.firstName,
        p_last_name: userCandidate.lastName,
        p_class_type: userCandidate.classType,
        p_password_hash: hashedPassword,
        p_password_plain: passwordTrimmed // For legacy checks inside SQL
    });

    if (error) {
        console.error("Login RPC Error:", error);
        throw new Error(error.message || "Erreur de connexion.");
    }

    if (!data) throw new Error("Erreur inattendue lors de la connexion.");

    const user: User = {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        classType: data.class_type as ClassType,
        groupId: data.group_id,
        isLeader: data.is_leader || false
    };
    
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
    return user;

  } catch (error: any) {
    console.error("Login failed:", error);
    throw error;
  }
};

// JOIN GROUP (SECURE RPC)
export const joinGroup = async (userId: string, groupId: number): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('join_team', {
        p_user_id: userId,
        p_group_id: groupId
    });

    if (error) {
      console.error("Join group error:", error.message);
      return false;
    }

    const currentUser = getCurrentUser();
    if (currentUser) {
      currentUser.groupId = groupId;
      currentUser.isLeader = false;
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
    }
    return true;

  } catch (error) {
    return false;
  }
};

// LEAVE GROUP (SECURE RPC)
export const leaveGroup = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('leave_team', { p_user_id: userId });

    if (error) {
      console.error("Leave group error:", error.message);
      return false;
    }

    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.groupId = 0;
      currentUser.isLeader = false;
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
    }
    return true;

  } catch (error) {
    return false;
  }
};

// ASSIGN LEADER (SECURE RPC)
export const assignLeader = async (groupId: number, newLeaderId: string): Promise<boolean> => {
   try {
    const { error } = await supabase.rpc('assign_team_leader', {
        p_group_id: groupId,
        p_leader_id: newLeaderId
    });

    if (error) throw new Error(error.message);
    return true;
   } catch (error: any) {
     console.error("Assign leader failed:", error.message);
     return false;
   }
};

export const logoutUser = () => {
  localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
  return data ? JSON.parse(data) : null;
};

// Client-side validation for UI feedback (Rules are also loosely enforced by API logic logic where possible)
export const canJoinGroup = (groups: Group[], groupId: number, userClass: ClassType): { allowed: boolean; reason?: string } => {
  const group = groups.find(g => g.id === groupId);
  if (!group) return { allowed: false, reason: 'Groupe non trouvé' };

  const currentClassCount = group.members.filter(m => m.classType === userClass).length;
  const requiredClassCount = QUOTAS[userClass];

  if (currentClassCount < requiredClassCount) {
    return { allowed: true };
  }

  const allGroupsMeetClassRequirement = groups.every(g => {
    const count = g.members.filter(m => m.classType === userClass).length;
    return count >= requiredClassCount;
  });

  if (!allGroupsMeetClassRequirement) {
    return { 
      allowed: false, 
      reason: `Impossible de rejoindre. Tous les groupes doivent avoir ${requiredClassCount} ${userClass}(s) avant de dépasser le quota.` 
    };
  }

  const MAX_PREFERRED_SIZE = 9;
  const currentTotal = group.members.length;

  if (currentTotal >= MAX_PREFERRED_SIZE) {
    const allGroupsReachedMax = groups.every(g => g.members.length >= MAX_PREFERRED_SIZE);
    
    if (!allGroupsReachedMax) {
      return {
        allowed: false,
        reason: `Ce groupe a atteint ${MAX_PREFERRED_SIZE} personnes. Veuillez compléter les autres groupes d'abord.`
      };
    }
  }

  return { allowed: true };
};
