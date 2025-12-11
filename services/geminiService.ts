import { GoogleGenAI } from "@google/genai";
import { Group, ClassType } from "../types";

// In a real scenario, this key should come from a secure backend proxy or environment variable.
// For this demo, we assume process.env.API_KEY is available.
const apiKey = process.env.API_KEY || ''; 

const ai = new GoogleGenAI({ apiKey });

export const analyzeTeam = async (group: Group): Promise<string> => {
  if (!apiKey) return "Clé API non configurée. Veuillez vérifier vos variables d'environnement.";

  const memberList = group.members.map(m => `- ${m.firstName} ${m.lastName} (${m.classType})`).join('\n');
  
  const prompt = `
    Tu es un consultant expert en équipe pour un projet d'ingénierie multidisciplinaire.
    Analyse la composition de l'équipe suivante :
    
    Nom de l'équipe : ${group.name}
    Membres :
    ${memberList}
    
    L'équipe idéale nécessite un mélange de compétences techniques (Ingénieur), de pensée créative/design (MIND), et de capacités informatiques/interactives (CLIC).
    
    Veuillez fournir (en français) :
    1. Une courte évaluation de l'équilibre actuel.
    2. Deux thèmes de projets potentiels qui conviendraient à ce mélange spécifique de profils.
    3. Si l'équipe est incomplète (besoin de minimum 1 Ingénieur, 2 MIND, 3 CLIC), suggère ce qu'ils devraient rechercher chez leur prochaine recrue.
    
    Garde la réponse concise (moins de 200 mots) et encourageante.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Aucune analyse disponible.";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Impossible d'analyser l'équipe pour le moment. Veuillez réessayer plus tard.";
  }
};