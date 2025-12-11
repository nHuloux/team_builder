import React from 'react';
import { Group, User, ClassType, QUOTAS, Member, DEADLINE_DATE } from '../types';
import { Button } from './Button';
import { canJoinGroup } from '../services/storage';
import { Users, Crown } from 'lucide-react';

interface GroupCardProps {
  group: Group;
  allGroups: Group[];
  currentUser: User;
  onJoin: (groupId: number) => void;
  onVote?: (groupId: number, candidateId: string) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ 
  group, 
  allGroups, 
  currentUser, 
  onJoin,
  onVote
}) => {
  const userInGroup = group.members.some(m => m.id === currentUser.id);
  const permission = canJoinGroup(allGroups, group.id, currentUser.classType);
  const isVotePhase = new Date() > DEADLINE_DATE;
  
  // Calculate counts
  const counts = {
    [ClassType.INGENIEUR]: group.members.filter(m => m.classType === ClassType.INGENIEUR).length,
    [ClassType.MIND]: group.members.filter(m => m.classType === ClassType.MIND).length,
    [ClassType.CLIC]: group.members.filter(m => m.classType === ClassType.CLIC).length,
  };

  const isFull = (type: ClassType) => counts[type] >= QUOTAS[type];
  
  // Calculate highest vote getter for leader display
  const leader = isVotePhase 
    ? group.members.reduce((prev, current) => (prev.votesReceived || 0) > (current.votesReceived || 0) ? prev : current, group.members[0])
    : null;
    
  const hasLeader = leader && (leader.votesReceived || 0) > 0;

  return (
    <div className={`flex flex-col h-full bg-white rounded-xl shadow-sm border ${userInGroup ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'}`}>
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {group.name}
            {userInGroup && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">Vous</span>}
          </h3>
          <Users className="h-5 w-5 text-gray-400" />
        </div>

        {/* Quota Bars */}
        <div className="space-y-3 mb-6">
          {Object.values(ClassType).map((type) => (
            <div key={type}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-600">{type}</span>
                <span className={`${counts[type] < QUOTAS[type] ? 'text-red-500' : 'text-green-600'}`}>
                  {counts[type]} / {QUOTAS[type]} requis
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${counts[type] >= QUOTAS[type] ? 'bg-green-500' : 'bg-indigo-400'}`}
                  style={{ width: `${Math.min((counts[type] / QUOTAS[type]) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Members List */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Membres</p>
          {group.members.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Aucun membre pour le moment</p>
          ) : (
            <ul className="text-sm space-y-1">
              {group.members.map(member => (
                <li key={member.id} className="flex justify-between items-center text-gray-700 bg-gray-50 px-2 py-1 rounded">
                  <span className="truncate">{member.firstName} {member.lastName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 bg-white border border-gray-200 px-1 rounded">{member.classType.slice(0,3)}</span>
                    {/* Voting Logic */}
                    {isVotePhase && userInGroup && member.id !== currentUser.id && onVote && (
                       <button 
                        onClick={() => onVote(group.id, member.id)}
                        className="text-gray-400 hover:text-yellow-500 transition-colors"
                        title="Voter pour le chef"
                       >
                         <Crown className="h-3 w-3" />
                       </button>
                    )}
                    {/* Leader Badge */}
                    {hasLeader && leader?.id === member.id && (
                        <Crown className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
        {!isVotePhase ? (
          !userInGroup ? (
            <div className="space-y-2">
              <Button 
                onClick={() => onJoin(group.id)} 
                className="w-full"
                disabled={!permission.allowed}
                variant={permission.allowed ? 'primary' : 'secondary'}
              >
                {permission.allowed ? "Rejoindre l'équipe" : 'Verrouillé'}
              </Button>
              {!permission.allowed && (
                 <p className="text-[10px] text-red-500 text-center leading-tight">
                   {permission.reason}
                 </p>
              )}
            </div>
          ) : (
             <div className="text-center text-sm font-medium text-indigo-700 py-2">
               Équipe actuelle
             </div>
          )
        ) : (
          <div className="text-center text-xs text-gray-500 font-medium">
             Phase de vote active
          </div>
        )}
      </div>
    </div>
  );
};