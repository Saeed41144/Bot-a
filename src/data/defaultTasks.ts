import { Task } from '../types';
import { getTodayString } from '../utils/persianDate';

export const TASK_PRESETS = [
  {
    title: 'بررسی ایمیل‌ها و پیام‌های کاری',
    category: 'کاری',
    priority: 'medium' as const,
    rewardCoins: 5,
    rewardXp: 2,
    subtasks: [
      { id: 'sub-1', title: 'پاسخ به پیام‌های اضطراری', completed: false },
      { id: 'sub-2', title: 'بایگانی پیام‌های خوانده‌شده', completed: false },
    ],
  },
  {
    title: 'خرید هفتگی مواد غذایی و میوه',
    category: 'شخصی',
    priority: 'low' as const,
    rewardCoins: 4,
    rewardXp: 2,
    subtasks: [
      { id: 'sub-3', title: 'تهیه فهرست اقلام لازم', completed: false },
      { id: 'sub-4', title: 'خرید از فروشگاه', completed: false },
    ],
  },
  {
    title: 'تکمیل پروژه و ارسال گزارش ماهانه',
    category: 'پروژه',
    priority: 'high' as const,
    rewardCoins: 10,
    rewardXp: 5,
    subtasks: [
      { id: 'sub-5', title: 'جمع‌آوری داده‌ها و آمار', completed: false },
      { id: 'sub-6', title: 'تنظیم پیش‌نویس فایل نهایی', completed: false },
      { id: 'sub-7', title: 'بازبینی و ارسال به مدیر', completed: false },
    ],
  },
  {
    title: 'مرور فصل اول کتاب و خلاصه‌نویسی',
    category: 'مطالعه',
    priority: 'medium' as const,
    rewardCoins: 6,
    rewardXp: 3,
  },
];

export function getInitialTasks(): Task[] {
  return [];
}

