
import { useState, useEffect } from 'react';
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
  getBonusWinner
} from './services/storage';
import { LogOut, RefreshCw, Crown, Users, ShieldCheck, Rocket, CheckCircle2, Clock, Radio, Trophy } from 'lucide-react';
import { Button } from './components/Button';

function App() {
  const [currentUser, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [bonusWinnerId, setBonusWinnerId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    coreTeamDeadline: DEFAULT_CORE_TEAM_DEADLINE,
    consolidationDeadline: DEFAULT_CONSOLIDATION_DEADLINE,
    leaderLockDate: DEFAULT_LEADER_LOCK_DATE,
    challengeStart: DEFAULT_CHALLENGE_START
  });
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [isSurferMode, setIsSurferMode] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setUser(user);
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
        const [groupsData, configData, winnerId] = await Promise.all([
          fetchGroups(), 
          fetchAppConfig(),
          getBonusWinner()
        ]);
        setGroups(groupsData);
        setAppConfig(configData);
        setBonusWinnerId(winnerId);
        
        const updatedUser = getCurrentUser();
        if (updatedUser) setUser({ ...updatedUser });
    } catch (e) {
        console.error("Erreur chargement données:", e);
    } finally {
        setIsLoading(false);
    }
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
      alert("La phase de constitution est terminée.");
      return;
    }
    setIsActionLoading(true);
    const success = await joinGroup(currentUser.id, groupId);
    if (success) {
      await loadData();
    } else {
        alert("Impossible de rejoindre ce groupe. Vérifiez les quotas.");
    }
    setIsActionLoading(false);
  };

  const handleLeaveGroup = async (groupId: number) => {
    if (!currentUser) return;
    setIsActionLoading(true);
    const success = await leaveGroup(currentUser.id);
    if (success) {
      await loadData();
    }
    setIsActionLoading(false);
  };

  const handleAssignLeader = async (gId: number, mId: string) => {
    if (!currentUser) return;
    setIsActionLoading(true);
    const success = await assignLeader(gId, mId);
    if (success) {
        await loadData();
    } else {
        alert("Erreur lors de la désignation du chef.");
    }
    setIsActionLoading(false);
  };

  const handleRenameGroup = async (gId: number, name: string) => {
    setIsActionLoading(true);
    if (await updateGroupName(gId, name)) await loadData();
    setIsActionLoading(false);
  };

  const now = new Date();
  const getPhaseStatus = (phase: number) => {
    switch(phase) {
      case 1: return now < appConfig.coreTeamDeadline ? 'current' : 'passed';
      case 2: return now < appConfig.coreTeamDeadline ? 'upcoming' : (now < appConfig.consolidationDeadline ? 'current' : 'passed');
      case 3: return now < appConfig.consolidationDeadline ? 'upcoming' : (now < appConfig.leaderLockDate ? 'current' : 'passed');
      case 4: return now < appConfig.leaderLockDate ? 'upcoming' : 'current';
      default: return 'upcoming';
    }
  };

  const phases = [
    { id: 1, title: 'Phase 1', icon: Users, date: appConfig.coreTeamDeadline, desc: 'Constitution du noyau dur' },
    { id: 2, title: 'Phase 2', icon: ShieldCheck, date: appConfig.consolidationDeadline, desc: 'Consolidation des équipes' },
    { id: 3, title: 'Phase 3', icon: Crown, date: appConfig.leaderLockDate, desc: 'Désignation des leaders' },
    { id: 4, title: 'Challenge', icon: Rocket, date: appConfig.challengeStart, desc: 'Lancement du challenge' }
  ];

  const userGroup = groups.find(g => g.id === currentUser?.groupId);

  if (!currentUser) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      
      <MiniGame isOpen={isGameOpen} onClose={() => setIsGameOpen(false)} groupName={userGroup?.name || "Mon Groupe"} members={userGroup?.members || []} isSurferMode={isSurferMode} />
      <BonusModal isOpen={isBonusModalOpen} onClose={() => setIsBonusModalOpen(false)} groupId={currentUser.groupId || 0} groupName={userGroup?.name || ""} />

      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
                <Radio className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">MIRA Équipes</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold flex items-center justify-end gap-1 text-slate-900 uppercase">
                {currentUser.firstName} {currentUser.lastName}
                {currentUser.isLeader && <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentUser.classType}</p>
            </div>
            <button onClick={handleLogout} className="p-2.5 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-xl hover:bg-red-50"><LogOut className="h-5 w-5" /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full relative">
        {(isActionLoading || isLoading) && (
          <div className="fixed inset-0 bg-white/60 z-50 flex items-center justify-center backdrop-blur-[1px]">
             <RefreshCw className="h-10 w-10 animate-spin text-indigo-600" />
          </div>
        )}

        <section className="mb-14">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                <Clock className="w-8 h-8 text-indigo-600" />
                Planning du Challenge
            </h2>
            <p className="text-slate-500 mt-1 font-medium">Suivez l'avancement de la constitution des équipes.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {phases.map((p) => {
              const status = getPhaseStatus(p.id);
              const Icon = p.icon;
              return (
                <div key={p.id} className={`relative p-6 rounded-3xl border transition-all duration-500 ${
                    status === 'current' ? 'bg-white border-indigo-500 shadow-xl shadow-indigo-100/50 scale-[1.02]' : 'bg-slate-50 border-slate-100 opacity-50'
                  }`}>
                  {status === 'current' && <span className="absolute -top-3 left-8 bg-indigo-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-md shadow-indigo-200">En cours</span>}
                  {status === 'passed' && <CheckCircle2 className="absolute top-4 right-4 w-5 h-5 text-green-500" />}
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-2xl ${status === 'current' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-200 text-slate-400'}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase">{p.title}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{p.date.toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
              onRefresh={loadData}
              isBonusWinner={group.id === bonusWinnerId}
            />
          ))}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-12 py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-8">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            &copy; {new Date().getFullYear()} <span onClick={() => setIsSurferMode(!isSurferMode)} className="cursor-pointer hover:text-indigo-600 transition-colors">Plateforme MIRA Équipes</span>
          </div>
          <div className="flex items-center gap-10">
             <button onClick={() => setIsBonusModalOpen(true)} className="group flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-all">
               <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
               Consulter le Codex
             </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
