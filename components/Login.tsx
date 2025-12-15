
import React, { useState } from 'react';
import { User, ClassType } from '../types';
import { Button } from './Button';
import { UserCircle, Lock } from 'lucide-react';
import { loginAndCheckUser } from '../services/storage';

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
