/**
 * proactiveEngine.ts
 * ---------------------------------------------------------------------------
 * لایهٔ اجرای مربی پیش‌دستانه (Proactive Coach Runtime).
 *
 * این ماژول تصمیم‌های behaviorObserver را به پیام‌های واقعی تلگرام تبدیل
 * می‌کند، آن‌ها را با رعایت سکوت/سقف روزانه می‌فرستد و واکنش کاربر را برای
 * حلقهٔ یادگیری ثبت می‌نماید.
 *
 * وابستگی‌ها به‌صورت تزریق‌شده (runtime) دریافت می‌شوند تا هیچ import دور
 * (circular) با server.ts نداشته باشیم.
 */

import {
  BehaviorEngineState,
  ProactiveAction,
  ProactiveConfig,
  DEFAULT_PROACTIVE_CONFIG,
  decideProactiveActions,
  selectActionsToSend,
  markEventSent,
  normalizeEngineState,
  normalizeProactiveConfig,
  recordReaction,
  learnGoldenWindows,
  computeRelapseRisk,
} from './behaviorObserver';

// ---------------------------------------------------------------------------
// Runtime adapter (پیاده‌سازی در server.ts)
// ---------------------------------------------------------------------------

export interface ProactiveRuntime {
  /** دسترسی به state زندهٔ سرور */
  getState: () => any;
  /** ارسال پیام تلگرام؛ در صورت موفقیت true برمی‌گرداند */
  sendTelegram: (text: string, keyboard?: any) => Promise<boolean>;
  /** خلاصهٔ آماری عادات برای امروز */
  getHabitsSummary: (today: string) => any[];
  /** ذخیرهٔ state روی دیسک */
  saveState: () => void;
}

let RUNTIME: ProactiveRuntime | null = null;

export function initProactiveEngine(runtime: ProactiveRuntime): void {
  RUNTIME = runtime;
}

// ---------------------------------------------------------------------------
// State accessors روی server state
// ---------------------------------------------------------------------------

const ENGINE_STATE_KEY = 'behaviorEngine';
const PROACTIVE_CONFIG_KEY = 'proactiveCoach';

export function getEngineState(state: any): BehaviorEngineState {
  const normalized = normalizeEngineState(state?.[ENGINE_STATE_KEY]);
  // به‌روزرسانی مرجع زنده برای ذخیره‌سازی
  if (state) state[ENGINE_STATE_KEY] = normalized;
  return normalized;
}

export function getProactiveConfig(state: any): ProactiveConfig {
  return normalizeProactiveConfig(state?.[PROACTIVE_CONFIG_KEY]);
}

export function setProactiveConfig(state: any, patch: Partial<ProactiveConfig>): ProactiveConfig {
  const merged = { ...getProactiveConfig(state), ...patch };
  if (state) state[PROACTIVE_CONFIG_KEY] = merged;
  return merged;
}

// ---------------------------------------------------------------------------
// Message formatting (سه‌زبانه، لحن‌محور)
// ---------------------------------------------------------------------------

function personaPrefix(persona: string, language: string): string {
  const fa: Record<string, string> = {
    coach: '🔥',
    strict: '⚡',
    zen: '🌿',
    academic: '🔬',
  };
  return fa[persona] || '🔬';
}

export function formatProactiveMessage(
  action: ProactiveAction,
  language: string = 'fa'
): { text: string; keyboard: any } {
  const isFa = language === 'fa';
  const isAr = language === 'ar';
  const emoji = personaPrefix(action.suggestedPersona || 'academic', language);

  switch (action.type) {
    case 'miss_patrol': {
      const n = action.meta.consecutiveMisses;
      const auto = action.meta.automaticity ?? 0;
      const text = isFa
        ? `${emoji} <b>مراقبت از مسیر عادت‌ها</b>\n\n` +
          `متوجه شدم <b>«${action.habitName}»</b> را <b>${n} روز متوالی</b> انجام ندادی.\n` +
          (auto > 0 ? `📉 درصد خودکارشدگی فعلی: <b>${auto}٪</b>\n` : '') +
          `\nطبق مدل لالی (۲۰۱۰)، <b>۲ روز پشت‌سرهم</b> نقطهٔ حساس شکستن مسیر است. نگذارید زنجیره بشکند.\n\n` +
          `<i>کوتاه‌ترین نسخهٔ ۲ دقیقه‌ای را همین حالا انجام بده:</i>`
        : isAr
        ? `${emoji} <b>متابعة مسار العادات</b>\n\nلم تُنجز «${action.habitName}» لمدة <b>${n} أيام</b> متتالية.\nتفويت يومين متتاليين هو نقطة الخطر. ابدأ الآن بأصغر خطوة (دقيقتان):`
        : `${emoji} <b>Habit Path Watch</b>\n\nYou skipped <b>${action.habitName}</b> for <b>${n} consecutive days</b>.\nPer Lally (2010), 2 misses in a row is the critical breakpoint. Do the 2-minute version now:`;

      return {
        text,
        keyboard: {
          inline_keyboard: [
            [
              { text: isFa ? '✅ انجام دادم' : isAr ? '✅ أنجزت' : '✅ Done', callback_data: `proact_acted_toggle_${action.habitId}` },
              { text: isFa ? '💬 حرف بزنیم' : isAr ? '💬 لنتحدث' : '💬 Talk', callback_data: `proact_talk_${action.habitId}` },
            ],
            [{ text: isFa ? '⏰ بعداً یادآوری کن' : isAr ? '⏰ لاحقاً' : '⏰ Snooze', callback_data: `proact_snooze_${action.habitId}` }],
          ],
        },
      };
    }

    case 'golden_window': {
      const hr = action.meta.bestHour;
      const conf = Math.round((action.meta.confidence || 0) * 100);
      const timeStr = `${String(hr).padStart(2, '0')}:00`;
      const text = isFa
        ? `${emoji} <b>پنجرهٔ طلایی عادت</b>\n\n` +
          `الان بهترین زمان برای <b>«${action.habitName}»</b> است.\n` +
          `📈 بر اساس الگوی تاریخی، <b>${conf}٪</b> مواقع حدود ساعت <b>${timeStr}</b> این کار را انجام داده‌ای.\n\n` +
          `<i>همین حالا شروع کن تا انرژی ذهنی کمتری مصرف شود.</i>`
        : isAr
        ? `${emoji} <b>النافذة الذهبية</b>\n\nهذا أفضل وقت لـ «${action.habitName}» (حوالي ${timeStr} بحسب نمطك).`
        : `${emoji} <b>Golden Window</b>\n\nNow is the best time for <b>${action.habitName}</b>. Historically you complete it around <b>${timeStr}</b> (${conf}%).`;

      return {
        text,
        keyboard: {
          inline_keyboard: [
            [
              { text: isFa ? '✅ شروع کردم' : isAr ? '✅ بدأت' : '✅ Start', callback_data: `proact_acted_toggle_${action.habitId}` },
              { text: isFa ? '⏰ بعداً' : isAr ? '⏰ لاحقاً' : '⏰ Later', callback_data: `proact_snooze_${action.habitId}` },
            ],
          ],
        },
      };
    }

    case 'overdue_task': {
      const d = action.meta.overdueDays;
      const pr = action.meta.priority || 'medium';
      const prFa = pr === 'high' ? 'بالا' : pr === 'low' ? 'پایین' : 'متوسط';
      const text = isFa
        ? `${emoji} <b>تسک عقب‌افتاده</b>\n\n` +
          `تسک <b>«${action.taskName}»</b> از مهلت خود <b>${d} روز</b> گذشته است.\n` +
          `⚡ اولویت: <b>${prFa}</b>\n\n` +
          `<i>تعلل، فشار ذهنی را بزرگ‌تر می‌کند. کوچک‌ترین گام اول را همین حالا بردار.</i>`
        : isAr
        ? `${emoji} <b>مهمة متأخرة</b>\n\nالمهمة «${action.taskName}» متأخرة بـ ${d} أيام.`
        : `${emoji} <b>Overdue Task</b>\n\n<b>${action.taskName}</b> is <b>${d} days</b> overdue.`;

      return {
        text,
        keyboard: {
          inline_keyboard: [
            [
              { text: isFa ? '✅ انجام شد' : isAr ? '✅ أُنجزت' : '✅ Done', callback_data: `proact_acted_toggle_task_${action.taskId}` },
              { text: isFa ? '💬 کمکم کن' : isAr ? '💬 ساعدني' : '💬 Help', callback_data: `proact_talk_task_${action.taskId}` },
            ],
          ],
        },
      };
    }

    case 'relapse_risk': {
      const risk = action.meta.risk;
      const reasons = (risk.reasons || []).join(' • ');
      const text = isFa
        ? `${emoji} <b>هشدار پیش‌دستانه</b>\n\n` +
          `الگوهای فعلی نشان می‌دهد احتمال افت مسیر در چند ساعت آینده <b>بالا</b> است (ریسک: <b>${risk.score}٪</b>).\n` +
          (reasons ? `🔎 نشانه‌ها: ${reasons}\n\n` : '\n') +
          `<i>پیش از این‌که شکست رخ دهد، یک اقدام کوچک انجام بده. کدام را انتخاب می‌کنی؟</i>`
        : isAr
        ? `${emoji} <b>تحذير استباقي</b>\n\nمؤشرات تشير إلى ارتفاع احتمال التراجع (${risk.score}٪).`
        : `${emoji} <b>Early Warning</b>\n\nPatterns suggest a high relapse risk soon (${risk.score}%). ${reasons}`;

      return {
        text,
        keyboard: {
          inline_keyboard: [
            [{ text: isFa ? '💬 راهنمایم کن' : isAr ? '💬 أرشدني' : '💬 Guide me', callback_data: 'proact_talk_general' }],
            [{ text: isFa ? '📅 وضعیت امروز' : isAr ? '📅 اليوم' : '📅 Today', callback_data: 'cmd_today' }],
          ],
        },
      };
    }

    case 'incomplete_today':
    default: {
      const text = isFa
        ? `${emoji} <b>یادآوری مهربان</b>\n\n` +
          `امروز <b>«${action.habitName}»</b> را ثبت نکردی.\n` +
          `هنوز وقت هست! کوچک‌ترین نسخهٔ آن را انجام بده تا زنجیره حفظ شود.`
        : isAr
        ? `${emoji} <b>تذكير ودّي</b>\n\nلم تُسجّل «${action.habitName}» اليوم. لا يزال هناك وقت!`
        : `${emoji} <b>Gentle Nudge</b>\n\nYou haven't logged <b>${action.habitName}</b> today. Still time!`;

      return {
        text,
        keyboard: {
          inline_keyboard: [
            [
              { text: isFa ? '✅ انجام دادم' : isAr ? '✅ أنجزت' : '✅ Done', callback_data: `proact_acted_toggle_${action.habitId}` },
              { text: isFa ? '⏰ بعداً' : isAr ? '⏰ لاحقاً' : '⏰ Later', callback_data: `proact_snooze_${action.habitId}` },
            ],
          ],
        },
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Main cycle — یک چرخهٔ کامل رصد → تصمیم → اقدام → یادگیری
// ---------------------------------------------------------------------------

export interface ProactiveCycleResult {
  ran: boolean;
  actionsDecided: number;
  actionsSent: number;
  sent: Array<{ key: string; type: string }>;
  skippedReason?: string;
}

export async function runProactiveCycle(now: Date = new Date()): Promise<ProactiveCycleResult> {
  const result: ProactiveCycleResult = { ran: false, actionsDecided: 0, actionsSent: 0, sent: [] };
  if (!RUNTIME) { result.skippedReason = 'no_runtime'; return result; }

  const state = RUNTIME.getState();
  const config = getProactiveConfig(state);
  if (!config.enabled) { result.skippedReason = 'disabled'; return result; }

  const engineState = getEngineState(state);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const language = state.language || 'fa';

  const habits = Array.isArray(state.habits) ? state.habits : [];
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  if (habits.length === 0 && tasks.length === 0) { result.skippedReason = 'no_data'; return result; }

  // به‌روزرسانی پنجره‌های طلایی یادگرفته‌شده
  engineState.learnedWindows = learnGoldenWindows(habits);

  result.ran = true;

  const decided = decideProactiveActions({ habits, tasks, todayStr, now, config, state: engineState });
  result.actionsDecided = decided.length;
  const toSend = selectActionsToSend(decided, engineState, config, todayStr, now);
  if (toSend.length === 0) { result.skippedReason = 'none_selected'; RUNTIME.saveState(); return result; }

  for (const action of toSend) {
    const { text, keyboard } = formatProactiveMessage(action, language);
    try {
      const ok = await RUNTIME.sendTelegram(text, keyboard);
      if (ok) {
        markEventSent(engineState, action.key, todayStr, now);
        // ثبت «ارسال شد» به‌عنوان pending reaction برای حلقهٔ یادگیری
        recordReaction(engineState, action.key, action.type, 'ignored', now); // پیش‌فرض؛ در صورت اقدام بازنویسی می‌شود
        result.actionsSent++;
        result.sent.push({ key: action.key, type: action.type });
      }
    } catch (e) {
      // ignore per-action failure
    }
  }

  RUNTIME.saveState();
  return result;
}

/**
 * ثبت اقدام کاربر روی یک دکمهٔ پیش‌دستانه (برای حلقهٔ یادگیری).
 * keyPrefix مثل `proact_acted_toggle_` است که در server.ts پارس می‌شود.
 */
export function registerProactiveFeedback(
  action: 'acted' | 'snoozed' | 'ignored' | 'dismissed',
  eventKeyHint: string,
  type: string = 'incomplete_today',
  now: Date = new Date()
): void {
  if (!RUNTIME) return;
  const state = RUNTIME.getState();
  const engineState = getEngineState(state);
  // نزدیک‌ترین رویداد ارسال‌شده را پیدا کن
  const keys = Object.keys(engineState.sentEvents);
  let matchedKey = eventKeyHint;
  if (keys.length > 0) {
    // آخرین رویداد ارسال‌شده به‌عنوان مبنای یادگیری
    matchedKey = keys.sort((a, b) => engineState.sentEvents[b] - engineState.sentEvents[a])[0] || eventKeyHint;
  }
  recordReaction(engineState, matchedKey, (type as any), action, now);
  RUNTIME.saveState();
}

// ---------------------------------------------------------------------------
// Diagnostics for the API
// ---------------------------------------------------------------------------

export function getProactiveDiagnostics(state: any, now: Date = new Date()) {
  const config = getProactiveConfig(state);
  const engineState = getEngineState(state);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const habits = Array.isArray(state?.habits) ? state.habits : [];
  const tasks = Array.isArray(state?.tasks) ? state.tasks : [];
  const risk = computeRelapseRisk(habits, tasks, todayStr, now);
  const total = engineState.adaptive.totalSent;
  const acted = engineState.adaptive.totalActed;
  return {
    config,
    stats: {
      totalSent: total,
      totalActed: acted,
      totalIgnored: engineState.adaptive.totalIgnored,
      responseRate: total ? Math.round((acted / total) * 100) / 100 : 0,
      bestResponseHour: engineState.adaptive.bestResponseHour ?? null,
      todayQuotaUsed: engineState.dailyCounters[todayStr] || 0,
    },
    relapseRisk: risk,
    learnedWindows: engineState.learnedWindows,
    recentReactions: engineState.reactions.slice(-10),
  };
}
