
export enum ClassType {
  INGENIEUR = 'Ingénieur',
  MIND = 'MIND',
  CLIC = 'CLIC',
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  classType: ClassType;
  groupId?: number | null;
  isLeader?: boolean;
}

export interface Member extends User {
  isLeader: boolean; // Override to be required for Member
}

export interface Group {
  id: number;
  name: string;
  members: Member[];
}

export const QUOTAS = {
  [ClassType.INGENIEUR]: 1,
  [ClassType.MIND]: 2,
  [ClassType.CLIC]: 3,
};

export const TOTAL_GROUPS = 9;

// Default dates used if not found in database
export const DEFAULT_CORE_TEAM_DEADLINE = new Date('2026-02-01T00:00:00'); 
export const DEFAULT_CONSOLIDATION_DEADLINE = new Date('2026-03-15T00:00:00'); // End of Phase 2 (Group Lock)
export const DEFAULT_LEADER_LOCK_DATE = new Date('2026-03-23T00:00:00'); // End of Phase 3 (Leader Lock)
export const DEFAULT_CHALLENGE_START = new Date('2026-03-23T00:00:00'); // Phase 4 Start

export interface AppConfig {
  coreTeamDeadline: Date;
  consolidationDeadline: Date;
  leaderLockDate: Date;
  challengeStart: Date;
}
