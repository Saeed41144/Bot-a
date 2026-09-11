import React, { useState, useMemo } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  ListTodo,
  BookOpen,
  Filter,
  Sparkles,
  PieChart,
  History,
  Download,
  Flame,
  Award,
  Film
} from 'lucide-react';
import { UserRewardWallet, Language, RewardTransaction } from '../types';
import { formatNumber } from '../utils/translations';
import { formatDateStringToPersianShort, toPersianDigits } from '../utils/persianDate';

interface CoinReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: UserRewardWallet;
  language: Language;
}

type FilterType = 'all' | 'earn' | 'spend';

export const CoinReportModal: React.FC<CoinReportModalProps> = ({
  isOpen,
  onClose,
  wallet,
  language,
}) => {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isFa = language === 'fa';
  const isAr = language === 'ar';
  const isRtl = isFa || isAr;

  const transactions = useMemo(() => {
    return wallet.transactions || [];
  }, [wallet.transactions]);

  // Breakdown analytics
  const analytics = useMemo(() => {
    let habitEarned = 0;
    let taskEarned = 0;
    let otherEarned = 0;
    let chaptersSpent = 0;
    let novelsSpent = 0;
    let moviesSpent = 0;
    let otherSpent = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'earn' || tx.type === 'bonus') {
        const desc = (tx.description || '').toLowerCase();
        if (desc.includes('عادت') || desc.includes('habit') || tx.id.includes('checkin')) {
          habitEarned += tx.amount;
        } else if (desc.includes('تسک') || desc.includes('task') || tx.id.includes('task')) {
          taskEarned += tx.amount;
        } else {
          otherEarned += tx.amount;
        }
      } else if (tx.type === 'spend') {
        const desc = (tx.description || '').toLowerCase();
        if (desc.includes('فیلم') || desc.includes('movie') || tx.movieId || tx.id.includes('movie')) {
          moviesSpent += tx.amount;
        } else if (desc.includes('فصل') || desc.includes('چپتر') || desc.includes('chapter') || tx.id.includes('ch-')) {
          chaptersSpent += tx.amount;
        } else if (desc.includes('رمان') || desc.includes('novel') || tx.id.includes('buy-')) {
          novelsSpent += tx.amount;
        } else {
          otherSpent += tx.amount;
        }
      }
    });

    const totalEarned = wallet.totalCoinsEarned || (habitEarned + taskEarned + otherEarned);
    const totalSpent = wallet.totalCoinsSpent || (chaptersSpent + novelsSpent + moviesSpent + otherSpent);

    return {
      habitEarned,
      taskEarned,
      otherEarned,
      chaptersSpent,
      novelsSpent,
      moviesSpent,
      otherSpent,
      totalEarned,
      totalSpent,
      balance: wallet.coins || 0,
      totalTransactions: transactions.length,
    };
  }, [transactions, wallet]);

  // Filtered transactions list
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType === 'earn' && tx.type !== 'earn' && tx.type !== 'bonus') return false;
      if (filterType === 'spend' && tx.type !== 'spend') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (tx.description || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [transactions, filterType, searchQuery]);

  if (!isOpen) return null;

  const formatTxDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      if (isFa) {
        return new Intl.DateTimeFormat('fa-IR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date);
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getSourceIcon = (tx: RewardTransaction) => {
    const desc = (tx.description || '').toLowerCase();
    if (tx.type === 'spend') {
      if (desc.includes('فیلم') || desc.includes('movie') || tx.movieId || tx.id.includes('movie')) {
        return <Film className="w-4 h-4 text-rose-400" />;
      }
      return <BookOpen className="w-4 h-4 text-amber-400" />;
    }
    if (desc.includes('عادت') || desc.includes('habit') || tx.id.includes('checkin')) {
      return <Flame className="w-4 h-4 text-orange-400" />;
    }
    if (desc.includes('تسک') || desc.includes('task') || tx.id.includes('task')) {
      return <ListTodo className="w-4 h-4 text-blue-400" />;
    }
    return <Sparkles className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div
      id="coin-report-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0">
              <PieChart className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" />
                  {isFa ? 'گردش مالی و گزارش سکه‌ها' : isAr ? 'تقرير ومصادر العملات' : 'Coins Income & Expense Report'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {isFa ? 'منابع کسب و محل‌های مصرف سکه' : 'Where Coins Came From & Where They Were Spent'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            id="close-coin-report-modal-btn"
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          {/* Top Balance Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Current Balance */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-300">
                  {isFa ? 'موجودی فعلی' : 'Current Balance'}
                </span>
                <Coins className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-white">
                  {formatNumber(analytics.balance, language)}
                </span>
                <span className="text-xs text-amber-400 font-bold">
                  {isFa ? 'سکه' : 'coins'}
                </span>
              </div>
            </div>

            {/* Total Earned */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-300">
                  {isFa ? 'کل سکه‌های دریافتی' : 'Total Earned'}
                </span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-emerald-400">
                  +{formatNumber(analytics.totalEarned, language)}
                </span>
                <span className="text-xs text-emerald-400 font-bold">
                  {isFa ? 'سکه' : 'coins'}
                </span>
              </div>
            </div>

            {/* Total Spent */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent border border-rose-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-rose-300">
                  {isFa ? 'کل سکه‌های خرج‌شده' : 'Total Spent'}
                </span>
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-rose-400">
                  -{formatNumber(analytics.totalSpent, language)}
                </span>
                <span className="text-xs text-rose-400 font-bold">
                  {isFa ? 'سکه' : 'coins'}
                </span>
              </div>
            </div>
          </div>

          {/* Income & Expense Breakdown Grids */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Where coins came from (Income Sources) */}
            <div className="p-4.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-black text-slate-200">
                    {isFa ? 'منابع دریافت سکه‌ها' : 'Income Sources'}
                  </h3>
                </div>
                <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                  +{formatNumber(analytics.totalEarned, language)} 🪙
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Habits */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span className="font-medium text-slate-300">
                      {isFa ? 'انجام و ثبت عادات روزانه' : 'Habit Check-ins'}
                    </span>
                  </div>
                  <span className="font-bold text-emerald-400">
                    +{formatNumber(analytics.habitEarned || (analytics.totalEarned > 0 ? Math.max(0, analytics.totalEarned - analytics.taskEarned) : 0), language)} 🪙
                  </span>
                </div>

                {/* Tasks */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-blue-400" />
                    <span className="font-medium text-slate-300">
                      {isFa ? 'تکمیل تسک‌ها و وظایف' : 'Completed Tasks'}
                    </span>
                  </div>
                  <span className="font-bold text-emerald-400">
                    +{formatNumber(analytics.taskEarned, language)} 🪙
                  </span>
                </div>

                {/* Other / Achievements */}
                {analytics.otherEarned > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span className="font-medium text-slate-300">
                        {isFa ? 'دستاوردهای ویژه و پاداش‌ها' : 'Achievements & Bonuses'}
                      </span>
                    </div>
                    <span className="font-bold text-emerald-400">
                      +{formatNumber(analytics.otherEarned, language)} 🪙
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Where coins were spent (Expenses) */}
            <div className="p-4.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-black text-slate-200">
                    {isFa ? 'محل‌های خرج و مصرف سکه' : 'Expense Breakdown'}
                  </h3>
                </div>
                <span className="text-xs font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                  -{formatNumber(analytics.totalSpent, language)} 🪙
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Movies */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-rose-400" />
                    <span className="font-medium text-slate-300">
                      {isFa ? 'خرید فیلم‌های سینمایی' : 'Movies & Cinema'}
                    </span>
                  </div>
                  <span className="font-bold text-rose-400">
                    -{formatNumber(analytics.moviesSpent, language)} 🪙
                  </span>
                </div>

                {/* Chapters */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span className="font-medium text-slate-300">
                      {isFa ? 'بازگشایی فصل‌ها و چپترها' : 'Novel Chapters'}
                    </span>
                  </div>
                  <span className="font-bold text-rose-400">
                    -{formatNumber(analytics.chaptersSpent, language)} 🪙
                  </span>
                </div>

                {/* Novels */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="font-medium text-slate-300">
                      {isFa ? 'خرید یکجای کل رمان‌ها' : 'Full Novel Unlocks'}
                    </span>
                  </div>
                  <span className="font-bold text-rose-400">
                    -{formatNumber(analytics.novelsSpent, language)} 🪙
                  </span>
                </div>

                {analytics.totalSpent === 0 && (
                  <div className="p-3 text-center text-slate-500 text-[11px]">
                    {isFa ? 'هنوز سکه‌ای در فروشگاه خرج نشده است.' : 'No coins spent in the store yet.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Transaction Logs Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {isFa ? 'ریز تاریخچه تراکنش‌ها' : 'Detailed Transaction Log'}
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold">
                  {formatNumber(filteredTransactions.length, language)}
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isFa ? 'همه' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('earn')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    filterType === 'earn'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>{isFa ? 'دریافتی‌ها (+)' : 'Earned'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('spend')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    filterType === 'spend'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-rose-400'
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{isFa ? 'خرج‌شده‌ها (-)' : 'Spent'}</span>
                </button>
              </div>
            </div>

            {/* List of Transactions */}
            <div className="space-y-2">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.slice(0, 50).map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 ${
                          tx.type === 'spend'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {getSourceIcon(tx)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-100 block">
                          {tx.description}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formatTxDate(tx.timestamp)}
                        </span>
                      </div>
                    </div>

                    <div className="text-left rtl:text-right sm:rtl:text-left shrink-0">
                      <span
                        className={`font-black text-sm block ${
                          tx.type === 'spend' ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {tx.type === 'spend' ? '-' : '+'}{formatNumber(tx.amount, language)} 🪙
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {tx.type === 'spend' 
                          ? (isFa ? 'خرج در فروشگاه' : 'Spent') 
                          : (isFa ? 'پاداش دریافت شد' : 'Earned')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-slate-500 text-xs">
                  {isFa ? 'هیچ تراکنشی مطابق با این فیلتر یافت نشد.' : 'No transactions found with this filter.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="text-amber-400 flex items-center gap-1.5 font-bold">
            <Coins className="w-4 h-4" />
            <span>{isFa ? 'گزارش لحظه‌ای کیف‌پول و شفافیت گردش سکه‌ها' : 'Real-time Wallet Transparency Report'}</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            {isFa ? 'بستن' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
