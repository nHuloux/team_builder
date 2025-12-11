
import { Group, User, Member, TOTAL_GROUPS, ClassType, QUOTAS, AppConfig, DEFAULT_CORE_TEAM_DEADLINE, DEFAULT_CONSOLIDATION_DEADLINE, DEFAULT_LEADER_LOCK_DATE, DEFAULT_CHALLENGE_START } from '../types';
import { supabase } from './supabaseClient';

const STORAGE_KEY_CURRENT_USER = 'teambuilder_current_user';

// --- Helper Types for Database ---
interface DBUser {
  id: string;
  first_name: string;
  last_name: string;
  class_type: string;
  group_id: number | null;
  password?: string;
  is_leader?: boolean;
}

// --- Core Service Logic ---

// Transform DB users into Group objects
const transformUsersToGroups = (users: DBUser[]): Group[] => {
  // Initialize empty groups
  const groups: Group[] = Array.from({ length: TOTAL_GROUPS }, (_, i) => ({
    id: i + 1,
    name: `Groupe ${i + 1}`,
    members: []
  }));

  // Distribute users into groups
  users.forEach(u => {
    if (u.group_id && u.group_id > 0 && u.group_id <= TOTAL_GROUPS) {
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
    const { data, error } = await supabase
      .from('project_members')
      .select('*');

    if (error) {
      console.error("Supabase fetch error:", error.message);
      return [];
    }
    
    return transformUsersToGroups(data as DBUser[]);
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return [];
  }
};

// FETCH APP CONFIG
export const fetchAppConfig = async (): Promise<AppConfig> => {
  try {
    // Try to fetch from a 'challenge_config' table
    // Expected structure: key (text), value (text)
    const { data, error } = await supabase
      .from('challenge_config')
      .select('key, value');

    if (error || !data) {
      console.warn("Could not fetch config (table might not exist), using defaults.");
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
      // Fallback for old key name if migration hasn't run
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

// UPDATE APP CONFIG
export const updateAppConfig = async (config: AppConfig): Promise<boolean> => {
  try {
    const updates = [
      { key: 'CORE_TEAM_DEADLINE', value: config.coreTeamDeadline.toISOString() },
      { key: 'CONSOLIDATION_DEADLINE', value: config.consolidationDeadline.toISOString() },
      { key: 'LEADER_LOCK_DATE', value: config.leaderLockDate.toISOString() },
      { key: 'CHALLENGE_START', value: config.challengeStart.toISOString() }
    ];

    const { error } = await supabase
      .from('challenge_config')
      .upsert(updates, { onConflict: 'key' });

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

// LOGIN / CREATE USER WITH PASSWORD
export const loginAndCheckUser = async (userCandidate: User, passwordRaw: string): Promise<User> => {
  const generatedId = `${userCandidate.firstName.toLowerCase()}-${userCandidate.lastName.toLowerCase()}`.trim();
  const password = passwordRaw.trim();

  if (!password) {
    throw new Error("Le mot de passe est requis.");
  }
  
  try {
    // 1. Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('project_members')
      .select('*')
      .eq('id', generatedId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is 'not found'
      throw fetchError;
    }

    if (existingUser) {
      // 1a. User exists
      
      // Check Password Logic
      if (existingUser.password) {
        if (existingUser.password !== password) {
           throw new Error("Mot de passe incorrect.");
        }
      } else {
        await supabase
          .from('project_members')
          .update({ password: password })
          .eq('id', generatedId);
      }

      // Update DB class_type to match current login if different
      if (existingUser.class_type !== userCandidate.classType) {
         await supabase.from('project_members').update({ class_type: userCandidate.classType }).eq('id', generatedId);
      }

      const user: User = {
        id: existingUser.id,
        firstName: existingUser.first_name,
        lastName: existingUser.last_name,
        classType: existingUser.class_type as ClassType,
        groupId: existingUser.group_id
      };
      
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
      return user;
    } else {
      // 2. Create new user with password
      const newUser = {
        id: generatedId,
        first_name: userCandidate.firstName,
        last_name: userCandidate.lastName,
        class_type: userCandidate.classType,
        group_id: null,
        password: password,
        is_leader: false
      };

      const { error: insertError } = await supabase
        .from('project_members')
        .insert([newUser]);

      if (insertError) throw insertError;

      const user: User = {
        id: newUser.id,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        classType: newUser.class_type as ClassType,
        groupId: null
      };

      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
      return user;
    }
  } catch (error: any) {
    console.error("Login failed:", error);
    if (error.message === "Mot de passe incorrect." || error.message === "Le mot de passe est requis.") {
      throw error;
    }
    throw new Error("Erreur de connexion avec la base de données.");
  }
};

// JOIN GROUP
export const joinGroup = async (userId: string, groupId: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('project_members')
      .update({ group_id: groupId, is_leader: false }) // Reset leader status when joining a new group
      .eq('id', userId);

    if (error) {
      console.error("Supabase join error:", error.message);
      return false;
    }

    const currentUser = getCurrentUser();
    if (currentUser) {
      currentUser.groupId = groupId;
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
    }
    return true;

  } catch (error) {
    console.error("Join group failed:", error);
    return false;
  }
};

// ASSIGN LEADER (TOGGLE CROWN)
export const assignLeader = async (groupId: number, newLeaderId: string): Promise<boolean> => {
   try {
    // 1. Reset leader for everyone in this group
    const { error: resetError } = await supabase
      .from('project_members')
      .update({ is_leader: false })
      .eq('group_id', groupId);

    if (resetError) {
        console.error("Error resetting leaders:", resetError.message, resetError.details);
        throw new Error(resetError.message);
    }

    // 2. Set new leader
    const { error: updateError } = await supabase
      .from('project_members')
      .update({ is_leader: true })
      .eq('id', newLeaderId);

    if (updateError) {
        console.error("Error setting new leader:", updateError.message, updateError.details);
        throw new Error(updateError.message);
    }

    return true;
   } catch (error: any) {
     // Log the full error object structure for debugging
     console.error("Assign leader failed (full object):", JSON.stringify(error, null, 2));
     console.error("Assign leader failed (message):", error.message || error);
     return false;
   }
};

// LOGOUT
export const logoutUser = () => {
  localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
  return data ? JSON.parse(data) : null;
};

// VALIDATION RULES
export const canJoinGroup = (groups: Group[], groupId: number, userClass: ClassType): { allowed: boolean; reason?: string } => {
  const group = groups.find(g => g.id === groupId);
  if (!group) return { allowed: false, reason: 'Groupe non trouvé' };

  const currentCount = group.members.filter(m => m.classType === userClass).length;
  const required = QUOTAS[userClass];

  // Rule 1: Filling mandatory slots
  if (currentCount < required) {
    return { allowed: true };
  }

  // Rule 2: Overfilling only allowed if ALL groups meet minimum
  const allGroupsMeetRequirement = groups.every(g => {
    const count = g.members.filter(m => m.classType === userClass).length;
    return count >= required;
  });

  if (!allGroupsMeetRequirement) {
    return { 
      allowed: false, 
      reason: `Impossible de rejoindre. Tous les groupes doivent avoir ${required} ${userClass}(s) avant de dépasser le quota.` 
    };
  }

  return { allowed: true };
};
