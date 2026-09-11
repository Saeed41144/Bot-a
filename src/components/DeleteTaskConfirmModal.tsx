import React from 'react';
import { Trash2, X, AlertTriangle, Calendar, Tag, CheckSquare, Clock } from 'lucide-react';
import { Task, Language } from '../types';
import { translations, formatNumber } from '../utils/translations';

interface DeleteTaskConfirmModalProps {
  task: Task | null;
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (taskId: string) => void;
}

export const DeleteTaskConfirmModal: React.FC<DeleteTaskConfirmModalProps> = ({
  task,
  language,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !task) return null;

  const t = translations[language];
  const isFa = language === 'fa';
  const isAr = language === 'ar';

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return isFa ? 'اولویت بالا' : isAr ? 'أولوية عالية' : 'High Priority';
      case 'medium':
        return isFa ? 'اولویت متوسط' : isAr ? 'أولوية متوسطة' : 'Medium Priority';
      case 'low':
        return isFa ? 'اولویت پایین' : isAr ? 'أولوية منخفضة' : 'Low Priority';
      default:
        return priority;
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'medium':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'low':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div 
        id="delete-task-confirm-modal-content"
        dir={t.dir}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs border border-rose-200 dark:border-rose-900/50">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {t.deleteTaskConfirmTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.deleteTaskConfirmWarning}
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

        {/* Task Info Card */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 mb-4 space-y-2.5">
          <div className="font-bold text-slate-900 dark:text-white text-sm leading-snug">
            {task.title}
          </div>

          {task.description && (
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
            <span className={`px-2.5 py-0.5 rounded-md font-semibold text-[11px] border ${getPriorityBadgeClass(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>

            {task.category && (
              <span className="px-2.5 py-0.5 rounded-md font-medium text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>{task.category}</span>
              </span>
            )}

            {task.dueDate && (
              <span className="px-2.5 py-0.5 rounded-md font-medium text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{task.dueDate}</span>
              </span>
            )}

            {task.subtasks && task.subtasks.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-md font-medium text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <CheckSquare className="w-3 h-3 text-slate-400" />
                <span>
                  {formatNumber(task.subtasks.length, language)} {isFa ? 'زیرتسک' : isAr ? 'مهمة فرعية' : 'subtasks'}
                </span>
              </span>
            )}

            {task.totalFocusMinutes !== undefined && task.totalFocusMinutes > 0 && (
              <span className="px-2.5 py-0.5 rounded-md font-medium text-[11px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>
                  {formatNumber(task.totalFocusMinutes, language)} {isFa ? 'دقیقه تمرکز' : 'min focus'}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Warning Note */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-xs mb-5 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>{t.deleteTaskPromptText}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            id="cancel-delete-task-modal-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs cursor-pointer"
          >
            {t.cancel}
          </button>

          <button
            id="confirm-delete-task-modal-btn"
            type="button"
            onClick={() => {
              onConfirm(task.id);
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-md shadow-rose-600/20 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.yesDelete}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
