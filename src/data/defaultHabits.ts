import { Habit } from '../types';
import { getTodayString } from '../utils/persianDate';

export const HABIT_PRESETS = [
  {
    name: 'نوشیدن ۸ لیوان آب',
    category: 'سلامت',
    iconName: 'Droplets',
    color: '#0284c7', // sky-600
    rewardCoins: 5,
    rewardXp: 3,
  },
  {
    name: '۳۰ دقیقه پیاده‌روی یا ورزش',
    category: 'ورزش',
    iconName: 'Activity',
    color: '#16a34a', // green-600
    rewardCoins: 10,
    rewardXp: 5,
  },
  {
    name: 'خواندن ۱۵ صفحه کتاب',
    category: 'یادگیری',
    iconName: 'BookOpen',
    color: '#d97706', // amber-600
    rewardCoins: 8,
    rewardXp: 4,
  },
  {
    name: '۱۰ دقیقه مدیتیشن و تنفس عمیق',
    category: 'آرامش ذهن',
    iconName: 'Sparkles',
    color: '#9333ea', // purple-600
    rewardCoins: 6,
    rewardXp: 4,
  },
  {
    name: 'یادگیری ۲۰ لغت زبان جدید',
    category: 'آموزش',
    iconName: 'Languages',
    color: '#2563eb', // blue-600
    rewardCoins: 9,
    rewardXp: 5,
  },
  {
    name: 'خوابیدن قبل از ساعت ۱۱ شب',
    category: 'سبک زندگی',
    iconName: 'Moon',
    color: '#4f46e5', // indigo-600
    rewardCoins: 7,
    rewardXp: 4,
  },
  {
    name: 'برنامه‌ریزی و اولویت‌بندی روز بعد',
    category: 'بهره‌وری',
    iconName: 'CheckSquare',
    color: '#ea580c', // orange-600
    rewardCoins: 6,
    rewardXp: 3,
  },
];

export function getInitialHabits(): Habit[] {
  return [];
}

