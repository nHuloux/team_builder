
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

// Fix for "MIND" / "CLIC" counting issues: strictly map database strings to Enums
const normalizeClassType = (raw: string): ClassType => {
  if (!raw) return ClassType.INGENIEUR;
  const normalized = raw.trim().toLowerCase();
  
  if (normalized.includes('mind')) return ClassType.MIND;
  if (normalized.includes('clic')) return ClassType.CLIC;
  // Default to Ingenieur for anything else (including "Ingénieur" or "Ingenieur")
  return ClassType.INGENIEUR;
};

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
        classType: normalizeClassType(u.class_type),
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
    let membersData: DBUser[] = [];
    let configData: { key: string; value: string }[] = [];

    // 1. Fetch Members (Try RPC, fallback to Select)
    const { data: rpcMembers, error: rpcError } = await supabase.rpc('get_project_members');
    
    if (rpcError) {
        // Fallback
        const { data, error } = await supabase
            .from('project_members')
            .select('id, first_name, last_name, class_type, group_id, is_leader');
        
        if (error) {
             console.error("Supabase fetch members error:", error.message);
             return [];
        }
        membersData = data as DBUser[];
    } else {
        membersData = rpcMembers as DBUser[];
    }

    // 2. Fetch Config (Try RPC, fallback to Select)
    const { data: rpcConfig, error: configError } = await supabase.rpc('get_all_challenge_config');
    
    if (configError) {
        // Fallback
        const { data, error } = await supabase.from('challenge_config').select('key, value');
        if (!error && data) configData = data;
    } else {
        configData = rpcConfig;
    }

    const groups = transformUsersToGroups(membersData);

    if (configData && configData.length > 0) {
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

// UPDATE GROUP NAME
export const updateGroupName = async (groupId: number, name: string): Promise<boolean> => {
  if (!name || name.trim().length === 0) return false;
  
  try {
    const { error } = await supabase.rpc('update_group_name', { 
        p_group_id: groupId, 
        p_name: name.trim() 
    });

    if (error) {
       // Fallback
       const { error: fallbackError } = await supabase
         .from('challenge_config')
         .upsert({ key: `GROUP_NAME_${groupId}`, value: name.trim() });
       return !fallbackError;
    }
    return true;
  } catch (error) {
    return false;
  }
};

// FETCH APP CONFIG
export const fetchAppConfig = async (): Promise<AppConfig> => {
  try {
    let configData: { key: string; value: string }[] = [];

    const { data, error } = await supabase.rpc('get_all_challenge_config');

    if (error) {
        // Fallback
        const { data: fbData, error: fbError } = await supabase.from('challenge_config').select('key, value');
        if (!fbError && fbData) configData = fbData;
    } else {
        configData = data;
    }

    const config: any = {};
    configData.forEach(row => {
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

// UPDATE APP CONFIG
export const updateAppConfig = async (config: AppConfig): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('update_app_config_batch', {
        p_core_deadline: config.coreTeamDeadline.toISOString(),
        p_consolidation_deadline: config.consolidationDeadline.toISOString(),
        p_leader_lock: config.leaderLockDate.toISOString(),
        p_challenge_start: config.challengeStart.toISOString()
    });

    if (error) {
       // Fallback: Batch upsert not supported in v1 easily, iterate
       await supabase.from('challenge_config').upsert({ key: 'CORE_TEAM_DEADLINE', value: config.coreTeamDeadline.toISOString() });
       await supabase.from('challenge_config').upsert({ key: 'CONSOLIDATION_DEADLINE', value: config.consolidationDeadline.toISOString() });
       await supabase.from('challenge_config').upsert({ key: 'LEADER_LOCK_DATE', value: config.leaderLockDate.toISOString() });
       await supabase.from('challenge_config').upsert({ key: 'CHALLENGE_START', value: config.challengeStart.toISOString() });
       return true;
    }
    return true;
  } catch (e) {
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
        const result = await supabase.rpc('get_story_by_id', { p_id: id });
        if (result.error) {
             // Fallback
             const fb = await supabase.from('stories').select('*').eq('id', id).single();
             data = fb.data;
             error = fb.error;
        } else {
             data = result.data ? result.data[0] : null;
             error = result.error;
        }
    } else {
        const result = await supabase.rpc('get_story_secure', { target_id: id });
        if (result.error) {
             // Fallback
             const fb = await supabase.from('stories').select('*').eq('id', id).single();
             data = fb.data;
             error = fb.error;
        } else {
             data = result.data ? result.data[0] : null;
             error = result.error;
        }
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
    const { data, error } = await supabase.rpc('get_story_titles', { p_ids: ids });
    
    if (error) {
        // Fallback
        const fb = await supabase.from('stories').select('id, title').in('id', ids).order('id');
        return fb.data || [];
    }
    
    return data || [];
  } catch (e) {
    return [];
  }
};

export const validateTitles = async (guesses: {id: number, title: string}[]): Promise<{id: number, is_correct: boolean}[]> => {
  if (guesses.length === 0) return [];
  try {
    const { data, error } = await supabase.rpc('validate_titles', { guesses });
    if (error) {
        // Simple fallback validation (less fuzzy but works)
        const ids = guesses.map(g => g.id);
        const { data: stories } = await supabase.from('stories').select('id, title').in('id', ids);
        
        if (!stories) return [];
        
        return guesses.map(guess => {
            const story = stories.find(s => s.id === guess.id);
            if (!story) return { id: guess.id, is_correct: false };
            
            // Basic normalization for fallback
            const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
            return {
                id: guess.id,
                is_correct: normalize(story.title) === normalize(guess.title)
            };
        });
    }
    return data as {id: number, is_correct: boolean}[];
  } catch (e: any) {
    return [];
  }
};

export const saveGroupBonusProgress = async (groupId: number, foundIds: number[]): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('save_bonus_progress', {
        p_group_id: groupId,
        p_found_ids: JSON.stringify(foundIds)
    });
    
    if (error) {
        // Fallback
        const { error: fbError } = await supabase.from('challenge_config').upsert({
            key: `GROUP_BONUS_PROGRESS_${groupId}`,
            value: JSON.stringify(foundIds)
        });
        return !fbError;
    }
    return true;
  } catch (error) {
    return false;
  }
};

export const getGroupBonusProgress = async (groupId: number): Promise<number[]> => {
  try {
    const { data, error } = await supabase.rpc('get_config_value', { p_key: `GROUP_BONUS_PROGRESS_${groupId}` });

    if (error) {
        // Fallback
        const fb = await supabase.from('challenge_config').select('value').eq('key', `GROUP_BONUS_PROGRESS_${groupId}`).single();
        if (fb.data) return JSON.parse(fb.data.value);
        return [];
    }
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};

export const getBonusWinner = async (): Promise<number | null> => {
  try {
    const { data, error } = await supabase.rpc('get_config_value', { p_key: 'BONUS_WINNER_GROUP_ID' });

    if (error) {
        // Fallback
        const fb = await supabase.from('challenge_config').select('value').eq('key', 'BONUS_WINNER_GROUP_ID').single();
        if (fb.data) return parseInt(fb.data.value, 10);
        return null;
    }
    return data ? parseInt(data, 10) : null;
  } catch (error) {
    return null;
  }
};

export const claimBonusVictory = async (groupId: number): Promise<boolean> => {
  try {
     const { data, error } = await supabase.rpc('claim_bonus_victory', { p_group_id: groupId });
     if (error) {
         // Fallback logic
         const { data: existing } = await supabase.from('challenge_config').select('value').eq('key', 'BONUS_WINNER_GROUP_ID').single();
         if (existing) return parseInt(existing.value) === groupId;
         
         const { error: insertError } = await supabase.from('challenge_config').insert({ key: 'BONUS_WINNER_GROUP_ID', value: groupId.toString() });
         return !insertError;
     }
     return data as boolean;
  } catch (e) {
      return false;
  }
};


// LOGIN / REGISTER
export const loginAndCheckUser = async (userCandidate: User, passwordRaw: string): Promise<User> => {
  const generatedId = `${userCandidate.firstName.trim().toLowerCase()}-${userCandidate.lastName.trim().toLowerCase()}`;
  
  if (!passwordRaw) throw new Error("Le mot de passe est requis.");
  const passwordTrimmed = passwordRaw.trim();
  let hashedPassword = await hashPassword(passwordTrimmed);
  
  try {
    const { data, error } = await supabase.rpc('login_or_register_user', {
        p_id: generatedId,
        p_first_name: userCandidate.firstName,
        p_last_name: userCandidate.lastName,
        p_class_type: userCandidate.classType,
        p_password_hash: hashedPassword,
        p_password_plain: passwordTrimmed 
    });

    if (error) {
        // FALLBACK: Manual Login Logic
        const { data: existingUser, error: fetchError } = await supabase
            .from('project_members')
            .select('*')
            .eq('id', generatedId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Row not found"
            throw new Error("Erreur de connexion (DB).");
        }

        if (existingUser) {
            // Verify Password
            if (existingUser.password === hashedPassword) {
                // OK
            } else if (existingUser.password === passwordTrimmed) {
                 // Migrate Legacy
                 await supabase.from('project_members').update({ password: hashedPassword }).eq('id', generatedId);
            } else {
                throw new Error("Mot de passe incorrect.");
            }

            // Update Class if needed
            // Ensure we use the proper Enum value when writing to DB to avoid future issues
            const normalizedClass = userCandidate.classType; 
            
            if (existingUser.class_type !== normalizedClass) {
                 await supabase.from('project_members').update({ class_type: normalizedClass }).eq('id', generatedId);
            }

            const user: User = {
                id: existingUser.id,
                firstName: existingUser.first_name,
                lastName: existingUser.last_name,
                classType: normalizeClassType(existingUser.class_type),
                groupId: existingUser.group_id,
                isLeader: existingUser.is_leader || false
            };
            localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
            return user;

        } else {
            // Register New
            const newUser = {
                id: generatedId,
                first_name: userCandidate.firstName,
                last_name: userCandidate.lastName,
                class_type: userCandidate.classType,
                password: hashedPassword,
                group_id: 0,
                is_leader: false
            };
            
            const { error: insertError } = await supabase.from('project_members').insert(newUser);
            if (insertError) throw new Error("Erreur lors de l'inscription.");

            const user: User = {
                id: newUser.id,
                firstName: newUser.first_name,
                lastName: newUser.last_name,
                classType: newUser.class_type as ClassType,
                groupId: 0,
                isLeader: false
            };
            localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
            return user;
        }
    }

    if (!data) throw new Error("Erreur inattendue lors de la connexion.");

    const user: User = {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        classType: normalizeClassType(data.class_type), // Use normalizer
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

// JOIN GROUP
export const joinGroup = async (userId: string, groupId: number): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('join_team', {
        p_user_id: userId,
        p_group_id: groupId
    });

    if (error) {
       // Fallback
       const { error: fbError } = await supabase
         .from('project_members')
         .update({ group_id: groupId, is_leader: false })
         .eq('id', userId);
       return !fbError;
    }
    return true;
  } catch (error) {
    return false;
  }
};

// LEAVE GROUP
export const leaveGroup = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('leave_team', { p_user_id: userId });

    if (error) {
       // Fallback
       const { error: fbError } = await supabase
         .from('project_members')
         .update({ group_id: 0, is_leader: false })
         .eq('id', userId);
       return !fbError;
    }
    return true;

  } catch (error) {
    return false;
  }
};

// ASSIGN LEADER
export const assignLeader = async (groupId: number, newLeaderId: string): Promise<boolean> => {
   try {
    const { error } = await supabase.rpc('assign_team_leader', {
        p_group_id: groupId,
        p_leader_id: newLeaderId
    });

    if (error) {
        // Fallback
        // 1. Reset old leader
        await supabase.from('project_members').update({ is_leader: false }).eq('group_id', groupId);
        // 2. Set new leader
        const { error: fbError } = await supabase.from('project_members').update({ is_leader: true }).eq('id', newLeaderId);
        return !fbError;
    }
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

// Client-side validation for UI feedback
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
