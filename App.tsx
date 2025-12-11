import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { GroupCard } from './components/GroupCard';
import { User, Group, DEADLINE_DATE } from './types';
import { 
  getCurrentUser, 
  logoutUser, 
  fetchGroups, 
  joinGroup, 
  voteForLeader 
} from './services/storage';
import { LogOut, Calendar, RefreshCw } from 'lucide-react';
import { Button } from './components/Button';

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
    
    // Check Date
    if (new Date() > DEADLINE_DATE) {
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
             <h1 className="text-xl font-bold text-gray-900 tracking-tight">TeamBuilder</h1>
             <span className="hidden sm:inline-block px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded">
                Phase : {isVotePhase ? 'Vote du Chef' : 'Constitution'}
             </span>
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

        {/* Info Banner */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
             <h2 className="text-lg font-medium text-gray-900">Tableau de Bord du Projet</h2>
             <p className="text-sm text-gray-600 max-w-2xl">
               {isVotePhase 
                 ? "La formation des équipes est terminée. Veuillez discuter avec votre équipe et voter pour un chef." 
                 : "Sélectionnez un groupe à rejoindre. Règles : 1 Ingénieur, 2 MIND, 3 CLIC par équipe. Vous devez remplir les places vides équitablement dans toutes les équipes avant de surcharger."}
             </p>
             <div className="flex items-center gap-2 text-xs text-gray-500">
               <Calendar className="h-3 w-3" />
               Date limite : {DEADLINE_DATE.toLocaleDateString()}
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
          &copy; 2024 TeamBuilder. 
        </div>
      </footer>
    </div>
  );
}

export default App;