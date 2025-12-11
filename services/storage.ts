import { Group, User, Member, TOTAL_GROUPS, ClassType, QUOTAS } from '../types';
import { supabase } from './supabaseClient';

const STORAGE_KEY_CURRENT_USER = 'teambuilder_current_user';

// --- Helper Types for Database ---
interface DBUser {
  id: string;
  first_name: string;
  last_name: string;
  class_type: string;
  group_id: number | null;
  votes: number;
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
        votesReceived: u.votes || 0,
        isLeader: false // Calculated dynamically in UI based on votes
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
      console.error("Supabase fetch error details:", JSON.stringify(error, null, 2));
      return [];
    }
    
    return transformUsersToGroups(data as DBUser[]);
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return [];
  }
};

// LOGIN / CREATE USER
export const loginAndCheckUser = async (userCandidate: User): Promise<User> => {
  const generatedId = `${userCandidate.firstName.toLowerCase()}-${userCandidate.lastName.toLowerCase()}`.trim();
  
  try {
    // 1. Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('project_members')
      .select('*')
      .eq('id', generatedId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is 'not found'
      console.error("Login fetch error:", JSON.stringify(fetchError, null, 2));
      throw fetchError;
    }

    if (existingUser) {
      // User exists, update local storage and return
      // Update DB class_type to match current login if different (Keep profile fresh)
      if (existingUser.class_type !== userCandidate.classType) {
         await supabase.from('project_members').update({ class_type: userCandidate.classType }).eq('id', generatedId);
      }

      const user: User = {
        id: existingUser.id,
        firstName: existingUser.first_name,
        lastName: existingUser.last_name,
        classType: existingUser.class_type as ClassType, // Use DB value
        groupId: existingUser.group_id,
        votes: existingUser.votes
      };
      
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
      return user;
    } else {
      // 2. Create new user
      const newUser = {
        id: generatedId,
        first_name: userCandidate.firstName,
        last_name: userCandidate.lastName,
        class_type: userCandidate.classType,
        group_id: null,
        votes: 0
      };

      const { error: insertError } = await supabase
        .from('project_members')
        .insert([newUser]);

      if (insertError) {
        console.error("Login insert error:", JSON.stringify(insertError, null, 2));
        throw insertError;
      }

      const user: User = {
        id: newUser.id,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        classType: newUser.class_type as ClassType,
        groupId: null,
        votes: 0
      };

      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
      return user;
    }
  } catch (error) {
    console.error("Login failed:", error);
    throw new Error("Erreur de connexion avec la base de données. Vérifiez la console pour les détails.");
  }
};

// JOIN GROUP
export const joinGroup = async (userId: string, groupId: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('project_members')
      .update({ group_id: groupId })
      .eq('id', userId);

    if (error) {
      console.error("Supabase join error:", JSON.stringify(error, null, 2));
      return false;
    }

    // Update local session
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

// VOTE
export const voteForLeader = async (groupId: number, candidateId: string): Promise<boolean> => {
   try {
    // 1. Get current votes
    const { data: user, error: fetchError } = await supabase
      .from('project_members')
      .select('votes')
      .eq('id', candidateId)
      .single();
      
    if (fetchError || !user) {
        console.error("Vote fetch error:", JSON.stringify(fetchError, null, 2));
        return false;
    }

    // 2. Increment
    const { error: updateError } = await supabase
      .from('project_members')
      .update({ votes: (user.votes || 0) + 1 })
      .eq('id', candidateId);

    if (updateError) {
        console.error("Vote update error:", JSON.stringify(updateError, null, 2));
        return false;
    }

    return true;
   } catch (error) {
     console.error("Vote failed:", error);
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

// VALIDATION RULES (Pure logic, stays synchronous)
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