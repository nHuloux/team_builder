
import { useState } from 'react';
import { Group, User, ClassType, QUOTAS } from '../types';
import { Button } from './Button';
import { canJoinGroup, updateGroupManifesto } from '../services/storage';
import { Crown, Edit2, Check, X, LogOut, ShieldCheck, Sparkles, MessageSquare, Trophy, Star, Shield, BookOpen } from 'lucide-react';

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
  onRefresh?: () => void;
  isBonusWinner?: boolean;
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
  onRefresh,
  isBonusWinner = false
}) => {
  const userInGroup = group.members.some(m => m.id === currentUser.id);
  const permission = canJoinGroup(allGroups, group.id, currentUser.classType);

  const now = new Date();
  const isLeaderSelectionOpen = now <= leaderLockDate;
  const isGroupLocked = now > groupLockDate;

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(group.name);
  const [isEditingManifesto, setIsEditingManifesto] = useState(false);
  const [tempManifesto, setTempManifesto] = useState(group.manifesto || '');

  const counts = {
    [ClassType.INGENIEUR]: group.members.filter(m => m.classType === ClassType.INGENIEUR).length,
    [ClassType.MIND]: group.members.filter(m => m.classType === ClassType.MIND).length,
    [ClassType.CLIC]: group.members.filter(m => m.classType === ClassType.CLIC).length,
  };

  const hasFounderSeal = counts[ClassType.INGENIEUR] >= 1 &&
    counts[ClassType.MIND] >= 2 &&
    counts[ClassType.CLIC] >= 3;

  const handleSaveName = () => {
    if (tempName.trim()) {
      onRename(group.id, tempName.trim());
      setIsEditingName(false);
    }
  };

  const handleSaveManifesto = async () => {
    if (await updateGroupManifesto(group.id, tempManifesto.trim())) {
      if (onRefresh) onRefresh();
      setIsEditingManifesto(false);
    }
  };

  // Logic to identify founders (first members up to quotas)
  const classCounters: Record<string, number> = {
    [ClassType.INGENIEUR]: 0,
    [ClassType.MIND]: 0,
    [ClassType.CLIC]: 0,
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-2xl shadow-sm border transition-all duration-300 relative ${userInGroup ? 'border-indigo-500 ring-4 ring-indigo-500/5' : 'border-gray-200'
      }`}>

      {/* BONUS WINNER HAT / CHAPEAU DU CODEX */}
      {isBonusWinner && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
          <div className="relative group">
            <div className="absolute inset-0 bg-amber-400 blur-md opacity-50 animate-pulse rounded-full"></div>
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 border-2 border-white relative">
              <Trophy className="w-5 h-5 drop-shadow-sm" />
              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Légende du Codex</span>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 flex-1 relative pt-10">
        {/* GROUP HOMOGENEITY SEAL */}
        {hasFounderSeal && (
          <div className="absolute top-4 right-4 group/seal" title="Groupe Homogène (Sceau MIRA)">
            <div className="bg-emerald-500 text-white p-2.5 rounded-full shadow-lg shadow-emerald-200 animate-in zoom-in duration-500 hover:scale-110 transition-transform cursor-help">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="absolute top-full mt-2 right-0 hidden group-hover/seal:block bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest py-1.5 px-3 rounded-lg shadow-xl z-30 border border-slate-700">
              Sceau d'Homogénéité
            </div>
          </div>
        )}

        <div className="mb-6">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tempName}
                maxLength={30}
                onChange={(e) => setTempName(e.target.value)}
                className="flex-1 text-sm font-bold border-gray-300 border rounded-lg px-3 py-1.5 focus:ring-indigo-500"
                autoFocus
              />
              <button onClick={handleSaveName} className="p-1.5 text-green-600 bg-green-50 rounded-lg hover:bg-green-100"><Check className="h-4 w-4" /></button>
              <button onClick={() => setIsEditingName(false)} className="p-1.5 text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/title">
              <h3 className="text-xl font-black text-slate-950 truncate tracking-tight uppercase">
                {group.name}
              </h3>
              {userInGroup && !isGroupLocked && (
                <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover/title:opacity-100 text-slate-400 hover:text-indigo-600 p-1 transition-opacity">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {group.manifesto ? (
            <p className="text-xs text-indigo-900 italic font-semibold mt-2 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100 leading-relaxed shadow-sm">
              "{group.manifesto}"
            </p>
          ) : hasFounderSeal && userInGroup && (
            <button
              onClick={() => setIsEditingManifesto(true)}
              className="text-[10px] flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 mt-2 font-bold uppercase tracking-tight transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Définir une devise d'équipe
            </button>
          )}

          {isEditingManifesto && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-2 shadow-inner">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Manifeste</p>
              <textarea
                value={tempManifesto}
                onChange={(e) => setTempManifesto(e.target.value)}
                maxLength={100}
                placeholder="Inscrivez votre devise..."
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-950"
                rows={2}
              />
              <div className="flex justify-end gap-3 mt-3">
                <button onClick={() => setIsEditingManifesto(false)} className="text-[11px] font-bold text-slate-500 hover:text-slate-700">Annuler</button>
                <button onClick={handleSaveManifesto} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white px-3 py-1 rounded-md border border-slate-200 shadow-sm">Enregistrer</button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 mb-8">
          {Object.values(ClassType).map((type) => (
            <div key={type}>
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="font-bold text-slate-500 uppercase tracking-tight">{type}</span>
                <span className={`font-bold ${counts[type] >= QUOTAS[type] ? 'text-green-600' : 'text-slate-500'}`}>
                  {counts[type]} / {QUOTAS[type]}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${counts[type] >= QUOTAS[type] ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  style={{ width: `${Math.min((counts[type] / QUOTAS[type]) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
            <span className="flex items-center gap-2">
              Groupe ({group.members.length})
              {group.bonusCompleted && (
                <span title="Codex Complété"><BookOpen className="w-4 h-4 text-indigo-500" /></span>
              )}
            </span>

          </p>
          {group.members.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-2">Recrutement en cours...</p>
          ) : (
            <ul className="space-y-1.5">
              {group.members.map(member => {
                const isMe = member.id === currentUser.id;

                // FOUNDER LOGIC: Member is a founder if they belong to the initial quotas that formed the seal
                const currentCountForClass = classCounters[member.classType];
                const isFounder = hasFounderSeal && currentCountForClass < QUOTAS[member.classType];
                classCounters[member.classType]++;

                return (
                  <li key={member.id} className={`flex justify-between items-center px-3 py-2.5 rounded-xl border transition-all ${isMe ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      <span className={`text-sm font-bold truncate flex items-center gap-1.5 ${isMe ? 'text-indigo-950' : 'text-slate-900'}`}>
                        {member.firstName} {member.lastName}
                        {member.isLeader && <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                        {isFounder && (
                          <span className="text-emerald-500" title="Membre Fondateur (Quotas Prioritaires)">
                            <Shield className="w-3 h-3 fill-emerald-500 shrink-0" />
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                        {member.classType.slice(0, 4)}
                      </span>

                      {userInGroup && isLeaderSelectionOpen && (
                        <button
                          onClick={() => onAssignLeader(group.id, member.id)}
                          className={`p-1.5 rounded-lg transition-all border ${member.isLeader
                            ? 'text-amber-500 bg-amber-50 border-amber-300 shadow-inner scale-110 cursor-default'
                            : 'text-slate-300 bg-white border-slate-200 hover:text-amber-500 hover:border-amber-400 hover:bg-amber-50 hover:scale-110 active:scale-95'
                            }`}
                          disabled={member.isLeader}
                          title={member.isLeader ? "Leader actuel" : "Désigner comme leader"}
                        >
                          <Crown className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className={`p-5 rounded-b-2xl border-t ${userInGroup ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50/50 border-slate-100'}`}>
        {!userInGroup ? (
          <div className="space-y-2">
            <Button
              onClick={() => onJoin(group.id)}
              className="w-full font-bold uppercase tracking-wider py-4 shadow-md"
              disabled={!permission.allowed || isGroupLocked}
              variant={permission.allowed && !isGroupLocked ? 'primary' : 'outline'}
            >
              {isGroupLocked ? "Phase verrouillée" : (permission.allowed ? "Rejoindre le groupe" : 'Quota atteint')}
            </Button>
            {!permission.allowed && !isGroupLocked && <p className="text-[10px] text-red-500 text-center font-bold px-2 leading-tight">{permission.reason}</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-1">
            {!isGroupLocked && (
              <button
                onClick={() => onLeave(group.id)}
                className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-red-100 shadow-sm"
              >
                <LogOut className="h-4 w-4" /> Quitter l'équipe
              </button>
            )}
            {isGroupLocked && (
              <p className="text-xs font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" /> Équipe constituée
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
