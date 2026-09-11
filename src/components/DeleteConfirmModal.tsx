import React from 'react';
import { Trash2, X } from 'lucide-react';
import { Habit, Language } from '../types';
import { translations, formatNumber } from '../utils/translations';
import { calculateHabitStats } from '../utils/habitMath';

interface DeleteConfirmModalProps {
  habit: Habit | null;
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (habitId: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  habit,
  language,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !habit) return null;

  const t = translations[language];
  const stats = calculateHabitStats(habit, undefined, language);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        id="delete-confirm-modal-content"
        dir={t.dir}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {t.deleteConfirmTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.deleteConfirmWarning}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 mb-5">
          <div className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">
            {habit.name}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>{t.currentAutomaticity} <strong className="text-slate-700 dark:text-slate-200">{t.automaticityRate.replace('{n}', formatNumber(stats.automaticity, language))}</strong></span>
            <span>•</span>
            <span>{t.recordedDaysCount} <strong className="text-slate-700 dark:text-slate-200">{formatNumber(stats.totalCompletedDays, language)}</strong></span>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
          {t.deletePromptText}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            id="cancel-delete-modal-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs cursor-pointer"
          >
            {t.cancel}
          </button>

          <button
            id="confirm-delete-modal-btn"
            type="button"
            onClick={() => {
              onConfirm(habit.id);
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-md shadow-red-600/20 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.yesDelete}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
