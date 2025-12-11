
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
    // Check strict equality to ensure 0 is excluded but valid numbers are included
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
    // 1. Fetch Members
    const { data: membersData, error: membersError } = await supabase
      .from('project_members')
      .select('*');

    if (membersError) {
      console.error("Supabase fetch members error:", membersError.message);
      return [];
    }

    // 2. Fetch Group Names from Config
    const { data: namesData, error: namesError } = await supabase
      .from('challenge_config')
      .select('key, value')
      .like('key', 'GROUP_NAME_%');

    const groups = transformUsersToGroups(membersData as DBUser[]);

    // 3. Apply Custom Names
    if (!namesError && namesData) {
      const namesMap = new Map<number, string>();
      namesData.forEach(row => {
        try {
          const id = parseInt(row.key.replace('GROUP_NAME_', ''));
          if (!isNaN(id)) {
            namesMap.set(id, row.value);
          }
        } catch (e) {
          // ignore parsing error
        }
      });

      groups.forEach(g => {
        if (namesMap.has(g.id)) {
          g.name = namesMap.get(g.id)!;
        }
      });
    }
    
    return groups;
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return [];
  }
};

// UPDATE GROUP NAME
export const updateGroupName = async (groupId: number, name: string): Promise<boolean> => {
  if (!name || name.trim().length === 0) return false;
  
  try {
    const { error } = await supabase
      .from('challenge_config')
      .upsert(
        { key: `GROUP_NAME_${groupId}`, value: name.trim() },
        { onConflict: 'key' }
      );

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
      if (row.key === 'LEADER_DEADLINE') config.consolidationDeadline = new Date(row.value); // Fallback
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
  // Normalize ID generation: lowercase and trim
  const generatedId = `${userCandidate.firstName.trim().toLowerCase()}-${userCandidate.lastName.trim().toLowerCase()}`;
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
        group_id: 0, // Default to 0 (no group)
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
        groupId: 0
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
      .update({ group_id: groupId, is_leader: false })
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

// LEAVE GROUP
export const leaveGroup = async (userId: string): Promise<boolean> => {
  try {
    // Set group_id to 0 to remove from any active group (1-9)
    // We do NOT use select() to avoid RLS return data issues, assuming permission to update own row exists
    const { error } = await supabase
      .from('project_members')
      .update({ group_id: 0, is_leader: false })
      .eq('id', userId);

    if (error) {
      console.error("Supabase leave error:", error.message);
      return false;
    }

    const currentUser = getCurrentUser();
    if (currentUser) {
      currentUser.groupId = 0; // Set to 0 to indicate no group
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
    }
    return true;

  } catch (error) {
    console.error("Leave group failed:", error);
    return false;
  }
};

// ASSIGN LEADER
export const assignLeader = async (groupId: number, newLeaderId: string): Promise<boolean> => {
   try {
    const { error: resetError } = await supabase
      .from('project_members')
      .update({ is_leader: false })
      .eq('group_id', groupId);

    if (resetError) throw new Error(resetError.message);

    const { error: updateError } = await supabase
      .from('project_members')
      .update({ is_leader: true })
      .eq('id', newLeaderId);

    if (updateError) throw new Error(updateError.message);

    return true;
   } catch (error: any) {
     console.error("Assign leader failed:", error.message || error);
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

// VALIDATION RULES
export const canJoinGroup = (groups: Group[], groupId: number, userClass: ClassType): { allowed: boolean; reason?: string } => {
  const group = groups.find(g => g.id === groupId);
  if (!group) return { allowed: false, reason: 'Groupe non trouvé' };

  const currentClassCount = group.members.filter(m => m.classType === userClass).length;
  const requiredClassCount = QUOTAS[userClass];

  // Rule 1: Filling mandatory slots
  if (currentClassCount < requiredClassCount) {
    return { allowed: true };
  }

  // Rule 2: Overfilling only allowed if ALL groups meet minimum class requirement
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

  // Rule 3: Max Capacity (9) Constraint
  // "Il faut que ce groupe ait moins de 9 personnes, sauf si tous les groupes ont déjà au moins 9 personnes."
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
