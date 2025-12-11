import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { GroupCard } from './components/GroupCard';
import { User, Group, DEADLINE_DATE, CORE_TEAM_DEADLINE, CHALLENGE_START } from './types';
import { 
  getCurrentUser, 
  logoutUser, 
  fetchGroups, 
  joinGroup, 
  voteForLeader 
} from './services/storage';
import { LogOut, Calendar, RefreshCw, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Button } from './components/Button';

// --- Visual Process Component ---
const TimelineVisual = () => {
  const now = new Date();
  
  const steps = [
    { 
      id: 1, 
      title: "Phase 1 : Constitution", 
      date: "Jusqu'au 1er Fév", 
      desc: "Formation libre des équipes",
      active: now < CORE_TEAM_DEADLINE,
      completed: now >= CORE_TEAM_DEADLINE 
    },
    { 
      id: 2, 
      title: "Phase 2 : Consolidation", 
      date: "1er Fév - 1er Mars", 
      desc: "Noyaux validés / Affectation aléatoire",
      active: now >= CORE_TEAM_DEADLINE && now < DEADLINE_DATE,
      completed: now >= DEADLINE_DATE
    },
    { 
      id: 3, 
      title: "Phase 3 : Vote & Complétion", 
      date: "1er Mars", 
      desc: "Complétion finale et élection du Chef",
      active: now >= DEADLINE_DATE && now < CHALLENGE_START,
      completed: now >= CHALLENGE_START
    },
    { 
      id: 4, 
      title: "Phase 4 : Challenge", 
      date: "23 Mars", 
      desc: "Lancement officiel",
      active: now >= CHALLENGE_START,
      completed: false // Final state
    }
  ];

  return (
    <div className="w-full py-6 px-4 mb-6 bg-white rounded-lg border border-gray-200 shadow-sm">
       <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6 text-center md:text-left">Calendrier du Challenge</h3>
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

function App() {
  const [currentUser, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isVotePhase, setIsVotePhase] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Initial Load
  useEffect(() => {
    const user = getCurrentUser();
    if (user) setUser(user);
    
    // Check Date for Vote Phase (Phase 3)
    if (new Date() >= DEADLINE_DATE) {
      setIsVotePhase(true);
    }
    
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchGroups();
    setGroups(data);
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
    setIsActionLoading(true);
    const success = await joinGroup(currentUser.id, groupId);
    if (success) {
      await loadData();
      // Update local user state specifically for UI consistency
      setUser({ ...currentUser, groupId }); 
    }
    setIsActionLoading(false);
  };

  const handleVote = async (groupId: number, candidateId: string) => {
    setIsActionLoading(true);
    await voteForLeader(groupId, candidateId);
    await loadData();
    setIsActionLoading(false);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold text-gray-900 tracking-tight">MIRA Équipe pour le challenge</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{currentUser.firstName} {currentUser.lastName}</p>
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
        <TimelineVisual />

        {/* Info Banner */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
             <h2 className="text-lg font-medium text-gray-900">
               {isVotePhase ? "Phase 3 : Vote et Finalisation" : "Constitution des Équipes"}
             </h2>
             <p className="text-sm text-gray-600 max-w-3xl">
               {isVotePhase 
                 ? "La phase de constitution libre est terminée. Les équipes doivent être complètes. Discutez avec votre groupe et votez pour votre chef d'équipe." 
                 : "Rejoignez une équipe. Attention : au 1er février (Phase 2), les équipes 'noyaux' (1 Ingénieur, 2 MIND, 3 CLIC) doivent être constituées, sinon l'affectation sera aléatoire pour les personnes restantes."}
             </p>
             <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium bg-indigo-50 w-fit px-2 py-1 rounded">
               <Calendar className="h-3 w-3" />
               Prochaine échéance majeure : {
                 new Date() < CORE_TEAM_DEADLINE 
                   ? `1er Février (Noyaux)` 
                   : (new Date() < DEADLINE_DATE ? "1er Mars (Vote)" : "23 Mars (Challenge)")
               }
             </div>
          </div>
          <div className="flex flex-col gap-2">
            <button 
              onClick={loadData}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-end gap-1"
            >
               <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
          </div>
        </div>

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
                onVote={handleVote}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} MIRA Équipe. 
        </div>
      </footer>
    </div>
  );
}

export default App;