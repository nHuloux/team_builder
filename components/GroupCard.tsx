
import React, { useState } from 'react';
import { Group, User, ClassType, QUOTAS } from '../types';
import { Button } from './Button';
import { canJoinGroup } from '../services/storage';
import { Users, Crown, Edit2, Check, X, LogOut } from 'lucide-react';

interface GroupCardProps {
  group: Group;
  allGroups: Group[];
  currentUser: User;
  onJoin: (groupId: number) => void;
  onLeave: (groupId: number) => void;
  onAssignLeader: (groupId: number, memberId: string) => void;
  onRename: (groupId: number, newName: string) => void;
  groupLockDate: Date;
  leaderLockDate: Date;
  isSurferMode?: boolean;
  onOpenGame?: () => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ 
  group, 
  allGroups, 
  currentUser, 
  onJoin,
  onLeave,
  onAssignLeader,
  onRename,
  groupLockDate,
  leaderLockDate,
  isSurferMode = false,
  onOpenGame
}) => {
  const userInGroup = group.members.some(m => m.id === currentUser.id);
  const permission = canJoinGroup(allGroups, group.id, currentUser.classType);
  
  const now = new Date();
  // Leader selection is open until the leader lock date (Phase 3 end)
  const isLeaderSelectionOpen = now <= leaderLockDate;
  // Group modification is locked after the group lock date (Phase 2 end)
  const isGroupLocked = now > groupLockDate;
  
  // Renaming State
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(group.name);

  // Calculate counts
  const counts = {
    [ClassType.INGENIEUR]: group.members.filter(m => m.classType === ClassType.INGENIEUR).length,
    [ClassType.MIND]: group.members.filter(m => m.classType === ClassType.MIND).length,
    [ClassType.CLIC]: group.members.filter(m => m.classType === ClassType.CLIC).length,
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      onRename(group.id, tempName.trim());
      setIsEditingName(false);
    }
  };

  const handleCancelName = () => {
    setTempName(group.name);
    setIsEditingName(false);
  };

  const handleLeaveClick = () => {
    // Direct call without confirmation dialog
    onLeave(group.id);
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-xl shadow-sm border ${userInGroup ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'}`}>
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-4">
          {isEditingName ? (
            <div className="flex items-center gap-1 w-full mr-2">
              <input 
                type="text" 
                value={tempName}
                maxLength={30}
                onChange={(e) => setTempName(e.target.value)}
                className="flex-1 text-sm border-gray-300 border rounded px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
                placeholder="Nom de l'équipe"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') handleCancelName();
                }}
              />
              <button onClick={handleSaveName} className="p-1 text-green-600 hover:bg-green-50 rounded">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={handleCancelName} className="p-1 text-red-500 hover:bg-red-50 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 max-w-[85%]">
              <h3 className="text-lg font-bold text-gray-900 truncate" title={group.name}>
                {group.name}
              </h3>
              {userInGroup && <span className="inline-flex shrink-0 items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">Vous</span>}
              {/* Allow renaming if user is in group and Phase 2 is done (Groups are locked) */}
              {userInGroup && isGroupLocked && (
                <button 
                  onClick={() => setIsEditingName(true)} 
                  className="text-gray-400 hover:text-indigo-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  title="Renommer l'équipe"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          
          <Users className="h-5 w-5 text-gray-400 shrink-0" />
        </div>

        {/* Quota Bars */}
        <div className="space-y-3 mb-6">
          {Object.values(ClassType).map((type) => (
            <div key={type}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-600">{type === ClassType.INGENIEUR ? 'Ingénieur' : type}</span>
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
              {group.members.map(member => {
                const isMe = member.id === currentUser.id;
                return (
                  <li key={member.id} className="flex justify-between items-center text-gray-700 bg-gray-50 px-2 py-1 rounded">
                    <span 
                        className={`truncate ${isMe ? 'cursor-pointer hover:text-indigo-600 font-medium select-none' : ''}`}
                        onClick={() => isMe && onOpenGame && onOpenGame()}
                        title={isMe ? "Cliquez pour un petit jeu..." : undefined}
                    >
                        {member.firstName} {member.lastName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium bg-white border border-gray-200 px-1.5 rounded">
                        {member.classType === ClassType.INGENIEUR ? 'INGE' : member.classType}
                      </span>
                      
                      {/* Leader Management */}
                      {member.isLeader ? (
                        // Active Leader
                        <button 
                          disabled={!userInGroup || !isLeaderSelectionOpen}
                          title={isLeaderSelectionOpen && userInGroup ? (isSurferMode ? "Chef surfeur (cliquer pour changer)" : "Chef d'équipe (cliquer pour changer)") : (isSurferMode ? "Chef surfeur" : "Chef d'équipe")}
                          className={`${isLeaderSelectionOpen && userInGroup ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
                        >
                          {isSurferMode ? (
                            <span className="text-base leading-none select-none" role="img" aria-label="surfer">🏄</span>
                          ) : (
                            <Crown className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </button>
                      ) : (
                        // Not Leader - Click to Assign (only if in group and dates are valid)
                        userInGroup && isLeaderSelectionOpen && (
                          <button 
                            onClick={() => onAssignLeader(group.id, member.id)}
                            className="text-gray-200 hover:text-yellow-500 transition-colors"
                            title={isSurferMode ? "Désigner comme surfeur" : "Désigner comme chef"}
                          >
                            {isSurferMode ? (
                              <span className="text-base leading-none opacity-30 hover:opacity-100 grayscale hover:grayscale-0 transition-all select-none" role="img" aria-label="surfer-gray">🏄</span>
                            ) : (
                              <Crown className="h-4 w-4" />
                            )}
                          </button>
                        )
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
        {!userInGroup ? (
          <div className="space-y-2">
            <Button 
              onClick={() => onJoin(group.id)} 
              className="w-full"
              disabled={!permission.allowed || isGroupLocked}
              variant={permission.allowed && !isGroupLocked ? 'primary' : 'secondary'}
            >
              {isGroupLocked 
                ? "Constitution terminée" 
                : (permission.allowed ? "Rejoindre l'équipe" : 'Verrouillé')
              }
            </Button>
            {!permission.allowed && !isGroupLocked && (
                <p className="text-[10px] text-red-500 text-center leading-tight">
                  {permission.reason}
                </p>
            )}
            {isGroupLocked && (
               <p className="text-[10px] text-gray-500 text-center leading-tight">
                  La phase de consolidation est terminée. Les équipes sont figées.
               </p>
            )}
          </div>
        ) : (
            <div className="flex flex-col items-center justify-center space-y-3 py-1">
              <div className="text-center">
                <span className="text-sm font-medium text-indigo-700 block">
                  C'est votre équipe
                </span>
                {isLeaderSelectionOpen ? (
                  <span className="text-[10px] text-gray-500">
                    {isSurferMode ? "Cliquez sur un surfeur pour désigner le chef." : "Cliquez sur une couronne pour désigner le chef."}
                  </span>
                ) : (
                  <span className="text-[10px] text-red-500 font-medium">
                    Sélection du chef clôturée.
                  </span>
                )}
              </div>

              {!isGroupLocked && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLeaveClick}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 w-full text-xs py-1"
                >
                  <LogOut className="h-3 w-3 mr-2" />
                  Quitter l'équipe
                </Button>
              )}
            </div>
        )}
      </div>
    </div>
  );
};
