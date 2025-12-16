
import React, { useState, useEffect, useMemo } from 'react';
import { X, BookOpen, ChevronRight, Binary, ScanEye, Save, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Member, Story, StoryOption } from '../types';
import { fetchStory } from '../services/storage';

interface MiniGameProps {
  isOpen: boolean;
  onClose: () => void;
  groupName?: string;
  members: Member[];
}

export const MiniGame: React.FC<MiniGameProps> = ({ isOpen, onClose, groupName = "Mon Équipe", members }) => {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'intro' | 'result'>('intro');
  const [resultText, setResultText] = useState("");
  const [shuffledMembers, setShuffledMembers] = useState<string[]>([]);
  
  // Decryption State
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedId, setDecryptedId] = useState<number | null>(null);
  const [displayId, setDisplayId] = useState("00");

  // 1. Determine Story of the Day based on Date
  useEffect(() => {
    if (isOpen) {
      loadDailyStory();
    }
  }, [isOpen]);

  const loadDailyStory = async () => {
    setLoading(true);
    // Calculate Story ID
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    // We assume 20 stories in DB. IDs are 1-20.
    // Modulo logic: day 0 -> index 0 -> ID 1
    const TOTAL_DB_STORIES = 20;
    const storyId = (dayOfYear % TOTAL_DB_STORIES) + 1;
    
    const story = await fetchStory(storyId);
    
    if (story) {
        setCurrentStory(story);
        prepareMembers();
        setStep('intro');
        setDecryptedId(null);
        setIsDecrypting(false);
        setDisplayId("00");
    } else {
        // Fallback or error handling
        console.error("Could not fetch story for ID", storyId);
    }
    setLoading(false);
  };

  const prepareMembers = () => {
      // Shuffle members for random role assignment
      const names = members.length > 0 ? members.map(m => m.firstName) : ["Un Stagiaire", "Le Chef", "L'Inconnu"];
      // Fisher-Yates shuffle
      const shuffled = [...names];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Ensure we have enough names by cycling if group is small
      while (shuffled.length < 3) {
         shuffled.push(shuffled[shuffled.length % names.length]);
      }
      setShuffledMembers(shuffled);
  };

  // Decryption Animation Effect
  useEffect(() => {
    if (isDecrypting && currentStory) {
      const duration = 2000; // 2 seconds
      const interval = 50;
      let elapsed = 0;

      const timer = setInterval(() => {
        elapsed += interval;
        // Random 2 digit number
        setDisplayId(Math.floor(Math.random() * 99).toString().padStart(2, '0'));

        if (elapsed >= duration) {
          clearInterval(timer);
          setDisplayId(currentStory.id.toString());
          setDecryptedId(currentStory.id);
          setIsDecrypting(false);
        }
      }, interval);

      return () => clearInterval(timer);
    }
  }, [isDecrypting, currentStory]);


  // Helper to replace {0}, {1} with names
  const formatText = (text: string) => {
    return text.replace(/\{(\d+)\}/g, (match, index) => {
      const i = parseInt(index, 10);
      return shuffledMembers[i % shuffledMembers.length] || "Quelqu'un";
    });
  };

  const handleChoice = (option: StoryOption) => {
    setResultText(formatText(option.outcome));
    setStep('result');
  };

  const startDecryption = () => {
    setIsDecrypting(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full relative overflow-hidden flex flex-col min-h-[400px]">
        
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white text-center relative">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            >
                <X className="w-6 h-6" />
            </button>
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-90" />
            <h2 className="text-xl font-bold tracking-tight">L'Histoire du Jour</h2>
            <p className="text-indigo-200 text-sm mt-1">{groupName} • {new Date().toLocaleDateString('fr-FR')}</p>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 flex flex-col justify-center items-center text-center">
            
            {loading || !currentStory ? (
                <div className="flex flex-col items-center gap-4 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p>Chargement de l'archive...</p>
                </div>
            ) : (
                <>
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 leading-tight">
                        {currentStory.title}
                    </h3>

                    {step === 'intro' ? (
                        <div className="space-y-8 animate-in slide-in-from-right duration-300">
                            <p className="text-lg text-gray-600 leading-relaxed">
                                {formatText(currentStory.intro)}
                            </p>
                            
                            <div className="grid grid-cols-1 gap-4 w-full">
                                {currentStory.options.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleChoice(opt)}
                                        className="group relative w-full bg-gray-50 hover:bg-indigo-50 border-2 border-gray-200 hover:border-indigo-200 p-4 rounded-xl transition-all duration-200 text-left flex items-center gap-4 hover:shadow-md"
                                    >
                                        <span className="text-3xl group-hover:scale-110 transition-transform duration-200 block">
                                            {opt.emoji}
                                        </span>
                                        <span className="font-semibold text-gray-700 group-hover:text-indigo-700">
                                            {opt.text}
                                        </span>
                                        <ChevronRight className="w-5 h-5 text-gray-300 ml-auto group-hover:text-indigo-400" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300 w-full flex flex-col items-center">
                            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 w-full">
                                <p className="text-xl text-indigo-900 leading-relaxed font-medium">
                                    {resultText}
                                </p>
                            </div>

                            {/* Decryption Section */}
                            <div className="w-full bg-slate-900 rounded-xl p-4 text-white border border-slate-700 shadow-inner relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-30"></div>
                                
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest mb-1">
                                        <Binary className="w-4 h-4" />
                                        Trace Mémoire Identifiée
                                    </div>

                                    {decryptedId === null && !isDecrypting ? (
                                        <button 
                                            onClick={startDecryption}
                                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg hover:shadow-indigo-500/30 animate-pulse"
                                        >
                                            <ScanEye className="w-5 h-5" />
                                            ANALYSER LE CODE
                                        </button>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <span className={`text-4xl font-mono font-black ${decryptedId ? 'text-green-400' : 'text-indigo-400'}`}>
                                                #{displayId}
                                            </span>
                                            {decryptedId && (
                                                <span className="text-green-400 text-xs font-bold mt-1 animate-in fade-in zoom-in">
                                                    ARCHIVE DÉVERROUILLÉE
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {decryptedId && (
                                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    <Save className="w-3 h-3" />
                                    Notez ce numéro dans le Codex (MIRA)
                                </div>
                            )}

                            <Button onClick={onClose} className="w-full py-3 text-lg mt-2" variant="secondary">
                                Fermer le livre
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};
