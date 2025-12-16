
import React, { useState, useEffect, useMemo } from 'react';
import { X, BookOpen, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { Member } from '../types';

interface MiniGameProps {
  isOpen: boolean;
  onClose: () => void;
  groupName?: string;
  members: Member[];
}

interface StoryOption {
  text: string;
  outcome: string;
  emoji: string;
}

export interface Story {
  id: number;
  title: string;
  intro: string; // Uses {0}, {1}, {2} for shuffled members
  options: [StoryOption, StoryOption];
}

export const STORIES: Story[] = [
  {
    id: 1,
    title: "La Machine à Café Maudite",
    intro: "Ce matin, {0} arrive devant la machine à café du QG. Horreur : elle clignote rouge. {1} arrive en panique : 'J'ai essayé de faire un double expresso et ça a commencé à fumer !'. Le projet doit être rendu dans 2h.",
    options: [
      { text: "Réparer avec un trombone", outcome: "{0} tente une opération chirurgicale. Miracle, le café coule ! Mais il a le goût de chaussette. L'équipe est réveillée mais dégoûtée.", emoji: "📎" },
      { text: "Aller au Starbucks", outcome: "{0} part en courant mais revient 45min plus tard. {1} a déjà fini la présentation en buvant de l'eau tiède. Trahison !", emoji: "☕" }
    ]
  },
  {
    id: 2,
    title: "Le Merge Conflict de l'Enfer",
    intro: "{0} vient de pousser son code. Soudain, {1} hurle : 'QUI A TOUCHÉ AU MAIN ?'. Il y a 412 conflits. Le client arrive dans 10 minutes.",
    options: [
      { text: "Force Push", outcome: "{0} tape 'git push --force'. Plus de conflits, mais plus de projet non plus. {1} pleure doucement sous le bureau.", emoji: "🔥" },
      { text: "Tout réécrire", outcome: "L'équipe se met en mode hackathon. {0} tape à 200 mots/minute. Le client adore la démo... qui ne contient que du HTML statique.", emoji: "💻" }
    ]
  },
  {
    id: 3,
    title: "La Panne de Réveil",
    intro: "9h00. Réunion importante. {0} n'est pas là. {1} l'appelle : messagerie. 9h15, la porte s'ouvre...",
    options: [
      { text: "C'est {0} en pyjama", outcome: "{0} explique que son chat a mangé son réveil. {1} valide l'excuse. Le client offre un café. Tout passe crème.", emoji: "😴" },
      { text: "C'est le livreur de pizza", outcome: "{0} avait commandé des pizzas pour 9h du mat' depuis son lit. L'équipe mange froid, {0} arrive à midi frais comme un gardon.", emoji: "🍕" }
    ]
  },
  {
    id: 4,
    title: "Le Bug Fantôme",
    intro: "À chaque fois que {0} présente le projet, ça plante. Quand {1} le présente, ça marche nickel. {0} commence à croire au vaudou.",
    options: [
      { text: "Exorciser l'ordi", outcome: "{0} brûle de la sauge dans l'open space. L'alarme incendie se déclenche. Les pompiers trouvent le bug : un câble mal branché.", emoji: "🧯" },
      { text: "Changer de présentateur", outcome: "{1} devient le visage officiel du projet. {0} devient l'expert de l'ombre. Un duo de choc est né.", emoji: "🤝" }
    ]
  },
  {
    id: 5,
    title: "Le PowerPoint Vide",
    intro: "{0} se lève pour pitcher. Il ouvre le fichier 'FINAL_V12_REAL.pptx'. C'est une page blanche. {1} devient tout pâle.",
    options: [
      { text: "Improviser total", outcome: "{0} mime les slides avec ses bras. {1} fait les bruitages. Le jury est confus mais applaudit l'audace.", emoji: "🎭" },
      { text: "Accuser le WiFi", outcome: "'Ah, le cloud ne charge pas !'. {0} gagne 5 minutes pendant que {1} refait tout le deck en 4G. Sauvetage in extremis.", emoji: "☁️" }
    ]
  },
  {
    id: 6,
    title: "La Chaise qui Grince",
    intro: "L'open space est silencieux. Sauf la chaise de {0} qui fait 'COUIC' à chaque respiration. {1} est au bord de la crise de nerfs.",
    options: [
      { text: "Huiler la chaise", outcome: "{1} vide une burette d'huile. {0} glisse et traverse la pièce jusqu'au bureau du directeur. Strike !", emoji: "🛢️" },
      { text: "Échanger les chaises", outcome: "{1} pique la chaise du chef absent. Le chef revient et s'assoit sur la chaise qui grince. Il vire la chaise, pas l'équipe.", emoji: "🪑" }
    ]
  },
  {
    id: 7,
    title: "Le Repas d'Équipe",
    intro: "{0} propose un resto 'typique'. {1} a un mauvais pressentiment mais suit. L'enseigne clignote 'Chez Gégé - Tripes & Sushi'.",
    options: [
      { text: "Fuir", outcome: "L'équipe court au McDo. {0} est déçu mais {1} est soulagé de ne pas avoir mangé de maki-andouillette.", emoji: "🍔" },
      { text: "Tester l'aventure", outcome: "{0} adore. {1} passe l'après-midi aux toilettes. La productivité chute de 80%.", emoji: "🤢" }
    ]
  },
  {
    id: 8,
    title: "Le Clavier Mécanique",
    intro: "{0} a acheté un clavier gamer 'Blue Switches'. Ça fait le bruit d'une mitraillette. {1} n'entend plus ses pensées.",
    options: [
      { text: "Saboter le clavier", outcome: "{1} enlève la touche 'Espace'. {0} écritdésormaiscommeça. Le code ne compile plus.", emoji: "⌨️" },
      { text: "Acheter un casque", outcome: "{1} met un casque anti-bruit. {0} peut taper fort. {1} n'entend pas l'alarme incendie. Oups.", emoji: "🎧" }
    ]
  },
  {
    id: 9,
    title: "La Mise en Prod du Vendredi",
    intro: "16h55, vendredi. {0} dit : 'Allez, une petite modif rapide'. {1} crie 'NON MALHEUREUX !'. Trop tard, Entrée est pressée.",
    options: [
      { text: "Tout casse", outcome: "Site down. {0} et {1} passent le week-end au bureau avec des pizzas froides. Plus jamais ça.", emoji: "😭" },
      { text: "Ça passe", outcome: "Miracle ! {0} se prend pour un dieu du code. {1} a perdu 3 ans d'espérance de vie.", emoji: "🙏" }
    ]
  },
  {
    id: 10,
    title: "L'Invasion de Post-it",
    intro: "{0} a lu un livre sur l'agilité. Le mur est couvert de post-its. {1} ne retrouve plus la porte de sortie.",
    options: [
      { text: "Ouvrir la fenêtre", outcome: "Courant d'air ! Les post-its volent partout. {0} pleure son Kanban. {1} est secrètement ravi.", emoji: "🌬️" },
      { text: "Tout numériser", outcome: "{1} passe 3h à tout mettre sur Trello. {0} continue de coller des papiers sur son écran. Guerre des méthodes.", emoji: "📝" }
    ]
  },
  {
    id: 11,
    title: "Le Chat du Voisin",
    intro: "Un chat rentre par la fenêtre. Il s'assoit sur le clavier de {0} et supprime la base de données de test. {1} trouve le chat mignon.",
    options: [
      { text: "Adopter le chat", outcome: "Le chat devient la mascotte 'Git'. {0} recrée la BDD. La productivité baisse (trop de caresses).", emoji: "🐈" },
      { text: "Sortir le chat", outcome: "{1} pleure. Le chat revient avec ses copains. Le QG est assiégé.", emoji: "🐾" }
    ]
  },
  {
    id: 12,
    title: "La Playlist de la Discorde",
    intro: "{0} met du Metal à fond. {1} veut du Jazz Lo-Fi. La tension monte. Les écouteurs ont disparu.",
    options: [
      { text: "Compromis : Disney", outcome: "L'équipe chante 'Libérée, Délivrée' en codant. Le projet avance vite mais l'ambiance est... spéciale.", emoji: "❄️" },
      { text: "Silence radio", outcome: "Ambiance monastère. {0} tape du pied nerveusement. {1} s'endort.", emoji: "🔇" }
    ]
  },
  {
    id: 13,
    title: "L'Update Windows",
    intro: "Pleine démo client. L'ordi de {0} affiche : 'Mise à jour 1 sur 405... Ne pas éteindre'. {1} doit meubler.",
    options: [
      { text: "Raconter une blague", outcome: "{1} raconte une blague nulle sur les développeurs. Le client rit poliment. L'ordi redémarre en allemand.", emoji: "🇩🇪" },
      { text: "Dessiner sur papier", outcome: "{0} dessine l'interface sur une nappe en papier. Le client trouve ça 'disruptif' et 'organique'. Succès !", emoji: "✏️" }
    ]
  },
  {
    id: 14,
    title: "Le Vol de Tasse",
    intro: "{0} ne trouve plus sa tasse fétiche 'Best Dev'. Il la voit sur le bureau de {1}, avec du thé vert dedans (sacrilège).",
    options: [
      { text: "Confrontation", outcome: "{0} reprend sa tasse en plein meeting. {1} nie tout en bloc. Guerre froide déclarée.", emoji: "⚔️" },
      { text: "Vengeance", outcome: "{0} cache la souris de {1} dans le faux-plafond. Œil pour œil.", emoji: "🖱️" }
    ]
  },
  {
    id: 15,
    title: "La Typo Comic Sans",
    intro: "{1} a fait toute la maquette en Comic Sans MS 'pour rire'. {0} l'a envoyé au client sans vérifier.",
    options: [
      { text: "Dire que c'est fait exprès", outcome: "'C'est pour le côté humain !'. Le client adore et valide la charte graphique. {0} a envie de hurler.", emoji: "🎨" },
      { text: "Dire qu'on a été piraté", outcome: "Le client panique et change tous ses mots de passe. {1} doit refaire la maquette ce soir.", emoji: "🕵️" }
    ]
  },
  {
    id: 16,
    title: "Le Câble HDMI",
    intro: "Il manque 1cm de câble pour brancher l'écran. {0} tient le projecteur à bout de bras. {1} cherche une solution.",
    options: [
      { text: "Bouger la table", outcome: "La table est vissée au sol. {0} a des crampes. La réunion se fait sur un écran 13 pouces.", emoji: "🤏" },
      { text: "Porter {0}", outcome: "{1} porte {0} sur ses épaules pour atteindre le plafond. Team building extrême !", emoji: "🏋️" }
    ]
  },
  {
    id: 17,
    title: "L'Idée de Génie à 3h du Matin",
    intro: "{0} envoie un message : 'J'ai tout changé, c'est mieux !'. {1} ouvre le projet le matin : c'est en russe.",
    options: [
      { text: "Rollback", outcome: "{1} annule tout. {0} boude. Le code était génial mais incompréhensible.", emoji: "↩️" },
      { text: "Apprendre le russe", outcome: "{1} utilise Google Translate. Le projet devient international. Spassiba !", emoji: "🇷🇺" }
    ]
  },
  {
    id: 18,
    title: "La Clim en Panne",
    intro: "Il fait 40°C. {0} code en short. {1} a mis des glaçons dans son clavier.",
    options: [
      { text: "Ouvrir le frigo", outcome: "L'équipe s'installe dans la cuisine. {0} mange les yaourts de tout le monde. Frais mais risqué.", emoji: "❄️" },
      { text: "Ventilateur USB", outcome: "{1} branche 12 ventilateurs. Le port USB grille. Plus de souris, mais il fait bon.", emoji: "🔌" }
    ]
  },
  {
    id: 19,
    title: "Le Mot de Passe Oublié",
    intro: "{0} a mis un mot de passe Admin super sécurisé. Et l'a oublié. {1} a besoin d'accéder au serveur MAINTENANT.",
    options: [
      { text: "Hacker le système", outcome: "{1} tente '123456'. Ça marche. {0} est la honte de la sécurité informatique.", emoji: "🔓" },
      { text: "Hypnose", outcome: "{1} tente d'hypnotiser {0}. {0} s'endort et ronfle. Échec critique.", emoji: "😵" }
    ]
  },
  {
    id: 20,
    title: "La Victoire",
    intro: "Le projet est fini. {0} veut lancer des confettis. {1} veut juste dormir 48h.",
    options: [
      { text: "Fête", outcome: "{0} met la musique. {1} s'endort sur le canapé au milieu de la fête. Photo dossier assurée.", emoji: "🎉" },
      { text: "Dodo", outcome: "Tout le monde rentre. Le lendemain, {0} et {1} se manquent déjà. C'est ça l'esprit d'équipe.", emoji: "❤️" }
    ]
  }
];

export const MiniGame: React.FC<MiniGameProps> = ({ isOpen, onClose, groupName = "Mon Équipe", members }) => {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [step, setStep] = useState<'intro' | 'result'>('intro');
  const [resultText, setResultText] = useState("");
  const [shuffledMembers, setShuffledMembers] = useState<string[]>([]);

  // 1. Determine Story of the Day based on Date
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 0);
      const diff = today.getTime() - startOfYear.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);
      
      const storyIndex = dayOfYear % STORIES.length;
      setCurrentStory(STORIES[storyIndex]);
      setStep('intro');
      
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
    }
  }, [isOpen, members]);

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

  if (!isOpen || !currentStory) return null;

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
                <div className="space-y-8 animate-in slide-in-from-right duration-300 w-full">
                    <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                         <p className="text-xl text-indigo-900 leading-relaxed font-medium">
                            {resultText}
                        </p>
                    </div>

                    <p className="text-sm text-gray-400 italic">
                        Reviens demain pour une nouvelle aventure !
                    </p>

                    <Button onClick={onClose} className="w-full py-3 text-lg">
                        Fermer le livre
                    </Button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
