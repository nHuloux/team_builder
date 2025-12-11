import React, { useState } from 'react';
import { Group } from '../types';
import { analyzeTeam } from '../services/geminiService';
import { Button } from './Button';
import { Sparkles } from 'lucide-react';

interface TeamAnalyzerProps {
  group: Group;
}

export const TeamAnalyzer: React.FC<TeamAnalyzerProps> = ({ group }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    const result = await analyzeTeam(group);
    setAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          Consultant Équipe IA
        </h4>
        {!analysis && (
          <Button size="sm" variant="secondary" onClick={handleAnalyze} isLoading={loading}>
            Analyser la stratégie
          </Button>
        )}
      </div>
      
      {loading && (
        <p className="text-xs text-indigo-600 animate-pulse">Consultation de Gemini...</p>
      )}

      {analysis && (
        <div className="text-sm text-indigo-800 whitespace-pre-line mt-2 bg-white p-3 rounded border border-indigo-100 shadow-sm">
          {analysis}
        </div>
      )}
    </div>
  );
};