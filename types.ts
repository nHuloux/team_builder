
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
  isLeader: boolean;
}

export interface Group {
  id: number;
  name: string;
  members: Member[];
  bonusCompleted?: boolean;
  manifesto?: string;
}

export interface StoryOption {
  text: string;
  outcome: string;
  emoji: string;
}

export interface Story {
  id: number;
  title: string;
  intro: string;
  options: [StoryOption, StoryOption];
}

export interface DBStory {
  id: number;
  title: string;
  intro: string;
  opt1_text: string;
  opt1_outcome: string;
  opt1_emoji: string;
  opt2_text: string;
  opt2_outcome: string;
  opt2_emoji: string;
}

export const QUOTAS = {
  [ClassType.INGENIEUR]: 1,
  [ClassType.MIND]: 2,
  [ClassType.CLIC]: 3,
};

export const TOTAL_GROUPS = 9;

export const DEFAULT_CORE_TEAM_DEADLINE = new Date('2026-02-01T00:00:00'); 
export const DEFAULT_CONSOLIDATION_DEADLINE = new Date('2026-03-15T00:00:00');
export const DEFAULT_LEADER_LOCK_DATE = new Date('2026-03-23T00:00:00');
export const DEFAULT_CHALLENGE_START = new Date('2026-03-23T00:00:00');

export interface AppConfig {
  coreTeamDeadline: Date;
  consolidationDeadline: Date;
  leaderLockDate: Date;
  challengeStart: Date;
}
