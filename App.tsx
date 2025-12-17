
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

// --- Confetti Component (Easter Egg) ---
const Confetti: React.FC = () => {
  const colors = ['#EF476F', '#FFD166', '#06D6A0', '#118AB2', '#073B4C', '#8338EC', '#FF006E'];
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => {
        const left = Math.random() * 100;
        const animDuration = 1 + Math.random() * 2;
        const delay = Math.random() * 0.5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = 5 + Math.random() * 10;
        
        return (
          <div
            key={i}
            className="absolute top-[-20px] rounded-full animate-fall"
            style={{
              left: `${left}%`,
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              animation: `fall ${animDuration}s linear ${delay}s forwards`,
              transform: `rotate(${Math.random() * 360}deg)`
            }}
          />
        );
      })}
      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(720deg);
          }
        }
      `}</style>
    </div>
  );
};

// --- Visual Process Component ---
const TimelineVisual: React.FC<{ config: AppConfig }> = ({ config }) => {
  const [now, setNow] = useState(new Date());

  // Update timer every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  
  const steps = [
    { 
      id: 1, 
      title: "Phase 1 : Constitution", 
      date: `Jusqu'au ${config.coreTeamDeadline.toLocaleDateString('fr-FR')}`, 
      desc: "Formation libre des équipes",
      active: now < config.coreTeamDeadline,
      completed: now >= config.coreTeamDeadline 
    },
    { 
      id: 2, 
      title: "Phase 2 : Consolidation", 
      date: `Jusqu'au ${config.consolidationDeadline.toLocaleDateString('fr-FR')}`, 
      desc: "Équipes figées à la fin",
      active: now >= config.coreTeamDeadline && now < config.consolidationDeadline,
      completed: now >= config.consolidationDeadline
    },
    { 
      id: 3, 
      title: "Phase 3 : Finalisation", 
      date: `Avant ${config.leaderLockDate.toLocaleDateString('fr-FR')}`, 
      desc: "Choix du chef et nom de l'équipe",
      active: now >= config.consolidationDeadline && now < config.leaderLockDate,
      completed: now >= config.leaderLockDate
    },
    { 
      id: 4, 
      title: "Phase 4 : Challenge", 
      date: config.challengeStart.toLocaleDateString('fr-FR'), 
      desc: "Lancement officiel",
      active: now >= config.challengeStart,
      completed: now >= config.challengeStart // Show green check when started
    }
  ];

  // Calculate countdown for active phase
  const activeStep = steps.find(s => s.active);
  let countdownDisplay = null;
  let isUrgent = false;

  if (activeStep && activeStep.id < 4) {
      let deadline: Date | null = null;
      if (activeStep.id === 1) deadline = config.coreTeamDeadline;
      if (activeStep.id === 2) deadline = config.consolidationDeadline;
      if (activeStep.id === 3) deadline = config.leaderLockDate;

      if (deadline) {
          const diff = deadline.getTime() - now.getTime();
          if (diff > 0) {
              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              
              if (days <= 5) {
                isUrgent = true;
              }

              if (days > 0) {
                countdownDisplay = `${days}j ${hours}h`;
              } else {
                countdownDisplay = `${hours}h ${minutes}min`;
              }
          }
      }
  }

  return (
    <div className="w-full py-6 px-4 mb-6 bg-white rounded-lg border border-gray-200 shadow-sm">
       <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
           <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider text-center sm:text-left">Calendrier du Challenge</h3>
           
           {countdownDisplay && (
             <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm border ${
               isUrgent 
                 ? 'bg-red-50 text-red-700 border-red-100' 
                 : 'bg-indigo-50 text-indigo-700 border-indigo-100'
             }`}>
               <Clock className={`w-3.5 h-3.5 mr-1.5 ${isUrgent ? 'text-red-600' : ''}`} />
               <span>Fin de phase dans <span className="font-bold">{countdownDisplay}</span></span>
             </div>
           )}
       </div>

       <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-6 md:gap-0">
          
          {/* Progress Bar Background (Desktop only) */}
          <div className="absolute top-5 left-0 w-full h-1 bg-gray-100 hidden md:block -z-0"></div>

          {steps.map((step, index) => (
             <div key={step.id} className="relative z-10 flex md:flex-col items-center gap-4 md:gap-2 w-full md:w-auto flex-1">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors duration-300 bg-white
                  ${step.active ? 'border-indigo-600 text-indigo-600' : 
                    step.completed ? 'border-green-500 text-green-500 bg-green-50' : 'border-gray-300 text-gray-300'}
                `}>
                   {step.completed ? <CheckCircle2 className="w-6 h-6" /> : <span className="font-bold">{step.id}</span>}
                </div>
                
                <div className="flex flex-col md:items-center text-left md:text-center">
                   <span className={`text-sm font-bold ${step.active ? 'text-indigo-900' : 'text-gray-900'}`}>
                     {step.title}
                   </span>
                   <span className="text-xs font-semibold text-indigo-600 mt-0.5">{step.date}</span>
                   <span className="text-xs text-gray-500 max-w-[150px] mt-1 hidden sm:block">{step.desc}</span>
                </div>

                {/* Mobile Connector Line */}
                {index < steps.length - 1 && (
                  <div className="md:hidden absolute left-5 top-10 bottom-[-24px] w-0.5 bg-gray-200 -z-10"></div>
                )}
             </div>
          ))}
       </div>
    </div>
  );
};

// --- Admin Modal Component ---
const AdminModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  config: AppConfig;
  onSave: (newConfig: AppConfig) => Promise<void>; 
}> = ({ isOpen, onClose, config, onSave }) => {
  const [formData, setFormData] = useState({
    coreTeamDeadline: config.coreTeamDeadline.toISOString().split('T')[0],
    consolidationDeadline: config.consolidationDeadline.toISOString().split('T')[0],
    leaderLockDate: config.leaderLockDate.toISOString().split('T')[0],
    challengeStart: config.challengeStart.toISOString().split('T')[0]
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setFormData({
            coreTeamDeadline: config.coreTeamDeadline.toISOString().split('T')[0],
            consolidationDeadline: config.consolidationDeadline.toISOString().split('T')[0],
            leaderLockDate: config.leaderLockDate.toISOString().split('T')[0],
            challengeStart: config.challengeStart.toISOString().split('T')[0]
        });
    }
  }, [isOpen, config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave({
      coreTeamDeadline: new Date(formData.coreTeamDeadline),
      consolidationDeadline: new Date(formData.consolidationDeadline),
      leaderLockDate: new Date(formData.leaderLockDate),
      challengeStart: new Date(formData.challengeStart)
    });
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Administration Dates</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fin Phase 1 (Constitution)</label>
            <input 
              type="date" 
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={formData.coreTeamDeadline}
              onChange={e => setFormData({...formData, coreTeamDeadline: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fin Phase 2 (Verrouillage Groupes)</label>
            <input 
              type="date" 
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={formData.consolidationDeadline}
              onChange={e => setFormData({...formData, consolidationDeadline: e.target.value})}
            />
            <p className="text-xs text-gray-500 mt-1">Les équipes sont figées après cette date.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fin Phase 3 (Verrouillage Chefs)</label>
            <input 
              type="date" 
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={formData.leaderLockDate}
              onChange={e => setFormData({...formData, leaderLockDate: e.target.value})}
            />
            <p className="text-xs text-gray-500 mt-1">Date limite pour choisir le chef et le nom d'équipe.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Début du Challenge</label>
            <input 
              type="date" 
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={formData.challengeStart}
              onChange={e => setFormData({...formData, challengeStart: e.target.value})}
            />
            <p className="text-xs text-gray-500 mt-1">Date de lancement officiel (Phase 4).</p>
          </div>
          <div className="pt-4 flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" isLoading={isSaving}>Enregistrer</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
  
  // Easter Egg & Game States
  const [titleClicks, setTitleClicks] = useState(0);
  const [isPartyMode, setIsPartyMode] = useState(false);
  const [isSurferMode, setIsSurferMode] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial Load
  useEffect(() => {
    const user = getCurrentUser();
    if (user) setUser(user);
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

    // Sync current user leader status from the latest group data
    setUser(prevUser => {
        if (!prevUser) return null;
        
        let isLeader = false;
        for (const g of groupsData) {
            const member = g.members.find(m => m.id === prevUser.id);
            if (member) {
                isLeader = member.isLeader;
                break;
            }
        }
        
        if (prevUser.isLeader !== isLeader) {
             const updated = { ...prevUser, isLeader };
             localStorage.setItem('teambuilder_current_user', JSON.stringify(updated));
             return updated;
        }
        return prevUser;
    });

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
      alert("La phase de consolidation est terminée. Vous ne pouvez plus changer d'équipe.");
      return;
    }

    setIsActionLoading(true);
    const success = await joinGroup(currentUser.id, groupId);
    if (success) {
      await loadData(); 
      setUser(prev => prev ? { ...prev, groupId } : null);
    }
    setIsActionLoading(false);
  };

  const handleLeaveGroup = async (groupId: number) => {
    if (!currentUser) return;

    if (new Date() > appConfig.consolidationDeadline) {
      alert("La phase de consolidation est terminée. Vous ne pouvez plus quitter l'équipe.");
      return;
    }

    setIsActionLoading(true);

    setGroups(prevGroups => prevGroups.map(g => ({
        ...g,
        members: g.members.filter(m => m.id !== currentUser.id)
    })));
    
    setUser(prev => prev ? ({ ...prev, groupId: null, isLeader: false }) : null);

    const success = await leaveGroup(currentUser.id);
    
    if (success) {
      await loadData();
    } else {
        alert("Erreur lors de la sortie du groupe. Aucune modification n'a été effectuée.");
        await loadData();
        const savedUser = getCurrentUser();
        if (savedUser) setUser(savedUser);
    }
    setIsActionLoading(false);
  };

  const handleAdminRemoveMember = async (userId: string, groupId: number) => {
      // Allow admin to remove user regardless of dates/phases
      // Confirmation removed for faster action
      
      setIsActionLoading(true);
      const success = await leaveGroup(userId);
      if (success) {
          await loadData();
      } else {
          alert("Erreur lors de la suppression du membre.");
      }
      setIsActionLoading(false);
  };

  const handleAssignLeader = async (groupId: number, memberId: string) => {
    if (new Date() > appConfig.leaderLockDate) {
        alert("La date limite pour désigner un chef est dépassée.");
        return;
    }
    
    setIsActionLoading(true);
    const success = await assignLeader(groupId, memberId);
    if (!success) {
      alert("Erreur lors de l'assignation du chef. Vérifiez la console pour plus de détails.");
    }
    await loadData();
    setIsActionLoading(false);
  };

  const handleRenameGroup = async (groupId: number, newName: string) => {
    setIsActionLoading(true);
    const success = await updateGroupName(groupId, newName);
    if (!success) {
      alert("Erreur lors du renommage de l'équipe.");
    }
    await loadData();
    setIsActionLoading(false);
  };

  const handleUpdateConfig = async (newConfig: AppConfig) => {
    const success = await updateAppConfig(newConfig);
    if (success) {
      setAppConfig(newConfig);
    } else {
      alert("Erreur lors de la mise à jour des dates.");
    }
  };
  
  // Easter Egg Logic
  const handleTitleClick = () => {
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    
    setTitleClicks(prev => {
        const newCount = prev + 1;
        if (newCount === 5) {
            setIsPartyMode(true);
            setTimeout(() => {
                setIsPartyMode(false);
                setTitleClicks(0);
            }, 5000); // Party lasts 5 seconds
            return 0;
        }
        return newCount;
    });

    titleTimeoutRef.current = setTimeout(() => {
        setTitleClicks(0);
    }, 1000); // Reset count if no click for 1 second
  };

  const handleBonusOpen = () => {
      // Only allow opening if user is in a group
      if (currentUser?.groupId && currentUser.groupId > 0) {
          setIsBonusModalOpen(true);
      } else {
          alert("Vous devez rejoindre une équipe pour accéder aux Archives.");
      }
  };

  const isAdmin = currentUser?.firstName === 'Nicolas' && currentUser?.lastName === 'Huloux';

  const userGroup = groups.find(g => g.id === currentUser?.groupId);
  const currentGroupName = userGroup?.name || "QG";

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-1000 ${isPartyMode ? 'bg-gradient-to-r from-purple-400 via-pink-500 to-red-500' : 'bg-gray-50'}`}>
      
      {isPartyMode && <Confetti />}
      
      <MiniGame 
        isOpen={isGameOpen} 
        onClose={() => setIsGameOpen(false)} 
        groupName={currentGroupName}
        members={userGroup?.members || []}
        isSurferMode={isSurferMode}
      />

      <BonusModal 
        isOpen={isBonusModalOpen}
        onClose={() => setIsBonusModalOpen(false)}
        groupId={currentUser.groupId || 0}
        groupName={currentGroupName}
      />

      {/* Header */}
      <header className={`bg-white shadow-sm sticky top-0 z-10 transition-opacity ${isPartyMode ? 'bg-opacity-90' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4 select-none cursor-pointer" onClick={handleTitleClick}>
             <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                 MIRA Équipe pour le challenge
                 {isPartyMode && <PartyPopper className="h-6 w-6 text-pink-500 animate-bounce" />}
             </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsAdminModalOpen(true)}
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Admin Dates</span>
              </Button>
            )}

            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 flex items-center justify-end gap-1">
                {currentUser.firstName} {currentUser.lastName}
                {currentUser.isLeader && (
                  isSurferMode ? (
                     <span className="text-sm ml-1" role="img" aria-label="surfer">🏄</span>
                  ) : (
                     <Crown className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  )
                )}
              </p>
              <p className="text-xs text-gray-500">{currentUser.classType}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-2">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative">
        
        {/* Admin Modal */}
        <AdminModal 
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          config={appConfig}
          onSave={handleUpdateConfig}
        />

        {/* Loading Overlay for Actions */}
        {isActionLoading && (
          <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center rounded-lg">
             <div className="bg-white p-4 rounded shadow-lg flex items-center gap-3">
                <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
                <span className="text-sm font-medium">Mise à jour...</span>
             </div>
          </div>
        )}

        {/* Visual Timeline Process */}
        <TimelineVisual config={appConfig} />

        {/* Grid */}
        {isLoading && groups.length === 0 ? (
          <div className="flex justify-center py-20">
             <div className="animate-pulse text-gray-400">Chargement des équipes...</div>
          </div>
        ) : (
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
                onRemoveMember={handleAdminRemoveMember}
                groupLockDate={appConfig.consolidationDeadline}
                leaderLockDate={appConfig.leaderLockDate}
                isSurferMode={isSurferMode}
                isAdmin={isAdmin}
                onOpenGame={() => setIsGameOpen(true)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} <span onClick={() => setIsSurferMode(p => !p)} className="cursor-pointer hover:text-indigo-600 transition-colors select-none" title="Surfer Mode ?">Nicolas Huloux</span> for <span onClick={handleBonusOpen} className="font-bold text-indigo-600 cursor-pointer hover:underline hover:text-indigo-800 transition-colors" title="Accéder aux Archives">MIRA</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
