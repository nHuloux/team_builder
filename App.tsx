
import React, { useState, useEffect, useRef } from 'react';
import { Login } from './components/Login';
import { GroupCard } from './components/GroupCard';
import { MiniGame } from './components/MiniGame';
import { BonusModal } from './components/BonusModal';
import { User, Group, AppConfig, DEFAULT_CORE_TEAM_DEADLINE, DEFAULT_CONSOLIDATION_DEADLINE, DEFAULT_LEADER_LOCK_DATE, DEFAULT_CHALLENGE_START } from './types';
import { 
  getCurrentUser, 
  logoutUser, 
  fetchGroups, 
  joinGroup, 
  leaveGroup,
  assignLeader,
  updateGroupName,
  fetchAppConfig,
  updateAppConfig
} from './services/storage';
import { LogOut, RefreshCw, CheckCircle2, Settings, X, Crown, Clock, PartyPopper } from 'lucide-react';
import { Button } from './components/Button';

function App() {
  const [currentUser, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    coreTeamDeadline: DEFAULT_CORE_TEAM_DEADLINE,
    consolidationDeadline: DEFAULT_CONSOLIDATION_DEADLINE,
    leaderLockDate: DEFAULT_LEADER_LOCK_DATE,
    challengeStart: DEFAULT_CHALLENGE_START
  });
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [isSurferMode, setIsSurferMode] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      console.log("Utilisateur connecté :", user.id);
      setUser(user);
    }
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [groupsData, configData] = await Promise.all([
      fetchGroups(),
      fetchAppConfig()
    ]);
    setGroups(groupsData);
    setAppConfig(configData);
    setIsLoading(false);
  };

  const handleLogin = (user: User) => {
    setUser(user);
    loadData();
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  const handleJoinGroup = async (groupId: number) => {
    if (!currentUser) return;
    if (new Date() > appConfig.consolidationDeadline) {
      alert("Équipes figées.");
      return;
    }
    setIsActionLoading(true);
    const success = await joinGroup(currentUser.id, groupId);
    if (success) {
      await loadData();
      setUser(prev => prev ? { ...prev, groupId } : null);
    } else {
      alert("Erreur BDD : Le bouton n'a pas pu modifier votre groupe. Vérifiez les fonctions SQL.");
    }
    setIsActionLoading(false);
  };

  const handleLeaveGroup = async (groupId: number) => {
    if (!currentUser) return;
    setIsActionLoading(true);
    const success = await leaveGroup(currentUser.id);
    if (success) {
      await loadData();
      setUser(prev => prev ? ({ ...prev, groupId: null, isLeader: false }) : null);
    }
    setIsActionLoading(false);
  };

  const handleAssignLeader = async (gId: number, mId: string) => {
    setIsActionLoading(true);
    if (await assignLeader(gId, mId)) await loadData();
    setIsActionLoading(false);
  };

  const handleRenameGroup = async (gId: number, name: string) => {
    setIsActionLoading(true);
    if (await updateGroupName(gId, name)) await loadData();
    setIsActionLoading(false);
  };

  // Reconnaissance Admin robuste par ID normalisé
  const isAdmin = currentUser?.id?.toLowerCase().includes('nicolas-huloux');

  if (!currentUser) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">MIRA Équipe</h1>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setIsAdminModalOpen(true)}>
                <Settings className="h-4 w-4 mr-2" /> Admin
              </Button>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{currentUser.firstName} {currentUser.lastName}</p>
              <p className="text-xs text-gray-500">{currentUser.classType}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full relative">
        {isActionLoading && (
          <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center">
             <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => (
            <GroupCard 
              key={group.id} 
              group={group} 
              allGroups={groups}
              currentUser={currentUser}
              onJoin={handleJoinGroup}
              onLeave={handleLeaveGroup}
              onAssignLeader={handleAssignLeader}
              onRename={handleRenameGroup}
              groupLockDate={appConfig.consolidationDeadline}
              leaderLockDate={appConfig.leaderLockDate}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
