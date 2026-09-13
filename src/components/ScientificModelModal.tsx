import React, { useState } from 'react';
import { X, BookOpen, Brain, TrendingUp, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { Language } from '../types';
import { translations, formatNumber } from '../utils/translations';
import { ResolvedAppearance } from '../utils/themeAppearance';

interface ScientificModelModalProps {
  isOpen: boolean;
  language: Language;
  appearance?: ResolvedAppearance;
  onClose: () => void;
}

export const ScientificModelModal: React.FC<ScientificModelModalProps> = ({
  isOpen,
  language,
  appearance,
  onClose,
}) => {
  const [simulatedDays, setSimulatedDays] = useState(25);

  if (!isOpen) return null;

  const t = translations[language];

  // Calculate simulated automaticity: S = 100 * (1 - e^(-t / 66))
  const simScore = Math.min(100, Math.max(0, Math.round(100 * (1 - Math.exp(-simulatedDays / 66)))));

  const stageLabel =
    simScore >= 70
      ? t.stageAutomatic
      : simScore >= 40
      ? t.stageSemi
      : t.stageForming;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        id="scientific-model-modal"
        dir={t.dir}
        style={appearance?.modalBoxStyle}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100">
                {t.scienceModalTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.scienceModalSubtitle}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          {/* Main Formula Card */}
          <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>{t.automaticityFormulaTitle}</span>
            </div>
            <div className="font-mono text-lg md:text-xl text-center py-3 bg-slate-800 dark:bg-slate-900 rounded-xl text-blue-400 tracking-wider font-bold" dir="ltr">
              Automaticity(t) = 100 × (1 − e^(−t / 66))
            </div>
            <div className="text-xs text-slate-300 mt-3 space-y-1">
              <p>• {t.tEffectiveDays}</p>
              <p>• {t.sixtySixDaysMean}</p>
            </div>
          </div>

          {/* Interactive Calculator Slider */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/70">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                {t.simulatorTitle}
              </span>
              <span className="text-base font-black text-blue-600 dark:text-blue-400">
                {t.effectiveDaysSlider.replace('{n}', formatNumber(simulatedDays, language))}
              </span>
            </div>

            <input 
              type="range"
              min="0"
              max="120"
              value={simulatedDays}
              onChange={(e) => setSimulatedDays(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-4"
            />

            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-700 dark:text-slate-200">
                <span>{t.resultingScore} </span>
                <strong className={`font-black text-base ${
                  simScore >= 70 ? 'text-green-600 dark:text-green-400' : simScore >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'
                }`}>
                  {t.automaticityRate.replace('{n}', formatNumber(simScore, language))}
                </strong>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300">
                {t.stageLabel} <span className="font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 mr-1">
                  {stageLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Key Findings Checklist */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {t.findingsTitle}
            </h3>

            <div className="p-3.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 rounded-xl text-xs flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-green-900 dark:text-green-300 block font-bold mb-0.5">{t.oneDayGraceTitle}</strong>
                <span className="text-green-800 dark:text-green-200/90">
                  {t.oneDayGraceDesc}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/40 rounded-xl text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-yellow-900 dark:text-yellow-300 block font-bold mb-0.5">{t.twoDayPenaltyTitle}</strong>
                <span className="text-yellow-800 dark:text-yellow-200/90">
                  {t.twoDayPenaltyDesc}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-blue-900 dark:text-blue-300 block font-bold mb-0.5">{t.asymptoticCurveTitle}</strong>
                <span className="text-blue-800 dark:text-blue-200/90">
                  {t.asymptoticCurveDesc}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-5 mt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 text-white font-bold hover:bg-slate-800 dark:hover:bg-blue-500 transition text-sm cursor-pointer"
          >
            {t.understoodBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
