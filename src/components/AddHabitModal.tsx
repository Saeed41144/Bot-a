import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Check, 
  Droplets, 
  Activity, 
  BookOpen, 
  Languages as LanguagesIcon, 
  Moon, 
  CheckSquare, 
  Sparkles, 
  Coins, 
  Zap,
  Award
} from 'lucide-react';
import { Habit, Language } from '../types';
import { translations, formatNumber } from '../utils/translations';
import { getTodayString } from '../utils/persianDate';

interface AddHabitModalProps {
  isOpen: boolean;
  language: Language;
  defaultTargetDays?: number;
  onClose: () => void;
  onAddHabit: (habit: Habit) => void;
}

const LOCALIZED_PRESETS: Record<Language, Array<{ 
  name: string; 
  category: string; 
  iconName: string; 
  color: string;
  rewardCoins: number;
  rewardXp: number;
}>> = {
  fa: [
    { name: 'نوشیدن ۸ لیوان آب', category: 'سلامت', iconName: 'Droplets', color: '#0284c7', rewardCoins: 5, rewardXp: 3 },
    { name: '۳۰ دقیقه پیاده‌روی یا ورزش', category: 'ورزش', iconName: 'Activity', color: '#16a34a', rewardCoins: 10, rewardXp: 5 },
    { name: 'خواندن ۱۵ صفحه کتاب', category: 'یادگیری', iconName: 'BookOpen', color: '#d97706', rewardCoins: 8, rewardXp: 4 },
    { name: '۱۰ دقیقه مدیتیشن و تنفس عمیق', category: 'آرامش ذهن', iconName: 'Sparkles', color: '#9333ea', rewardCoins: 6, rewardXp: 4 },
    { name: 'یادگیری ۲۰ لغت زبان جدید', category: 'آموزش', iconName: 'Languages', color: '#2563eb', rewardCoins: 9, rewardXp: 5 },
    { name: 'خوابیدن قبل از ساعت ۱۱ شب', category: 'سبک زندگی', iconName: 'Moon', color: '#4f46e5', rewardCoins: 7, rewardXp: 4 },
    { name: 'برنامه‌ریزی و اولویت‌بندی روز بعد', category: 'بهره‌وری', iconName: 'CheckSquare', color: '#ea580c', rewardCoins: 6, rewardXp: 3 },
  ],
  ar: [
    { name: 'شرب ۸ أكواب ماء يومياً', category: 'صحة', iconName: 'Droplets', color: '#0284c7', rewardCoins: 5, rewardXp: 3 },
    { name: '٣٠ دقيقة رياضة أو مشي', category: 'رياضة', iconName: 'Activity', color: '#16a34a', rewardCoins: 10, rewardXp: 5 },
    { name: 'قراءة ١٥ صفحة من كتاب', category: 'تعلم', iconName: 'BookOpen', color: '#d97706', rewardCoins: 8, rewardXp: 4 },
    { name: '١٠ دقائق تأمل وتنفس عميق', category: 'راحة البال', iconName: 'Sparkles', color: '#9333ea', rewardCoins: 6, rewardXp: 4 },
    { name: 'تعلم ٢٠ كلمة لغة جديدة', category: 'تعليم', iconName: 'Languages', color: '#2563eb', rewardCoins: 9, rewardXp: 5 },
    { name: 'النوم قبل الساعة ١١ مساءً', category: 'نمط حياة', iconName: 'Moon', color: '#4f46e5', rewardCoins: 7, rewardXp: 4 },
    { name: 'التخطيط وتحديد أولويات الغد', category: 'إنتاجية', iconName: 'CheckSquare', color: '#ea580c', rewardCoins: 6, rewardXp: 3 },
  ],
  en: [
    { name: 'Drink 8 glasses of water', category: 'Health', iconName: 'Droplets', color: '#0284c7', rewardCoins: 5, rewardXp: 3 },
    { name: '30 min daily workout / walk', category: 'Fitness', iconName: 'Activity', color: '#16a34a', rewardCoins: 10, rewardXp: 5 },
    { name: 'Read 15 pages of a book', category: 'Learning', iconName: 'BookOpen', color: '#d97706', rewardCoins: 8, rewardXp: 4 },
    { name: '10 min mindful meditation', category: 'Mindfulness', iconName: 'Sparkles', color: '#9333ea', rewardCoins: 6, rewardXp: 4 },
    { name: 'Practice 20 vocabulary words', category: 'Education', iconName: 'Languages', color: '#2563eb', rewardCoins: 9, rewardXp: 5 },
    { name: 'Sleep before 11 PM', category: 'Lifestyle', iconName: 'Moon', color: '#4f46e5', rewardCoins: 7, rewardXp: 4 },
    { name: 'Plan & prioritize next day', category: 'Productivity', iconName: 'CheckSquare', color: '#ea580c', rewardCoins: 6, rewardXp: 3 },
  ],
};

const AVAILABLE_ICONS = [
  { name: 'Activity', icon: Activity },
  { name: 'Droplets', icon: Droplets },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Languages', icon: LanguagesIcon },
  { name: 'Moon', icon: Moon },
  { name: 'CheckSquare', icon: CheckSquare },
];

const COLORS = [
  '#2563eb', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#64748b', // slate
];

const COIN_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const XP_OPTIONS = [1, 2, 3, 4, 5];

export const AddHabitModal: React.FC<AddHabitModalProps> = ({
  isOpen,
  language,
  defaultTargetDays = 66,
  onClose,
  onAddHabit,
}) => {
  const [habitName, setHabitName] = useState('');
  const [category, setCategory] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Activity');
  const [selectedColor, setSelectedColor] = useState('#2563eb');
  const [rewardCoins, setRewardCoins] = useState<number>(10);
  const [rewardXp, setRewardXp] = useState<number>(5);
  const [error, setError] = useState('');

  const t = translations[language];

  if (!isOpen) return null;

  const presets = LOCALIZED_PRESETS[language] || LOCALIZED_PRESETS.fa;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) {
      setError(t.habitTitleError);
      return;
    }

    const defaultCategory = language === 'fa' ? 'عمومی' : language === 'ar' ? 'عام' : 'General';
    const finalCoins = Math.min(10, Math.max(1, rewardCoins || 10));
    const finalXp = Math.min(5, Math.max(1, rewardXp || 5));

    const newHabit: Habit = {
      id: 'habit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: habitName.trim(),
      category: category.trim() || defaultCategory,
      iconName: selectedIcon,
      color: selectedColor,
      createdAt: getTodayString(),
      history: {},
      targetDays: defaultTargetDays || 66,
      rewardCoins: finalCoins,
      rewardXp: finalXp,
    };

    onAddHabit(newHabit);
    setHabitName('');
    setCategory('');
    setRewardCoins(10);
    setRewardXp(5);
    setError('');
    onClose();
  };

  const handleSelectPreset = (preset: typeof presets[0]) => {
    setHabitName(preset.name);
    setCategory(preset.category);
    setSelectedIcon(preset.iconName);
    setSelectedColor(preset.color);
    setRewardCoins(preset.rewardCoins || 10);
    setRewardXp(preset.rewardXp || 5);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        id="add-habit-modal-content"
        dir={t.dir}
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 md:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t.createHabitTitle}</h2>
              <p className="text-xs text-slate-400 dark:text-slate-400">{t.createHabitSubtitle}</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            {t.quickPresetsLabel}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="text-xs py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-200 dark:border-blue-800 border border-transparent text-slate-700 dark:text-slate-300 transition-all font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <span>{preset.name}</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-950/60 px-1 py-0.2 rounded">
                  +{formatNumber(preset.rewardCoins, language)}🪙
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              {t.habitTitleLabel} <span className="text-red-500">*</span>
            </label>
            <input
              id="new-habit-title-input"
              type="text"
              value={habitName}
              onChange={(e) => {
                setHabitName(e.target.value);
                if (error) setError('');
              }}
              placeholder={t.habitTitlePlaceholder}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm font-medium transition-all"
              autoFocus
            />
            {error && (
              <p className="text-xs text-red-500 font-medium mt-1">{error}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              {t.categoryLabel}
            </label>
            <input
              id="new-habit-category-input"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t.categoryPlaceholder}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm transition-all"
            />
          </div>

          {/* Rewards Setup: Coins (1-10) and XP (1-5) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {/* Coins Reward (1 to 10) */}
            <div className="p-3.5 bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-950/40 dark:to-amber-900/20 rounded-2xl border border-amber-300/40 dark:border-amber-700/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {t.rewardCoinsLabel}
                    </label>
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 shadow-xs flex items-center gap-0.5">
                    <Coins className="w-3 h-3" />
                    +{formatNumber(rewardCoins, language)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mb-2.5">
                  {t.rewardCoinsSubtext}
                </p>
              </div>

              {/* Number buttons 1 to 10 */}
              <div className="grid grid-cols-5 gap-1">
                {COIN_OPTIONS.map((val) => {
                  const isSelected = rewardCoins === val;
                  return (
                    <button
                      key={`coin-opt-${val}`}
                      id={`coin-reward-btn-${val}`}
                      type="button"
                      onClick={() => setRewardCoins(val)}
                      className={`h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-400 font-black scale-105'
                          : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {formatNumber(val, language)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* XP Reward (1 to 5) */}
            <div className="p-3.5 bg-gradient-to-br from-indigo-500/10 to-purple-600/5 dark:from-indigo-950/40 dark:to-purple-900/20 rounded-2xl border border-indigo-300/40 dark:border-indigo-700/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {t.rewardXpLabel}
                    </label>
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-600 text-white shadow-xs flex items-center gap-0.5">
                    <Zap className="w-3 h-3" />
                    +{formatNumber(rewardXp, language)} XP
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mb-2.5">
                  {t.rewardXpSubtext}
                </p>
              </div>

              {/* Number buttons 1 to 5 */}
              <div className="grid grid-cols-5 gap-1">
                {XP_OPTIONS.map((val) => {
                  const isSelected = rewardXp === val;
                  return (
                    <button
                      key={`xp-opt-${val}`}
                      id={`xp-reward-btn-${val}`}
                      type="button"
                      onClick={() => setRewardXp(val)}
                      className={`h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400 font-black scale-105'
                          : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {formatNumber(val, language)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              {t.iconLabel}
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_ICONS.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIcon(item.name)}
                    className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 dark:border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-200 dark:ring-blue-900'
                        : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              {t.customColorLabel}
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    selectedColor === color ? 'ring-2 ring-offset-2 ring-slate-600 dark:ring-offset-slate-900 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && (
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Scientific Info Note */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t.scientificNote}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              id="submit-create-habit-btn"
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-slate-900/10 dark:shadow-blue-600/20 text-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.submitAndStart}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
