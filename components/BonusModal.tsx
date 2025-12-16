
import React, { useState, useEffect } from 'react';
import { X, Lock, CheckCircle, Gift, AlertCircle, Save, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { getGroupBonusProgress, saveGroupBonusProgress, getBonusWinner, claimBonusVictory, fetchSolvedTitles, validateTitles } from '../services/storage';

interface BonusModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  groupName: string;
}

export const BonusModal: React.FC<BonusModalProps> = ({ isOpen, onClose, groupId, groupName }) => {
  const TOTAL_STORIES = 20; // Fixed size based on DB logic
  const [inputs, setInputs] = useState<string[]>(Array(TOTAL_STORIES).fill(''));
  const [validation, setValidation] = useState<(boolean | null)[]>(Array(TOTAL_STORIES).fill(null));
  const [isLoading, setIsLoading] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [victoryState, setVictoryState] = useState<'none' | 'winner' | 'late'>('none');
  
  // We no longer store "correctTitles" for validation, only for display of already solved ones.

  useEffect(() => {
    if (isOpen && groupId > 0) {
      loadData();
    }
  }, [isOpen, groupId]);

  const loadData = async () => {
    setIsLoading(true);
    
    // 1. Get IDs of solved stories
    const solvedIds = await getGroupBonusProgress(groupId); // e.g. [1, 5, 20]
    
    // 2. Fetch Titles ONLY for solved IDs (securely)
    const [solvedTitlesData, winnerId] = await Promise.all([
        fetchSolvedTitles(solvedIds),
        getBonusWinner()
    ]);

    // Build Map for display (ID -> Title)
    const titlesMap = new Map<number, string>();
    solvedTitlesData.forEach(t => titlesMap.set(t.id, t.title));

    // Pre-fill solved inputs
    const newInputs = Array(TOTAL_STORIES).fill('');
    const newValidation = Array(TOTAL_STORIES).fill(null);
    let count = 0;

    solvedIds.forEach(id => {
       const title = titlesMap.get(id);
       // Note: Arrays are 0-indexed, IDs are 1-indexed
       const idx = id - 1; 
       if (idx >= 0 && idx < TOTAL_STORIES) {
           newInputs[idx] = title || "Titre trouvé"; // Fallback text if fetch fails
           newValidation[idx] = true;
           count++;
       }
    });

    setInputs(newInputs);
    setValidation(newValidation);
    setSuccessCount(count);

    if (count === TOTAL_STORIES) {
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
    
    // Collect guesses for unsolved items
    const guesses: {id: number, title: string}[] = [];
    inputs.forEach((input, idx) => {
        // Only check if it's not already validated and user typed something
        if (validation[idx] !== true && input.trim() !== '') {
            guesses.push({
                id: idx + 1, // Convert index to ID
                title: input.trim()
            });
        }
    });

    if (guesses.length === 0) {
        setIsLoading(false);
        return;
    }

    // Server-side Validation
    const results = await validateTitles(guesses);

    // Apply results
    const newValidation = [...validation];
    // We need to fetch the newly found titles to display them properly locked
    // (Wait, we can just use what the user typed if it's correct, but fetching is cleaner or we trust the input)
    // Actually, if it's correct, we lock the input with the user's typed value.
    
    const newSolvedIds: number[] = [];

    results.forEach(res => {
        const idx = res.id - 1;
        if (res.is_correct) {
            newValidation[idx] = true;
            newSolvedIds.push(res.id);
        } else {
            newValidation[idx] = false;
        }
    });

    // Merge with existing solved IDs
    const currentSolvedIds = await getGroupBonusProgress(groupId);
    const uniqueSolvedIds = Array.from(new Set([...currentSolvedIds, ...newSolvedIds]));
    
    // Save progress
    if (newSolvedIds.length > 0) {
        await saveGroupBonusProgress(groupId, uniqueSolvedIds);
    }
    
    setValidation(newValidation);
    setSuccessCount(uniqueSolvedIds.length);

    // Check Victory
    if (uniqueSolvedIds.length === TOTAL_STORIES) {
        const isWinner = await claimBonusVictory(groupId);
        if (isWinner) {
            setVictoryState('winner');
        } else {
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
             {/* No "Loading Data" blocking state anymore, we show inputs immediately */}
             
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: TOTAL_STORIES }).map((_, idx) => {
                    const storyId = idx + 1;
                    return (
                        <div key={storyId} className="flex items-center gap-3 bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-400 font-mono text-sm border border-slate-600 shrink-0">
                                #{storyId}
                            </span>
                            <div className="relative flex-1">
                                <input 
                                    type="text"
                                    value={inputs[idx]}
                                    onChange={(e) => handleInputChange(idx, e.target.value)}
                                    disabled={validation[idx] === true}
                                    placeholder={`Titre de l'histoire ${storyId}...`}
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
                    );
                })}
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-900 rounded-b-2xl border-t border-slate-700 flex justify-between items-center">
            <div className="text-slate-400 text-sm">
                Progression : <span className={successCount === TOTAL_STORIES ? "text-green-400 font-bold" : "text-white"}>{successCount}</span> / {TOTAL_STORIES}
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
