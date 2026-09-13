import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Calendar, 
  Filter, 
  Search, 
  Sun, 
  Sunrise, 
  Sunset, 
  Moon, 
  Sparkles,
  Layers
} from 'lucide-react';
import { formatDateStringToPersian, toPersianDigits } from '../utils/persianDate';

export interface CompletionHistoryItem {
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  timestamp?: number;
  label?: string;
}

interface CompletionHistorySectionProps {
  title: string;
  subtitle?: string;
  records: CompletionHistoryItem[];
  themeColor?: 'purple' | 'blue' | 'emerald' | 'amber';
  language?: 'fa' | 'en';
}

type TimeRange = 'all' | '7days' | '30days' | '90days' | 'year';

export const CompletionHistorySection: React.FC<CompletionHistorySectionProps> = ({
  title,
  subtitle,
  records,
  themeColor = 'purple',
  language = 'fa',
}) => {
  const isFa = language === 'fa';
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(8);

  // Theme styling configurations
  const colorStyles = {
    purple: {
      iconBg: 'bg-purple-950 text-purple-400 border-purple-800',
      badgeBg: 'bg-purple-900/60 text-purple-300 border-purple-750',
      pillActive: 'bg-purple-600 text-white font-bold shadow-xs',
      timeBadge: 'bg-purple-950/80 text-purple-300 border-purple-800',
      highlightText: 'text-purple-400',
      bannerBg: 'bg-purple-950/40 border-purple-850',
    },
    blue: {
      iconBg: 'bg-blue-950 text-blue-400 border-blue-800',
      badgeBg: 'bg-blue-900/60 text-blue-300 border-blue-750',
      pillActive: 'bg-blue-600 text-white font-bold shadow-xs',
      timeBadge: 'bg-blue-950/80 text-blue-300 border-blue-800',
      highlightText: 'text-blue-400',
      bannerBg: 'bg-blue-950/40 border-blue-850',
    },
    emerald: {
      iconBg: 'bg-emerald-950 text-emerald-400 border-emerald-800',
      badgeBg: 'bg-emerald-900/60 text-emerald-300 border-emerald-750',
      pillActive: 'bg-emerald-600 text-white font-bold shadow-xs',
      timeBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
      highlightText: 'text-emerald-400',
      bannerBg: 'bg-emerald-950/40 border-emerald-850',
    },
    amber: {
      iconBg: 'bg-amber-950 text-amber-400 border-amber-800',
      badgeBg: 'bg-amber-900/60 text-amber-300 border-amber-750',
      pillActive: 'bg-amber-600 text-white font-bold shadow-xs',
      timeBadge: 'bg-amber-950/80 text-amber-300 border-amber-800',
      highlightText: 'text-amber-400',
      bannerBg: 'bg-amber-950/40 border-amber-850',
    },
  }[themeColor];

  // Helper to get time of day period (Morning, Afternoon, Evening, Night)
  const getTimePeriod = (timeStr?: string) => {
    if (!timeStr) return null;
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (isNaN(hour)) return null;

    if (hour >= 5 && hour < 12) {
      return {
        label: isFa ? 'صبح' : 'Morning',
        icon: Sunrise,
        color: 'text-amber-400 bg-amber-950/60 border-amber-800/80',
        period: 'morning',
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        label: isFa ? 'ظهر و بعدازظهر' : 'Afternoon',
        icon: Sun,
        color: 'text-yellow-400 bg-yellow-950/60 border-yellow-800/80',
        period: 'afternoon',
      };
    } else if (hour >= 17 && hour < 21) {
      return {
        label: isFa ? 'غروب و عصر' : 'Evening',
        icon: Sunset,
        color: 'text-orange-400 bg-orange-950/60 border-orange-800/80',
        period: 'evening',
      };
    } else {
      return {
        label: isFa ? 'شب' : 'Night',
        icon: Moon,
        color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/80',
        period: 'night',
      };
    }
  };

  // Smart Analytics Calculation (Average time, Peak hours, Preferred time period)
  const analytics = useMemo(() => {
    const validTimes: number[] = [];
    const hourCounts: { [hour: number]: number } = {};
    const periodCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    records.forEach((r) => {
      if (r.time) {
        const parts = r.time.split(':');
        if (parts.length >= 2) {
          const h = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (!isNaN(h) && !isNaN(m)) {
            const minutesFromMidnight = h * 60 + m;
            validTimes.push(minutesFromMidnight);
            hourCounts[h] = (hourCounts[h] || 0) + 1;

            if (h >= 5 && h < 12) periodCounts.morning++;
            else if (h >= 12 && h < 17) periodCounts.afternoon++;
            else if (h >= 17 && h < 21) periodCounts.evening++;
            else periodCounts.night++;
          }
        }
      }
    });

    if (validTimes.length === 0) {
      return null;
    }

    // Calculate average time
    const avgMinutes = Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length);
    const avgHour = Math.floor(avgMinutes / 60);
    const avgMin = avgMinutes % 60;
    const avgTimeStr = `${String(avgHour).padStart(2, '0')}:${String(avgMin).padStart(2, '0')}`;

    // Find most frequent hour
    let peakHour = avgHour;
    let maxHourCount = 0;
    Object.entries(hourCounts).forEach(([h, count]) => {
      if (count > maxHourCount) {
        maxHourCount = count;
        peakHour = parseInt(h, 10);
      }
    });

    // Find dominant period
    let dominantPeriodKey: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
    let maxPeriodCount = 0;
    (Object.keys(periodCounts) as Array<'morning' | 'afternoon' | 'evening' | 'night'>).forEach((k) => {
      if (periodCounts[k] > maxPeriodCount) {
        maxPeriodCount = periodCounts[k];
        dominantPeriodKey = k;
      }
    });

    const periodLabels = {
      morning: isFa ? '🌅 صبح‌ها (۵ تا ۱۲)' : '🌅 Mornings (5-12)',
      afternoon: isFa ? '☀️ بعدازظهرها (۱۲ تا ۱۷)' : '☀️ Afternoons (12-17)',
      evening: isFa ? '🌆 عصرها (۱۷ تا ۲۱)' : '🌆 Evenings (17-21)',
      night: isFa ? '🌙 شب‌ها (۲۱ تا ۵)' : '🌙 Nights (21-5)',
    };

    return {
      avgTimeStr,
      peakHourWindow: `${String(peakHour).padStart(2, '0')}:00 - ${String((peakHour + 1) % 24).padStart(2, '0')}:00`,
      dominantPeriod: periodLabels[dominantPeriodKey],
      totalWithTime: validTimes.length,
    };
  }, [records, isFa]);

  // Filtered and searched records
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let list = [...records];

    // Filter by TimeRange
    if (timeRange !== 'all') {
      const msPerDay = 24 * 60 * 60 * 1000;
      const todayTime = new Date(todayStr).getTime();

      list = list.filter((r) => {
        if (!r.date) return false;
        const itemTime = new Date(r.date).getTime();
        const diffDays = (todayTime - itemTime) / msPerDay;

        if (timeRange === '7days') return diffDays <= 7 && diffDays >= 0;
        if (timeRange === '30days') return diffDays <= 30 && diffDays >= 0;
        if (timeRange === '90days') return diffDays <= 90 && diffDays >= 0;
        if (timeRange === 'year') return diffDays <= 365 && diffDays >= 0;
        return true;
      });
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const persianDate = r.date ? formatDateStringToPersian(r.date).toLowerCase() : '';
        const rawDate = (r.date || '').toLowerCase();
        const time = (r.time || '').toLowerCase();
        const label = (r.label || '').toLowerCase();
        return persianDate.includes(q) || rawDate.includes(q) || time.includes(q) || label.includes(q);
      });
    }

    // Ensure sorted descending
    list.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeB.localeCompare(timeA);
    });

    return list;
  }, [records, timeRange, searchQuery]);

  const displayedRecords = useMemo(() => {
    return filteredRecords.slice(0, visibleCount);
  }, [filteredRecords, visibleCount]);

  const hasMore = filteredRecords.length > visibleCount;

  return (
    <div className="p-4.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col gap-3.5 mt-3 shadow-sm transition">
      {/* Header with Title and Toggle */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none group"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition group-hover:scale-105 ${colorStyles.iconBg}`}>
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-white group-hover:text-slate-100 transition">
                {title}
              </h4>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${colorStyles.badgeBg}`}>
                {toPersianDigits(records.length)} {isFa ? 'ثبت کل' : 'total'}
              </span>
              {filteredRecords.length !== records.length && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-700 text-slate-300 border border-slate-600">
                  {toPersianDigits(filteredRecords.length)} {isFa ? 'نتیجه فیلتر' : 'filtered'}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 hidden sm:inline-block">
            {isExpanded ? (isFa ? 'بستن بخش' : 'Collapse') : (isFa ? 'مشاهده جزئیات' : 'Expand')}
          </span>
          <div className="w-7 h-7 rounded-lg bg-slate-700/60 border border-slate-600/80 flex items-center justify-center text-slate-300 group-hover:text-white transition">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-3.5 pt-1 border-t border-slate-700/60 animate-in fade-in duration-200">
          {/* Smart Insights Banner (Average time & Peak Window) */}
          {analytics && (
            <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${colorStyles.bannerBg}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Sparkles className={`w-3.5 h-3.5 ${colorStyles.highlightText}`} />
                  <span>{isFa ? 'میانگین زمان انجام:' : 'Avg completion:'}</span>
                  <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-xs">
                    {isFa ? `ساعت ${toPersianDigits(analytics.avgTimeStr)}` : analytics.avgTimeStr}
                  </span>
                </div>

                <div className="h-3 w-px bg-slate-700 hidden sm:block" />

                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isFa ? 'بازه اوج فعالیت:' : 'Peak window:'}</span>
                  <span className="font-mono text-slate-200 text-[11px] font-bold">
                    {toPersianDigits(analytics.peakHourWindow)}
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-medium text-slate-300 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/70 shrink-0">
                {analytics.dominantPeriod}
              </div>
            </div>
          )}

          {/* Filter Bar & Quick Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {/* Time Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(
                [
                  { id: 'all', labelFa: 'همه', labelEn: 'All' },
                  { id: '7days', labelFa: '۷ روز اخیر', labelEn: '7 Days' },
                  { id: '30days', labelFa: '۳۰ روز اخیر', labelEn: '30 Days' },
                  { id: '90days', labelFa: '۳ ماه اخیر', labelEn: '90 Days' },
                  { id: 'year', labelFa: 'یک سال اخیر', labelEn: '1 Year' },
                ] as Array<{ id: TimeRange; labelFa: string; labelEn: string }>
              ).map((tab) => {
                const isActive = timeRange === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setTimeRange(tab.id);
                      setVisibleCount(8);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs transition shrink-0 ${
                      isActive
                        ? colorStyles.pillActive
                        : 'bg-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-750'
                    }`}
                  >
                    {isFa ? tab.labelFa : tab.labelEn}
                  </button>
                );
              })}
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[150px] sm:w-44">
              <input
                type="text"
                placeholder={isFa ? 'جستجو در ساعت یا تاریخ...' : 'Search date or time...'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(8);
                }}
                className="w-full pl-7 pr-7 py-1 text-xs rounded-lg bg-slate-850 text-slate-200 placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-slate-500 transition"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs px-1"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* List of Entries */}
          {filteredRecords.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs bg-slate-850/60 rounded-xl border border-dashed border-slate-700/60">
              {searchQuery || timeRange !== 'all'
                ? isFa
                  ? 'موردی متناسب با فیلتر یا جستجوی انتخابی یافت نشد.'
                  : 'No records matching the selected filter or search.'
                : isFa
                ? 'هنوز ثبت فعالیتی با جزئیات زمان انجام وجود ندارد.'
                : 'No completion records logged yet.'}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="divide-y divide-slate-700/60 max-h-60 overflow-y-auto rounded-xl border border-slate-700/80 bg-slate-850/70 p-0.5">
                {displayedRecords.map((item, idx) => {
                  const persianDateStr = item.date ? formatDateStringToPersian(item.date) : '';
                  const periodInfo = getTimePeriod(item.time);
                  const PeriodIcon = periodInfo ? periodInfo.icon : null;

                  return (
                    <div
                      key={`${item.date}-${item.time}-${idx}`}
                      className="flex items-center justify-between p-2.5 hover:bg-slate-800/70 transition text-xs gap-2"
                    >
                      {/* Left Date Info */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-200">
                              {persianDateStr}
                            </span>
                            {item.date && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({item.date})
                              </span>
                            )}
                            {item.label && (
                              <span className="text-[10px] text-slate-300 px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700">
                                {item.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Time & Period Badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        {periodInfo && PeriodIcon && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 font-medium hidden sm:flex ${periodInfo.color}`}>
                            <PeriodIcon className="w-3 h-3" />
                            <span>{periodInfo.label}</span>
                          </span>
                        )}

                        {item.time ? (
                          <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-xs ${colorStyles.timeBadge}`}>
                            <Clock className="w-3 h-3" />
                            <span>{isFa ? `ساعت ${toPersianDigits(item.time)}` : item.time}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-medium px-2 py-0.5 rounded-md bg-slate-800 border border-slate-750">
                            {isFa ? 'تکمیل روزانه' : 'Daily Done'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Show More Pagination Controls */}
              {hasMore && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    {isFa
                      ? `نمایش ${toPersianDigits(displayedRecords.length)} از ${toPersianDigits(filteredRecords.length)} مورد`
                      : `Showing ${displayedRecords.length} of ${filteredRecords.length} records`}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 10)}
                      className="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-650 text-slate-200 border border-slate-600 transition font-medium"
                    >
                      {isFa ? 'نمایش ۱۰ مورد دیگر...' : 'Show 10 more...'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleCount(filteredRecords.length)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition"
                    >
                      {isFa ? 'نمایش همه' : 'Show all'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
