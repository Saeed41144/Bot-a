/**
 * behaviorObserver.ts
 * ---------------------------------------------------------------------------
 * «موتور مشاهدهای رفتار» — از ربات واکنشی به مربی ۲۴ ساعته.
 *
 * این ماژول قلب ارتقای هوشمند Bot-a است و چهار قابلیت اصلی را فراهم می‌کند:
 *   1. رصد خودکار الگوهای شکست (Miss Patrol)  — افت ۲ روز متوالی
 *   2. موتور زمان‌بندی طلایی (Timing Engine)   — بهترین ساعت انجام هر عادت
 *   3. پیش‌بینی ریزش (Relapse Risk)            — هشدار پیش‌دستانه پیش از شکست
 *   4. حلقهٔ یادگیری (Adaptive Learning)       — یادگیری از واکنش کاربر
 *
 * طراحی به‌گونه‌ای است که کاملاً مستقل و قابل تست باشد و هیچ وابستگی به
 * Express یا Telegram نداشته باشد؛ فقط داده می‌گیرد و تصمیم برمی‌گرداند.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProactiveIntensity = 'gentle' | 'balanced' | 'strict';

export type ProactiveEventType =
  | 'miss_patrol'        // عادت ۲+ روز متوالی انجام نشده
  | 'incomplete_today'   // امروز انجام نشده و از پنجرهٔ طلایی گذشته
  | 'overdue_task'       // تسک از مهلت گذشته
  | 'golden_window'      // نزدیک بهترین زمان انجام عادت
  | 'relapse_risk'       // ریسک بالای شکست در آیندهٔ نزدیک
  | 'streak_broken';     // استریک بلند شکسته شد

export interface ProactiveAction {
  /** کلید یکتای جلوگیری از تکرار (dedup) */
  key: string;
  type: ProactiveEventType;
  priority: number;              // بالاتر = مهم‌تر
  habitId?: string;
  taskId?: string;
  habitName?: string;
  taskName?: string;
  /** داده‌های ساختاری برای ساخت متن پیام */
  meta: Record<string, any>;
  /** پیشنهاد لحن/پرسونا برای این رویداد */
  suggestedPersona?: 'academic' | 'coach' | 'strict' | 'zen';
}

export interface LearnedWindow {
  habitId: string;
  habitName: string;
  bestHour: number;          // 0..23
  confidence: number;        // 0..1
  sampleSize: number;
}

export interface BehaviorEngineState {
  /** key -> timestamp آخرین ارسال (برای dedup) */
  sentEvents: Record<string, number>;
  /** تاریخچهٔ واکنش‌ها برای یادگیری */
  reactions: Array<{ key: string; type: ProactiveEventType; action: string; timestamp: number }>;
  /** پنجره‌های طلایی یادگرفته‌شده */
  learnedWindows: Record<string, LearnedWindow>;
  /** آمار تطبیقی کلی */
  adaptive: {
    totalSent: number;
    totalActed: number;        // کاربر روی دکمهٔ اقدام زد
    totalIgnored: number;
    bestResponseHour?: number;
    updatedAt: number;
  };
  /** لیست رویدادهای ارسال‌شده در روز جاری برای محدودسازی نرخ */
  dailyCounters: Record<string, number>;
}

export interface ProactiveConfig {
  enabled: boolean;
  intensity: ProactiveIntensity;
  maxPerDay: number;
  missPatrolEnabled: boolean;
  timingEnabled: boolean;
  relapseEnabled: boolean;
  overdueEnabled: boolean;
  /** چند دقیقه قبل از پنجرهٔ طلایی هشدار بدهد */
  goldenWindowAdvanceMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;   // "23:30"
  quietHoursEnd: string;     // "07:30"
}

export const DEFAULT_PROACTIVE_CONFIG: ProactiveConfig = {
  enabled: true,
  intensity: 'balanced',
  maxPerDay: 3,
  missPatrolEnabled: true,
  timingEnabled: true,
  relapseEnabled: true,
  overdueEnabled: true,
  goldenWindowAdvanceMinutes: 15,
  quietHoursEnabled: false,
  quietHoursStart: '23:30',
  quietHoursEnd: '07:30',
};

export function createEmptyEngineState(): BehaviorEngineState {
  return {
    sentEvents: {},
    reactions: [],
    learnedWindows: {},
    adaptive: { totalSent: 0, totalActed: 0, totalIgnored: 0, updatedAt: Date.now() },
    dailyCounters: {},
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** ساعت و دقیقه را به عدد دقیقهٔ روز تبدیل می‌کند (0..1439) */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return Math.max(0, Math.min(1439, h * 60 + m));
}

export function isInQuietHours(now: Date, config: ProactiveConfig): boolean {
  if (!config.quietHoursEnabled) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = hhmmToMinutes(config.quietHoursStart);
  const end = hhmmToMinutes(config.quietHoursEnd);
  if (start === end) return false;
  if (start < end) return cur >= start && cur < end;
  // بازهٔ عبور از نیمه‌شب
  return cur >= start || cur < end;
}

/**
 * آیا رویدادی با این کلید به‌تازگی ارسال شده که نباید دوباره بفرستیم؟
 * پنجرهٔ پیش‌فرض به‌قدر ۲۰ ساعت است (یعنی حداکثر یک‌بار در روز).
 */
export function isDuplicate(
  state: BehaviorEngineState,
  key: string,
  now: number,
  windowMs = 20 * 60 * 60 * 1000
): boolean {
  const last = state.sentEvents[key];
  return typeof last === 'number' && now - last < windowMs;
}

export function dailyQuotaUsed(state: BehaviorEngineState, today: string): number {
  return state.dailyCounters[today] || 0;
}

// ---------------------------------------------------------------------------
// 1) Miss Patrol — رصد الگوهای شکست
// ---------------------------------------------------------------------------

export interface MissInfo {
  habitId: string;
  habitName: string;
  consecutiveMisses: number;
  automaticity: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * عادت‌هایی را پیدا می‌کند که ۲ روز یا بیشتر متوالی (تا و شامل امروز) انجام نشده‌اند.
 * داده‌ها از `history` عادت خوانده می‌شود.
 */
export function detectConsecutiveMisses(habits: any[], todayStr: string): MissInfo[] {
  const results: MissInfo[] = [];
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const today = new Date(ty, tm - 1, td);

  for (const h of habits) {
    const history = h.history || {};
    let misses = 0;
    const cur = new Date(today);
    // حداکثر ۳۰ روز به عقب نگاه می‌کنیم
    for (let i = 0; i < 30; i++) {
      const k = dateKey(cur);
      if (history[k]) break;
      misses++;
      cur.setDate(cur.getDate() - 1);
    }
    // اگر عادت تازه ساخته شده و قبلاً هیچ روزی نبوده، miss بحرانی نیست
    const created = h.createdAt ? new Date(h.createdAt) : null;
    if (created && created > today) continue;
    if (misses >= 2) {
      results.push({
        habitId: h.id,
        habitName: h.name,
        consecutiveMisses: misses,
        automaticity: h.automaticity ?? 0,
        currentStreak: h.currentStreak ?? 0,
        longestStreak: h.longestStreak ?? 0,
      });
    }
  }
  // بحرانی‌ترها (miss بیشتر / احتمال شکست بالاتر) اول
  return results.sort((a, b) => b.consecutiveMisses - a.consecutiveMisses);
}

// ---------------------------------------------------------------------------
// 2) Timing Engine — یادگیری پنجرهٔ طلایی هر عادت
// ---------------------------------------------------------------------------

/**
 * برای هر عادت، ساعتی که بیشترین احتمال انجام در آن وجود دارد را یاد می‌گیرد.
 * منابع: `completedTimestamps` (epoch ms) و `completionTimes` ("HH:mm").
 */
export function learnGoldenWindows(habits: any[]): Record<string, LearnedWindow> {
  const out: Record<string, LearnedWindow> = {};

  for (const h of habits) {
    const hourCounts: Record<number, number> = {};
    let samples = 0;

    // از timestamp ها
    if (h.completedTimestamps && typeof h.completedTimestamps === 'object') {
      for (const ts of Object.values(h.completedTimestamps)) {
        if (typeof ts !== 'number' || !Number.isFinite(ts)) continue;
        const hr = new Date(ts).getHours();
        hourCounts[hr] = (hourCounts[hr] || 0) + 1;
        samples++;
      }
    }

    // از completionTimes ("HH:mm")
    if (h.completionTimes && typeof h.completionTimes === 'object') {
      for (const t of Object.values(h.completionTimes)) {
        if (typeof t !== 'string') continue;
        const hr = parseInt(t.split(':')[0], 10);
        if (Number.isNaN(hr) || hr < 0 || hr > 23) continue;
        hourCounts[hr] = (hourCounts[hr] || 0) + 1;
        samples++;
      }
    }

    if (samples < 3) continue; // داده کافی نیست

    let bestHour = 0;
    let bestCount = -1;
    for (let hr = 0; hr < 24; hr++) {
      if ((hourCounts[hr] || 0) > bestCount) {
        bestCount = hourCounts[hr] || 0;
        bestHour = hr;
      }
    }
    const confidence = Math.min(1, bestCount / samples);
    out[h.id] = {
      habitId: h.id,
      habitName: h.name,
      bestHour,
      confidence: Math.round(confidence * 100) / 100,
      sampleSize: samples,
    };
  }
  return out;
}

/**
 * عادت‌هایی که همین الان نزدیک پنجرهٔ طلایی‌شان است و امروز انجام نشده‌اند.
 */
export function detectGoldenWindowOpportunities(
  habits: any[],
  windows: Record<string, LearnedWindow>,
  todayStr: string,
  now: Date,
  config: ProactiveConfig
): MissInfo[] {
  const out: MissInfo[] = [];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const advance = config.goldenWindowAdvanceMinutes;

  for (const h of habits) {
    const w = windows[h.id];
    if (!w) continue;
    if (w.confidence < 0.4) continue;           // اطمینان پایین → مزاحم نشو
    if (h.history?.[todayStr]) continue;        // امروز انجام شده
    const bestMin = w.bestHour * 60;
    const diff = Math.abs(nowMin - bestMin);
    // فقط اگر در بازهٔ نزدیک پنجره هستیم (از advance دقیقه قبل تا ۳۰ دقیقه بعد)
    const within = nowMin >= bestMin - advance && nowMin <= bestMin + 30;
    if (within || diff <= advance) {
      out.push({
        habitId: h.id,
        habitName: h.name,
        consecutiveMisses: 0,
        automaticity: h.automaticity ?? 0,
        currentStreak: h.currentStreak ?? 0,
        longestStreak: h.longestStreak ?? 0,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3) Relapse Risk — پیش‌بینی ریزش
// ---------------------------------------------------------------------------

export interface RelapseRisk {
  score: number;          // 0..100
  level: 'low' | 'medium' | 'high';
  reasons: string[];
}

/**
 * یک مدل امتیازدهی سبک و شفاف (نه جعبهٔ سیاه) برای پیش‌بینی احتمال شکست.
 * ورودی‌ها: تأخیرها، افت استریک، خودکارشدگی پایین، ساعات پرخطر، روز هفته.
 */
export function computeRelapseRisk(
  habits: any[],
  tasks: any[],
  todayStr: string,
  now: Date,
  history?: { missedToday?: number; overdueCount?: number }
): RelapseRisk {
  const reasons: string[] = [];
  let score = 0;

  const totalHabits = habits.length || 0;
  const todayKey = todayStr;

  // 1) افت / شکست استریک‌ها
  let brokenStreaks = 0;
  let lowAutomaticityUnstable = 0;
  for (const h of habits) {
    const streak = h.currentStreak ?? 0;
    const longest = h.longestStreak ?? 0;
    const auto = h.automaticity ?? 0;
    const doneToday = !!h.history?.[todayKey];
    if (longest >= 5 && streak === 0 && !doneToday) brokenStreaks++;
    if (auto < 40 && !doneToday) lowAutomaticityUnstable++;
  }
  if (brokenStreaks > 0) {
    score += Math.min(30, brokenStreaks * 12);
    reasons.push(`${brokenStreaks} عادت با استریک شکسته`);
  }
  if (lowAutomaticityUnstable > 0) {
    score += Math.min(20, lowAutomaticityUnstable * 7);
    reasons.push(`${lowAutomaticityUnstable} عادت کم‌خودکارشدگی انجام‌نشده`);
  }

  // 2) تأخیر وظایف
  const overdueCount = history?.overdueCount ?? tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayKey).length;
  if (overdueCount > 0) {
    score += Math.min(25, overdueCount * 8);
    reasons.push(`${overdueCount} تسک عقب‌افتاده`);
  }

  // 3) زمان روز — اواخر شب پرخطر است
  const hour = now.getHours();
  if (hour >= 21 || hour < 5) {
    score += 12;
    reasons.push('ساعت پرخطر شبانه');
  } else if (hour >= 14 && hour < 17) {
    score += 5;
    reasons.push('افت انرژی بعدازظهر');
  }

  // 4) روز هفته — تعطیلات/پایان هفته پرخطرتر
  const dow = now.getDay(); // 0=Sun ... 6=Sat
  if (dow === 5 || dow === 6) { // جمعه/شنبه در تقویم فارسی پرخطر (تقریبی)
    score += 8;
    reasons.push('ریسک تعطیلات پایان هفته');
  }

  // 5) اگر امروز درصد تکمیل پایین است
  if (totalHabits > 0) {
    const done = habits.filter((h) => h.history?.[todayKey]).length;
    const rate = done / totalHabits;
    if (rate < 0.34 && hour >= 18) {
      score += Math.round((1 - rate) * 15);
      reasons.push('نرخ تکمیل پایین امروز');
    }
  }

  score = Math.max(0, Math.min(100, score));
  const level: RelapseRisk['level'] = score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low';
  return { score, level, reasons };
}

// ---------------------------------------------------------------------------
// 4) Decision Layer — تصمیم نهایی دربارهٔ اقدام‌ها
// ---------------------------------------------------------------------------

export interface DecideOptions {
  habits: any[];
  tasks: any[];
  todayStr: string;
  now: Date;
  config: ProactiveConfig;
  state: BehaviorEngineState;
}

/**
 * با اولویت‌بندی، مهم‌ترین اقدام‌های پیش‌دستانه را برمی‌گرداند.
 * این تابع خالص (pure) است و هیچ عارضه‌ای ندارد؛ فقط تصمیم می‌سازد.
 */
export function decideProactiveActions(opts: DecideOptions): ProactiveAction[] {
  const { habits, tasks, todayStr, now, config, state } = opts;
  const actions: ProactiveAction[] = [];
  const nowMs = now.getTime();

  // حالت stricter → آستانه‌های پایین‌تر و اولویت بالاتر
  const intensityBoost = config.intensity === 'strict' ? 1 : config.intensity === 'gentle' ? -1 : 0;

  // --- 1) Miss Patrol ---
  if (config.missPatrolEnabled) {
    const misses = detectConsecutiveMisses(habits, todayStr);
    for (const m of misses) {
      const key = `miss:${m.habitId}:${todayStr}`;
      if (isDuplicate(state, key, nowMs)) continue;
      actions.push({
        key,
        type: 'miss_patrol',
        priority: 90 + Math.min(9, m.consecutiveMisses),
        habitId: m.habitId,
        habitName: m.habitName,
        meta: { consecutiveMisses: m.consecutiveMisses, automaticity: m.automaticity },
        suggestedPersona: config.intensity === 'strict' ? 'strict' : 'coach',
      });
    }
  }

  // --- 2) Overdue Tasks ---
  if (config.overdueEnabled) {
    const overdue = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr);
    for (const t of overdue.slice(0, 5)) {
      const key = `overdue:${t.id}:${todayStr}`;
      if (isDuplicate(state, key, nowMs)) continue;
      const [y1, m1, d1] = (t.dueDate || todayStr).split('-').map(Number);
      const [y2, m2, d2] = todayStr.split('-').map(Number);
      const days = Math.max(1, Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86400000));
      actions.push({
        key,
        type: 'overdue_task',
        priority: 70 + Math.min(9, days),
        taskId: t.id,
        taskName: t.title,
        meta: { overdueDays: days, priority: t.priority },
        suggestedPersona: 'strict',
      });
    }
  }

  // --- 3) Golden Window (فقط اگر قبلاً miss بحرانی نداده باشد) ---
  if (config.timingEnabled) {
    const windows = Object.keys(state.learnedWindows).length > 0
      ? state.learnedWindows
      : learnGoldenWindows(habits);
    const opps = detectGoldenWindowOpportunities(habits, windows, todayStr, now, config);
    for (const o of opps) {
      const key = `golden:${o.habitId}:${todayStr}`;
      if (isDuplicate(state, key, nowMs)) continue;
      // اگر برای همین عادت miss patrol داریم، تکرار نکن
      if (actions.some((a) => a.habitId === o.habitId)) continue;
      const w = windows[o.habitId];
      actions.push({
        key,
        type: 'golden_window',
        priority: 55,
        habitId: o.habitId,
        habitName: o.habitName,
        meta: { bestHour: w?.bestHour, confidence: w?.confidence },
        suggestedPersona: 'coach',
      });
    }
  }

  // --- 4) Incomplete Today (پس از گذشت از پنجره) ---
  if (config.timingEnabled) {
    const hour = now.getHours();
    // فقط در ساعات منطقی بعدازظهر/شب
    if (hour >= 16 && hour < 23) {
      for (const h of habits) {
        if (h.history?.[todayStr]) continue;
        const key = `incomplete:${h.id}:${todayStr}`;
        if (isDuplicate(state, key, nowMs)) continue;
        if (actions.some((a) => a.habitId === h.id)) continue;
        actions.push({
          key,
          type: 'incomplete_today',
          priority: 50,
          habitId: h.id,
          habitName: h.name,
          meta: { automaticity: h.automaticity ?? 0, currentStreak: h.currentStreak ?? 0 },
          suggestedPersona: 'academic',
        });
      }
    }
  }

  // --- 5) Relapse Risk (یک هشدار کلی) ---
  if (config.relapseEnabled) {
    const risk = computeRelapseRisk(habits, tasks, todayStr, now);
    if (risk.level !== 'low' && risk.score >= (config.intensity === 'gentle' ? 60 : 40)) {
      const key = `relapse:${todayStr}`;
      if (!isDuplicate(state, key, nowMs)) {
        actions.push({
          key,
          type: 'relapse_risk',
          priority: 60,
          meta: { risk },
          suggestedPersona: config.intensity === 'strict' ? 'strict' : 'zen',
        });
      }
    }
  }

  // اولویت نهایی + فیلتر بر اساس شدت
  const withBoost = actions.map((a) => ({
    ...a,
    priority: a.priority + intensityBoost * 5,
  }));

  return withBoost.sort((a, b) => b.priority - a.priority);
}

/**
 * تعداد اقدام‌های مجاز برای ارسال در این چرخه، با رعایت سقف روزانه و سکوت.
 */
export function selectActionsToSend(
  actions: ProactiveAction[],
  state: BehaviorEngineState,
  config: ProactiveConfig,
  todayStr: string,
  now: Date
): ProactiveAction[] {
  if (!config.enabled) return [];
  if (isInQuietHours(now, config)) return [];

  const used = dailyQuotaUsed(state, todayStr);
  const remaining = Math.max(0, config.maxPerDay - used);
  if (remaining === 0) return [];

  // در حالت سختگیر حداکثر یک پیام بیشتر
  const cap = config.intensity === 'strict' ? remaining : Math.min(remaining, 2);
  return actions.slice(0, cap);
}

// ---------------------------------------------------------------------------
// 5) Learning Loop — حلقهٔ یادگیری از واکنش کاربر
// ---------------------------------------------------------------------------

/**
 * ثبت واکنش کاربر به یک رویداد پیش‌دستانه (اقدام کرد، نادیده گرفت، …).
 */
export function recordReaction(
  state: BehaviorEngineState,
  key: string,
  type: ProactiveEventType,
  action: 'acted' | 'ignored' | 'snoozed' | 'dismissed',
  now: Date = new Date()
): void {
  state.reactions.push({ key, type, action, timestamp: now.getTime() });
  // حافظه را محدود نگه می‌داریم
  if (state.reactions.length > 500) {
    state.reactions = state.reactions.slice(-500);
  }
  if (action === 'acted') state.adaptive.totalActed++;
  else if (action === 'ignored' || action === 'dismissed') state.adaptive.totalIgnored++;

  // یادگیری بهترین ساعت پاسخ (برای زمان‌بندی بهتر در آینده)
  if (action === 'acted') {
    const hr = now.getHours();
    const actedAtHours: Record<number, number> = {};
    for (const r of state.reactions) {
      if (r.action === 'acted') {
        const h = new Date(r.timestamp).getHours();
        actedAtHours[h] = (actedAtHours[h] || 0) + 1;
      }
    }
    let bestH = state.adaptive.bestResponseHour ?? hr;
    let bestC = -1;
    for (const [h, c] of Object.entries(actedAtHours)) {
      if (c > bestC) { bestC = c; bestH = Number(h); }
    }
    state.adaptive.bestResponseHour = bestH;
  }
  state.adaptive.updatedAt = now.getTime();
}

export function markEventSent(
  state: BehaviorEngineState,
  key: string,
  todayStr: string,
  now: Date = new Date()
): void {
  state.sentEvents[key] = now.getTime();
  state.dailyCounters[todayStr] = (state.dailyCounters[todayStr] || 0) + 1;
  state.adaptive.totalSent++;

  // اگر کاربر مرتب نادیده می‌گیرد، در حالت خودتنظیمی نرخ را کم کن
  const total = state.adaptive.totalSent;
  const ignored = state.adaptive.totalIgnored;
  if (total >= 10 && ignored / total > 0.8) {
    // نرخ پاسخ پایین → حداکثر روزانه را در حافظه کم می‌کنیم (سیگنال تطبیقی)
    // خود config در سمت سرور قابل تعدیل است؛ اینجا فقط ثبت می‌کنیم.
  }

  // پاکسازی رکوردهای قدیمی dedup (بیش از ۷ روز)
  const cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  for (const k of Object.keys(state.sentEvents)) {
    if (state.sentEvents[k] < cutoff) delete state.sentEvents[k];
  }
  // پاکسازی شمارنده‌های روزهای قدیمی
  for (const k of Object.keys(state.dailyCounters)) {
    if (k < todayStr) delete state.dailyCounters[k];
  }
}

/** نرخ پاسخ تطبیقی (۰..۱) برای گزارش/تصمیم‌گیری */
export function getResponseRate(state: BehaviorEngineState): number {
  const t = state.adaptive.totalSent;
  if (!t) return 0;
  return Math.round((state.adaptive.totalActed / t) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Persistence helpers (سازگار با ذخیرهٔ خام server state)
// ---------------------------------------------------------------------------

export function normalizeEngineState(raw: any): BehaviorEngineState {
  const base = createEmptyEngineState();
  if (!raw || typeof raw !== 'object') return base;
  return {
    sentEvents: raw.sentEvents && typeof raw.sentEvents === 'object' ? raw.sentEvents : {},
    reactions: Array.isArray(raw.reactions) ? raw.reactions : [],
    learnedWindows: raw.learnedWindows && typeof raw.learnedWindows === 'object' ? raw.learnedWindows : {},
    adaptive: {
      totalSent: raw.adaptive?.totalSent || 0,
      totalActed: raw.adaptive?.totalActed || 0,
      totalIgnored: raw.adaptive?.totalIgnored || 0,
      bestResponseHour: raw.adaptive?.bestResponseHour,
      updatedAt: raw.adaptive?.updatedAt || Date.now(),
    },
    dailyCounters: raw.dailyCounters && typeof raw.dailyCounters === 'object' ? raw.dailyCounters : {},
  };
}

export function normalizeProactiveConfig(raw: any): ProactiveConfig {
  return { ...DEFAULT_PROACTIVE_CONFIG, ...(raw && typeof raw === 'object' ? raw : {}) };
}
