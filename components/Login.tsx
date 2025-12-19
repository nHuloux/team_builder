
import React, { useState, useEffect } from 'react';
import { User, ClassType, DEFAULT_CORE_TEAM_DEADLINE } from '../types';
import { Button } from './Button';
import { UserCircle, Lock, Clock, AlertTriangle, Users } from 'lucide-react';
import { loginAndCheckUser, getGlobalStats } from '../services/storage';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [classType, setClassType] = useState<ClassType>(ClassType.INGENIEUR);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Urgency State
  const [stats, setStats] = useState<{ [key in ClassType]: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);

  useEffect(() => {
    // Load Stats
    getGlobalStats().then(setStats);

    // Timer Logic
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = DEFAULT_CORE_TEAM_DEADLINE.getTime();
      const distance = target - now;

      if (distance < 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        clearInterval(timer);
      } else {
        setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !password) return;
    setIsLoading(true);
    setError(null);

    // Prepare temp user object
    const tempUser: User = {
      id: `${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      classType
    };

    try {
      const confirmedUser = await loginAndCheckUser(tempUser, password);
      onLogin(confirmedUser);
    } catch (err: any) {
      setError(err.message || "Erreur de connexion. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <UserCircle className="h-10 w-10 text-indigo-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Connexion à la plateforme MIRA Challenge
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Entrez vos coordonnées et définissez un mot de passe pour sécuriser votre choix.
          </p>
        </div>

        {/* URGENCY CARD */}
        <div className="bg-slate-900 rounded-xl p-5 text-white shadow-xl border border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10"><Clock className="w-24 h-24" /></div>

          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-amber-400 w-5 h-5 animate-pulse" />
            <h3 className="font-bold text-amber-400 uppercase tracking-widest text-xs">Statut de la Mission</h3>
          </div>

          {timeLeft && (
            <div className="mb-6 text-center">
              <p className="text-xs text-slate-400 uppercase mb-1">Verrouillage des équipes</p>
              <div className="flex justify-center gap-4 text-center font-mono">
                <div>
                  <span className="text-2xl font-bold block">{timeLeft.d}</span>
                  <span className="text-[10px] text-slate-500">Jours</span>
                </div>
                <div className="text-2xl font-bold">:</div>
                <div>
                  <span className="text-2xl font-bold block">{timeLeft.h.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] text-slate-500">Heures</span>
                </div>
                <div className="text-2xl font-bold">:</div>
                <div>
                  <span className="text-2xl font-bold block">{timeLeft.m.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] text-slate-500">Min</span>
                </div>
                <div className="text-2xl font-bold">:</div>
                <div>
                  <span className="text-2xl font-bold block text-amber-500">{timeLeft.s.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] text-slate-500">Sec</span>
                </div>
              </div>
            </div>
          )}

          {stats && (
            <div className="space-y-3">
              <p className="text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800 pb-1 mb-2">Places Restantes (Temps Réel)</p>
              {Object.values(ClassType).map((type) => {
                const count = stats[type];
                const isLow = count < 3;
                return (
                  <div key={type} className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 flex items-center gap-2">
                      <Users className="w-3 h-3 text-slate-500" /> {type}
                    </span>
                    <span className={`font-bold px-2 py-0.5 rounded ${isLow ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                      {count} dispos
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">Prénom</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 bg-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm mt-1"
                placeholder="Ex: Jean"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Nom</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 bg-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm mt-1"
                placeholder="Ex: Dupont"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="classType" className="block text-sm font-medium text-gray-700">Filière</label>
              <select
                id="classType"
                name="classType"
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={classType}
                onChange={(e) => setClassType(e.target.value as ClassType)}
              >
                {Object.values(ClassType).map((type) => (
                  <option key={type} value={type}>
                    {type === ClassType.MIND ? 'MIND (Communication)' :
                      type === ClassType.CLIC ? 'CLIC (Développement)' :
                        type}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4 relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mot de passe</label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded block w-full px-3 py-2 pl-10 border border-gray-300 bg-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">Pour une première connexion, ce mot de passe sera enregistré.</p>
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              {isLoading ? "Vérification..." : "Accéder à la plateforme"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
