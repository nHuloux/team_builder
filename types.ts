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
  groupId?: number | null; // Added to track group in flat list
  votes?: number;
}

export interface Member extends User {
  isLeader?: boolean;
  votesReceived?: number;
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

// Updated Timeline Dates (Assuming 2025 for the upcoming challenge)
export const CORE_TEAM_DEADLINE = new Date('2026-02-01T00:00:00'); 
export const DEADLINE_DATE = new Date('2026-03-01T00:00:00'); // Start of Vote Phase
export const CHALLENGE_START = new Date('2026-03-23T00:00:00');