
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
import { LogOut, RefreshCw, Settings, Crown, PartyPopper } from 'lucide-react';
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
      alert("La phase de constitution est terminée. Les équipes sont figées.");
      return;
    }
    setIsActionLoading(true);
    const success = await joinGroup(currentUser.id, groupId);
    if (success) {
      await loadData();
      setUser(prev => prev ? { ...prev, groupId } : null);
    } else {
      alert("Impossible de rejoindre le groupe. Vérifiez les quotas ou les fonctions SQL.");
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

  const handleBonusOpen = () => {
      if (currentUser?.groupId && currentUser.groupId > 0) {
          setIsBonusModalOpen(true);
      } else {
          alert("Rejoignez une équipe d'abord pour accéder aux Archives !");
      }
  };

  // Admin Check
  const isAdmin = currentUser?.id?.toLowerCase().includes('nicolas-huloux');
  const userGroup = groups.find(g => g.id === currentUser?.groupId);

  if (!currentUser) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      
      {/* Modals de contenu */}
      <MiniGame 
        isOpen={isGameOpen} 
        onClose={() => setIsGameOpen(false)} 
        groupName={userGroup?.name || "Mon Équipe"}
        members={userGroup?.members || []}
        isSurferMode={isSurferMode}
      />

      <BonusModal 
        isOpen={isBonusModalOpen}
        onClose={() => setIsBonusModalOpen(false)}
        groupId={currentUser.groupId || 0}
        groupName={userGroup?.name || ""}
      />

      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            MIRA Équipe
          </h1>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => alert("Édition des dates via Supabase 'challenge_config' pour le moment.")}>
                <Settings className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium flex items-center gap-1">
                {currentUser.firstName} {currentUser.lastName}
                {currentUser.isLeader && <Crown className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
              </p>
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

        {/* Info barre */}
        <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-indigo-800 font-medium">
               Phase actuelle : <span className="font-bold">Constitution des équipes</span> 
               <span className="text-indigo-600 ml-2">(jusqu'au {appConfig.consolidationDeadline.toLocaleDateString('fr-FR')})</span>
            </p>
            {currentUser.groupId ? (
              <div className="flex items-center gap-2 text-sm text-green-700 font-bold bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <PartyPopper className="h-4 w-4" /> Équipe rejointe !
              </div>
            ) : (
              <div className="text-sm text-red-600 font-bold animate-pulse">
                Vous n'avez pas encore d'équipe
              </div>
            )}
        </div>

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
              isSurferMode={isSurferMode}
              isAdmin={isAdmin}
              onOpenGame={() => setIsGameOpen(true)}
            />
          ))}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            &copy; {new Date().getFullYear()} <span onClick={() => setIsSurferMode(!isSurferMode)} className="cursor-pointer hover:text-indigo-600 transition-colors select-none" title="Surfer Mode ?">Nicolas Huloux</span>
          </div>
          <div className="flex items-center gap-4">
             <span onClick={handleBonusOpen} className="font-bold text-indigo-600 cursor-pointer hover:underline hover:text-indigo-800 transition-colors" title="Accéder aux Archives">
               Accéder aux Archives MIRA
             </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
