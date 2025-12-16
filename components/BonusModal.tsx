
import React, { useState, useEffect } from 'react';
import { X, Lock, CheckCircle, Gift, AlertCircle, Save } from 'lucide-react';
import { Button } from './Button';
import { STORIES } from './MiniGame';
import { getGroupBonusProgress, saveGroupBonusProgress, getBonusWinner, claimBonusVictory } from '../services/storage';

interface BonusModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  groupName: string;
}

export const BonusModal: React.FC<BonusModalProps> = ({ isOpen, onClose, groupId, groupName }) => {
  const [inputs, setInputs] = useState<string[]>(Array(STORIES.length).fill(''));
  const [validation, setValidation] = useState<(boolean | null)[]>(Array(STORIES.length).fill(null));
  const [isLoading, setIsLoading] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [victoryState, setVictoryState] = useState<'none' | 'winner' | 'late'>('none');

  useEffect(() => {
    if (isOpen && groupId > 0) {
      loadProgress();
    }
  }, [isOpen, groupId]);

  const loadProgress = async () => {
    setIsLoading(true);
    const solvedIds = await getGroupBonusProgress(groupId); // Array of Story IDs (1-20)
    const winnerId = await getBonusWinner();

    const newInputs = [...inputs];
    const newValidation = [...validation];
    let count = 0;

    solvedIds.forEach(id => {
      const idx = id - 1; // Story ID 1 is index 0
      if (idx >= 0 && idx < STORIES.length) {
        newInputs[idx] = STORIES[idx].title;
        newValidation[idx] = true;
        count++;
      }
    });

    setInputs(newInputs);
    setValidation(newValidation);
    setSuccessCount(count);

    if (count === STORIES.length) {
        if (winnerId === groupId) setVictoryState('winner');
        else if (winnerId !== null) setVictoryState('late');
    }

    setIsLoading(false);
  };

  const handleInputChange = (index: number, value: string) => {
    if (validation[index] === true) return; // Locked if correct
    const newInputs = [...inputs];
    newInputs[index] = value;
    setInputs(newInputs);
  };

  const checkAnswers = async () => {
    setIsLoading(true);
    const newValidation = [...validation];
    const solvedIds: number[] = [];
    let newCount = 0;

    // Check Logic
    inputs.forEach((input, idx) => {
      const correctTitle = STORIES[idx].title.trim().toLowerCase();
      const userTitle = input.trim().toLowerCase();
      
      if (correctTitle === userTitle) {
        newValidation[idx] = true;
        solvedIds.push(STORIES[idx].id);
        newCount++;
      } else {
        // Only mark false if they typed something
        newValidation[idx] = input.trim() !== '' ? false : null; 
      }
    });

    setValidation(newValidation);
    setSuccessCount(newCount);

    // Save
    await saveGroupBonusProgress(groupId, solvedIds);

    // Check Victory
    if (newCount === STORIES.length) {
        const isWinner = await claimBonusVictory(groupId);
        if (isWinner) {
            setVictoryState('winner');
        } else {
            // Check who won
            const winnerId = await getBonusWinner();
            if (winnerId === groupId) setVictoryState('winner');
            else setVictoryState('late');
        }
    }

    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/90 z-[60] flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full relative flex flex-col max-h-[90vh] border border-slate-700">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 rounded-t-2xl border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-500/20 p-2 rounded-lg">
                    <Lock className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-wide">LE CODEX DES ARCHIVES</h2>
                    <p className="text-slate-400 text-sm">Récupérez les 20 titres pour débloquer le booster.</p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Victory Banner */}
        {victoryState === 'winner' && (
            <div className="bg-gradient-to-r from-yellow-600 to-amber-500 p-4 text-center animate-pulse">
                <h3 className="text-white font-bold text-lg flex items-center justify-center gap-2">
                    <Gift className="w-6 h-6" />
                    FÉLICITATIONS ! BOOSTER ACTIVÉ !
                </h3>
                <p className="text-yellow-100 text-sm">Votre équipe recevra un avantage majeur au démarrage du challenge.</p>
            </div>
        )}

        {victoryState === 'late' && (
             <div className="bg-slate-700 p-4 text-center border-b border-slate-600">
                <h3 className="text-slate-300 font-bold flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Archives complétées
                </h3>
                <p className="text-slate-400 text-sm">Bravo ! Malheureusement, une autre équipe a déverrouillé le booster avant vous.</p>
            </div>
        )}

        {/* Content - Grid of Inputs */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-800 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STORIES.map((story, idx) => (
                    <div key={story.id} className="flex items-center gap-3 bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-400 font-mono text-sm border border-slate-600 shrink-0">
                            #{story.id}
                        </span>
                        <div className="relative flex-1">
                             <input 
                                type="text"
                                value={inputs[idx]}
                                onChange={(e) => handleInputChange(idx, e.target.value)}
                                disabled={validation[idx] === true}
                                placeholder={`Titre de l'histoire ${story.id}...`}
                                className={`w-full bg-slate-900 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all
                                    ${validation[idx] === true 
                                        ? 'border-green-500/50 text-green-400 font-medium' 
                                        : validation[idx] === false 
                                            ? 'border-red-500/50 text-white focus:ring-red-500'
                                            : 'border-slate-700 text-white focus:ring-indigo-500'
                                    }
                                `}
                             />
                             {validation[idx] === true && (
                                 <CheckCircle className="absolute right-3 top-2.5 w-4 h-4 text-green-500" />
                             )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-900 rounded-b-2xl border-t border-slate-700 flex justify-between items-center">
            <div className="text-slate-400 text-sm">
                Progression : <span className={successCount === 20 ? "text-green-400 font-bold" : "text-white"}>{successCount}</span> / 20
            </div>
            
            <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose}>Fermer</Button>
                {victoryState === 'none' && (
                     <Button 
                        onClick={checkAnswers} 
                        isLoading={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Vérifier & Sauvegarder
                    </Button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
