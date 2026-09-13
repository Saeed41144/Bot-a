import React from 'react';
import { ThemeMode, UIAppearanceSettings, ShadowElevation } from '../types';

export interface AppearancePreset {
  id: string;
  nameFa: string;
  nameEn: string;
  descriptionFa: string;
  descriptionEn: string;
  previewGradient: string;
  toolbarContainerClass: string;
  actionIconClass: string;
  sectionCardClass: string;
  cardBoxClass: string;
  pageBackgroundClass: string;
  headerBoxClass?: string;
  accentBorderClass: string;
}

export const DARK_MODE_PRESETS: AppearancePreset[] = [
  {
    id: 'midnight_slate',
    nameFa: 'کربن نایت (کلاسیک)',
    nameEn: 'Midnight Slate',
    descriptionFa: 'سرمه‌ای تیره کلاسیک با حاشیه‌های متالیک ظریف',
    descriptionEn: 'Deep classic slate with subtle metallic borders',
    previewGradient: 'from-slate-900 to-slate-950',
    toolbarContainerClass: 'bg-slate-900/90 border-slate-800 backdrop-blur-md',
    actionIconClass: 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700/80',
    sectionCardClass: 'bg-slate-900/95 border-slate-800 text-slate-100',
    cardBoxClass: 'bg-slate-900/95 border-slate-800 text-slate-100',
    pageBackgroundClass: 'bg-slate-950 text-slate-100',
    headerBoxClass: 'bg-slate-900 border-slate-800',
    accentBorderClass: 'border-slate-800',
  },
  {
    id: 'cyber_indigo',
    nameFa: 'سایبر نئون (نیلی و بنفش)',
    nameEn: 'Cyberpunk Neon',
    descriptionFa: 'گرادیانت شیک ارغوانی و نیلی با ته‌رنگ سایبرپانک',
    descriptionEn: 'Vibrant indigo to purple gradient with cyberpunk vibe',
    previewGradient: 'from-indigo-950 via-slate-900 to-purple-950',
    toolbarContainerClass: 'bg-gradient-to-r from-indigo-950/90 via-slate-900/90 to-purple-950/90 border-indigo-800/60 backdrop-blur-md',
    actionIconClass: 'bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-200 border-indigo-700/70',
    sectionCardClass: 'bg-gradient-to-b from-slate-900/95 to-indigo-950/70 border-indigo-800/60 text-slate-100',
    cardBoxClass: 'bg-gradient-to-b from-slate-900/95 to-indigo-950/70 border-indigo-800/60 text-slate-100',
    pageBackgroundClass: 'bg-slate-950 text-slate-100',
    headerBoxClass: 'bg-gradient-to-br from-slate-950 via-indigo-950/90 to-purple-950/80 border-indigo-800/60',
    accentBorderClass: 'border-indigo-800/50',
  },
  {
    id: 'oled_black',
    nameFa: 'مشکی اولد عمیق (OLED)',
    nameEn: 'OLED Pure Black',
    descriptionFa: 'مشکی مطلق و کم‌مصرف برای نمایشگرهای آمولد',
    descriptionEn: 'Pure ink-black aesthetic crafted for AMOLED screens',
    previewGradient: 'from-zinc-950 to-black',
    toolbarContainerClass: 'bg-black/95 border-zinc-800/90 backdrop-blur-md',
    actionIconClass: 'bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border-zinc-800',
    sectionCardClass: 'bg-zinc-950 border-zinc-800 text-zinc-100',
    cardBoxClass: 'bg-zinc-950 border-zinc-800 text-zinc-100',
    pageBackgroundClass: 'bg-black text-zinc-100',
    headerBoxClass: 'bg-black border-zinc-800',
    accentBorderClass: 'border-zinc-800',
  },
  {
    id: 'emerald_forest',
    nameFa: 'زمرد شب (سبز تیره)',
    nameEn: 'Forest Emerald',
    descriptionFa: 'گرادیانت آرامش‌بخش سبز زمردی با حس طبیعت شبانه',
    descriptionEn: 'Calming deep emerald gradient with tranquil night tone',
    previewGradient: 'from-slate-900 via-emerald-950 to-slate-950',
    toolbarContainerClass: 'bg-gradient-to-r from-slate-900/95 via-emerald-950/80 to-slate-950/95 border-emerald-800/50 backdrop-blur-md',
    actionIconClass: 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-200 border-emerald-700/60',
    sectionCardClass: 'bg-gradient-to-b from-slate-900/95 to-emerald-950/60 border-emerald-800/60 text-slate-100',
    cardBoxClass: 'bg-gradient-to-b from-slate-900/95 to-emerald-950/60 border-emerald-800/60 text-slate-100',
    pageBackgroundClass: 'bg-slate-950 text-slate-100',
    headerBoxClass: 'bg-gradient-to-br from-slate-950 via-emerald-950/80 to-slate-900 border-emerald-800/50',
    accentBorderClass: 'border-emerald-800/50',
  },
  {
    id: 'aurora_glow',
    nameFa: 'شفق قطبی کریستالی (آبی و فیروزه‌ای)',
    nameEn: 'Aurora Crystal',
    descriptionFa: 'ترکیب لوکس فیروزه‌ای و لاجوردی با شفافیت بالا',
    descriptionEn: 'Luminous cyan and deep azure with crystalline glow',
    previewGradient: 'from-cyan-950 via-slate-900 to-blue-950',
    toolbarContainerClass: 'bg-gradient-to-r from-cyan-950/85 via-slate-900/90 to-blue-950/85 border-cyan-800/50 backdrop-blur-md',
    actionIconClass: 'bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-200 border-cyan-700/60',
    sectionCardClass: 'bg-gradient-to-b from-slate-900/95 to-cyan-950/60 border-cyan-800/60 text-slate-100',
    cardBoxClass: 'bg-gradient-to-b from-slate-900/95 to-cyan-950/60 border-cyan-800/60 text-slate-100',
    pageBackgroundClass: 'bg-slate-950 text-slate-100',
    headerBoxClass: 'bg-gradient-to-br from-slate-950 via-cyan-950/80 to-blue-950/90 border-cyan-800/50',
    accentBorderClass: 'border-cyan-800/50',
  },
];

export const LIGHT_MODE_PRESETS: AppearancePreset[] = [
  {
    id: 'clean_white',
    nameFa: 'سفید مینیمال (کلاسیک)',
    nameEn: 'Clean White',
    descriptionFa: 'ظاهر مینیمال روشن و استاندارد با تفکیک خاکستری ملایم',
    descriptionEn: 'Clean, modern white finish with crisp subtle borders',
    previewGradient: 'from-slate-100 to-white',
    toolbarContainerClass: 'bg-slate-100/90 border-slate-200/90 backdrop-blur-md',
    actionIconClass: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80',
    sectionCardClass: 'bg-white border-slate-200/90 text-slate-800',
    cardBoxClass: 'bg-white border-slate-200/90 text-slate-800',
    pageBackgroundClass: 'bg-slate-100/70 text-slate-800',
    headerBoxClass: 'bg-slate-900 text-white border-slate-800',
    accentBorderClass: 'border-slate-200/90',
  },
  {
    id: 'ice_blue',
    nameFa: 'آیس بلو (آبی یخی و آسمانی)',
    nameEn: 'Ice Blue',
    descriptionFa: 'سفید ابریشمی با گرادیانت ملایم آسمانی و نشاط‌آور',
    descriptionEn: 'Refreshing sky-tinted white gradient with crisp elevation',
    previewGradient: 'from-blue-100 via-sky-50 to-white',
    toolbarContainerClass: 'bg-gradient-to-r from-blue-50/95 via-white to-sky-50/95 border-blue-200/80 backdrop-blur-md',
    actionIconClass: 'bg-white/95 hover:bg-blue-50 text-blue-700 border-blue-200',
    sectionCardClass: 'bg-gradient-to-b from-white to-blue-50/70 border-blue-200/80 text-slate-800',
    cardBoxClass: 'bg-gradient-to-b from-white to-blue-50/70 border-blue-200/80 text-slate-800',
    pageBackgroundClass: 'bg-slate-100/70 text-slate-800',
    headerBoxClass: 'bg-slate-900 text-white border-slate-800',
    accentBorderClass: 'border-blue-200',
  },
  {
    id: 'warm_sand',
    nameFa: 'شن گرم و آرامش‌بخش (Warm Sand)',
    nameEn: 'Warm Sand',
    descriptionFa: 'تنالیته کرم و خاکی ملایم برای کاهش خستگی چشم در روز',
    descriptionEn: 'Warm ergonomic beige and stone hues for eye comfort',
    previewGradient: 'from-amber-100 via-stone-100 to-amber-50',
    toolbarContainerClass: 'bg-gradient-to-r from-stone-100/95 via-amber-50/80 to-stone-100/95 border-amber-200/70 backdrop-blur-md',
    actionIconClass: 'bg-white/90 hover:bg-amber-50 text-amber-900 border-amber-200/80',
    sectionCardClass: 'bg-gradient-to-b from-[#fefcf8] to-[#f7f2ea] border-amber-200/80 text-stone-900',
    cardBoxClass: 'bg-gradient-to-b from-[#fefcf8] to-[#f7f2ea] border-amber-200/80 text-stone-900',
    pageBackgroundClass: 'bg-[#f0ebe1] text-stone-900',
    headerBoxClass: 'bg-slate-900 text-white border-slate-800',
    accentBorderClass: 'border-amber-200',
  },
  {
    id: 'frosted_glass',
    nameFa: 'شیشه‌ای آیفونی (Frosted Glass)',
    nameEn: 'Frosted Glass',
    descriptionFa: 'افکت مات شیشه‌ای معلق با شفافیت و بلور فراگیر',
    descriptionEn: 'Translucent iOS-style glassmorphism with high blur',
    previewGradient: 'from-white/90 via-slate-50/80 to-white/90',
    toolbarContainerClass: 'bg-white/80 backdrop-blur-xl border-white/80 shadow-sm',
    actionIconClass: 'bg-white/85 hover:bg-white text-slate-800 border-slate-200/60 backdrop-blur-md',
    sectionCardClass: 'bg-white/90 backdrop-blur-lg border-white/80 text-slate-800',
    cardBoxClass: 'bg-white/90 backdrop-blur-lg border-white/80 text-slate-800',
    pageBackgroundClass: 'bg-slate-100 text-slate-800',
    headerBoxClass: 'bg-slate-900 text-white border-slate-800',
    accentBorderClass: 'border-slate-200/60',
  },
  {
    id: 'fresh_mint',
    nameFa: 'نعنایی پرانرژی (Fresh Mint)',
    nameEn: 'Fresh Mint',
    descriptionFa: 'گرادیانت سبز بهاری ملایم سرشار از انرژی و شادابی',
    descriptionEn: 'Invigorating spring mint gradient bringing fresh focus',
    previewGradient: 'from-emerald-100 via-teal-50 to-white',
    toolbarContainerClass: 'bg-gradient-to-r from-emerald-50/95 via-white to-teal-50/95 border-emerald-200/80 backdrop-blur-md',
    actionIconClass: 'bg-white/95 hover:bg-emerald-50 text-emerald-800 border-emerald-200',
    sectionCardClass: 'bg-gradient-to-b from-white to-emerald-50/70 border-emerald-200/80 text-slate-800',
    cardBoxClass: 'bg-gradient-to-b from-white to-emerald-50/70 border-emerald-200/80 text-slate-800',
    pageBackgroundClass: 'bg-slate-100/70 text-slate-800',
    headerBoxClass: 'bg-slate-900 text-white border-slate-800',
    accentBorderClass: 'border-emerald-200',
  },
];

export function getShadowClass(elevation?: ShadowElevation): string {
  switch (elevation) {
    case 'none':
      return 'shadow-none';
    case 'medium':
      return 'shadow-md';
    case 'deep':
      return 'shadow-xl ring-1 ring-black/5 dark:ring-white/10';
    case 'glow':
      return 'shadow-lg shadow-blue-500/15 dark:shadow-cyan-500/20 ring-1 ring-cyan-500/30';
    case 'soft':
    default:
      return 'shadow-xs';
  }
}

export function getMaxHeightClass(preference?: 'compact' | 'balanced' | 'spacious' | 'unlimited'): string {
  switch (preference) {
    case 'compact':
      return 'max-h-[380px] sm:max-h-[420px]';
    case 'spacious':
      return 'max-h-[640px] sm:max-h-[720px]';
    case 'unlimited':
      return '';
    case 'balanced':
    default:
      return 'max-h-[480px] sm:max-h-[540px] xl:max-h-[580px]';
  }
}

export interface ResolvedAppearance {
  toolbarContainerClass: string;
  toolbarContainerStyle?: React.CSSProperties;
  actionIconClass: string;
  actionIconStyle?: React.CSSProperties;
  sectionCardClass: string;
  cardBoxClass: string;
  cardBoxStyle?: React.CSSProperties;
  modalBoxClass: string;
  modalBoxStyle?: React.CSSProperties;
  pageBackgroundClass: string;
  headerBoxClass: string;
  accentBorderClass: string;
  shadowClass: string;
  maxHeightClass: string;
  customBoxBgColor?: string;
}

export function resolveAppearance(
  theme: ThemeMode,
  settings?: UIAppearanceSettings
): ResolvedAppearance {
  const isDark = theme === 'dark';
  const shadowClass = getShadowClass(settings?.shadowElevation);
  const maxHeightClass = getMaxHeightClass(settings?.homeListMaxHeight);

  // Determine custom box background color if defined
  const activeCustomBoxBg = isDark
    ? (settings?.customBoxBgColorDark || settings?.customBoxBgColor)
    : (settings?.customBoxBgColorLight || settings?.customBoxBgColor);

  const cardBoxStyle: React.CSSProperties | undefined = activeCustomBoxBg 
    ? { backgroundColor: activeCustomBoxBg } 
    : undefined;

  const toolbarContainerStyle: React.CSSProperties | undefined = activeCustomBoxBg
    ? { backgroundColor: activeCustomBoxBg }
    : undefined;

  const actionIconStyle: React.CSSProperties | undefined = activeCustomBoxBg
    ? { backgroundColor: activeCustomBoxBg }
    : undefined;

  const modalBoxStyle: React.CSSProperties | undefined = activeCustomBoxBg
    ? { backgroundColor: activeCustomBoxBg }
    : undefined;

  if (isDark) {
    const presetId = settings?.darkModePreset || 'midnight_slate';
    const preset = DARK_MODE_PRESETS.find((p) => p.id === presetId) || DARK_MODE_PRESETS[0];
    const baseBoxClass = settings?.customCardDark || preset.cardBoxClass;

    return {
      toolbarContainerClass: settings?.customToolbarDark || preset.toolbarContainerClass,
      toolbarContainerStyle,
      actionIconClass: settings?.customIconDark || preset.actionIconClass,
      actionIconStyle,
      sectionCardClass: baseBoxClass,
      cardBoxClass: baseBoxClass,
      cardBoxStyle,
      modalBoxClass: baseBoxClass,
      modalBoxStyle,
      pageBackgroundClass: preset.pageBackgroundClass || 'bg-slate-950 text-slate-100',
      headerBoxClass: preset.headerBoxClass || 'bg-slate-900 border-slate-800',
      accentBorderClass: preset.accentBorderClass,
      shadowClass,
      maxHeightClass,
      customBoxBgColor: activeCustomBoxBg,
    };
  } else {
    const presetId = settings?.lightModePreset || 'clean_white';
    const preset = LIGHT_MODE_PRESETS.find((p) => p.id === presetId) || LIGHT_MODE_PRESETS[0];
    const baseBoxClass = settings?.customCardLight || preset.cardBoxClass;

    return {
      toolbarContainerClass: settings?.customToolbarLight || preset.toolbarContainerClass,
      toolbarContainerStyle,
      actionIconClass: settings?.customIconLight || preset.actionIconClass,
      actionIconStyle,
      sectionCardClass: baseBoxClass,
      cardBoxClass: baseBoxClass,
      cardBoxStyle,
      modalBoxClass: baseBoxClass,
      modalBoxStyle,
      pageBackgroundClass: preset.pageBackgroundClass || 'bg-slate-100/70 text-slate-800',
      headerBoxClass: preset.headerBoxClass || 'bg-slate-900 text-white border-slate-800',
      accentBorderClass: preset.accentBorderClass,
      shadowClass,
      maxHeightClass,
      customBoxBgColor: activeCustomBoxBg,
    };
  }
}
