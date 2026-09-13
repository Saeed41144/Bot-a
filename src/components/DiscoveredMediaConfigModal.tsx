import React, { useState, useEffect } from 'react';
import {
  X,
  Film,
  Tv,
  BookOpen,
  Sparkles,
  Coins,
  ShieldAlert,
  CheckCircle2,
  FolderTree,
  Tag,
  Lock,
  Layers,
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { ShopMovie, WebNovel, VideoPlaylist, MediaType, Language } from '../types';
import { formatNumber } from '../utils/translations';

interface DiscoveredMediaConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: (ShopMovie | WebNovel | any) | null;
  itemType: 'movie' | 'novel';
  language: Language;
  playlists?: VideoPlaylist[];
  customPlaylists?: VideoPlaylist[];
  onConfigSaved: (updatedItem: any) => void;
}

export const DiscoveredMediaConfigModal: React.FC<DiscoveredMediaConfigModalProps> = ({
  isOpen,
  onClose,
  item,
  itemType,
  language,
  playlists = [],
  customPlaylists = [],
  onConfigSaved,
}) => {
  const isFa = language === 'fa';
  const isAr = language === 'ar';

  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('movie');
  const [playlistId, setPlaylistId] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState<number>(2);
  const [totalPrice, setTotalPrice] = useState<number>(10);
  const [firstItemFree, setFirstItemFree] = useState(true);
  const [genre, setGenre] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [motivationalTheme, setMotivationalTheme] = useState('');
  const [coverGradient, setCoverGradient] = useState('from-indigo-950 via-slate-900 to-slate-950');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const gradientOptions = [
    { label: isFa ? 'نیلی و ارغوانی' : 'Indigo & Purple', value: 'from-indigo-950 via-slate-900 to-slate-950' },
    { label: isFa ? 'آبی کبالت و کیهانی' : 'Blue Cosmic', value: 'from-blue-950 via-cyan-950 to-slate-950' },
    { label: isFa ? 'کهربایی و طلایی' : 'Amber Gold', value: 'from-amber-950 via-stone-900 to-black' },
    { label: isFa ? 'زمردی و یشمی' : 'Emerald Jade', value: 'from-emerald-950 via-teal-950 to-slate-950' },
    { label: isFa ? 'یاقوتی و زرشکی' : 'Ruby Crimson', value: 'from-rose-950 via-slate-900 to-slate-950' },
    { label: isFa ? 'زغالی و تاریک' : 'Dark Charcoal', value: 'from-slate-950 via-zinc-900 to-black' },
  ];

  const suggestedGenres = isFa
    ? ['انگیزشی', 'روانشناسی', 'علمی-تخیلی', 'درام', 'استراتژی', 'تمرکز', 'حماسی', 'اراده', 'بیوگرافی']
    : ['Motivation', 'Psychology', 'Sci-Fi', 'Drama', 'Strategy', 'Focus', 'Epic', 'Willpower', 'Biography'];

  const allPlaylists = [...(playlists || []), ...(customPlaylists || [])];

  useEffect(() => {
    if (item) {
      setTitle(item.title || item.diskFolderName || '');
      setOriginalTitle(item.originalTitle || '');
      setAuthor(item.author || item.director || '');
      setMediaType(item.mediaType || (itemType === 'novel' ? 'movie' : 'movie'));
      setPlaylistId(item.playlistId || '');
      setPricePerUnit(item.pricePerEpisode || item.pricePerChapter || 2);
      setTotalPrice(item.price || 10);
      setFirstItemFree(true);
      setGenre(item.genres?.join(', ') || item.genre || 'انگیزشی / تمرکز');
      setSynopsis(item.synopsis || '');
      setMotivationalTheme(item.motivationalTheme || '');
      setCoverGradient(item.coverGradient || 'from-indigo-950 via-slate-900 to-slate-950');
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [item, itemType]);

  if (!isOpen || !item) return null;

  // Calculate episode or chapter count
  let totalPartsCount = 0;
  let seasonsCount = 0;
  if (itemType === 'novel') {
    totalPartsCount = item.chapters?.length || 1;
  } else {
    if (item.hasSeasons && Array.isArray(item.seasons)) {
      seasonsCount = item.seasons.length;
      totalPartsCount = item.seasons.reduce((acc: number, s: any) => acc + (s.episodes?.length || 0), 0);
    } else if (Array.isArray(item.standaloneEpisodes)) {
      totalPartsCount = item.standaloneEpisodes.length;
    } else {
      totalPartsCount = 1;
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage(isFa ? 'لطفاً عنوان اثر را وارد نمایید.' : 'Please enter a title.');
      return;
    }

    const confirmMsg = isFa
      ? 'توجه: اطلاعات قیمت و مشخصات پس از ثبت اولیه قفل خواهد شد و فقط یک بار امکان تغییر آن وجود دارد. آیا از اطلاعات وارد شده اطمینان دارید؟'
      : 'Note: Metadata and unit pricing will be locked permanently after saving and can only be set once. Confirm save?';

    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        id: item.id,
        type: itemType,
        title: title.trim(),
        originalTitle: originalTitle.trim(),
        author: author.trim(),
        mediaType: itemType === 'novel' ? undefined : mediaType,
        playlistId: playlistId || undefined,
        pricePerUnit: Number(pricePerUnit) || 2,
        totalPrice: Number(totalPrice) || 10,
        firstItemFree,
        genre: genre.trim(),
        genres: genre.split(',').map((g) => g.trim()).filter(Boolean),
        synopsis: synopsis.trim(),
        motivationalTheme: motivationalTheme.trim(),
        coverGradient,
      };

      const res = await fetch('/api/store/configure-discovered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(data.message || (isFa ? 'اطلاعات با موفقیت ثبت و قفل گردید.' : 'Saved and locked successfully.'));
        if (onConfigSaved) {
          onConfigSaved(data.item || payload);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage(data.error || (isFa ? 'خطا در ثبت اطلاعات در دیسک سرور.' : 'Failed to save metadata.'));
      }
    } catch {
      setErrorMessage(isFa ? 'خطا در برقراری ارتباط با سرور.' : 'Failed to connect to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        dir={isFa || isAr ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isFa ? 'پیکربندی و قیمت‌گذاری محتوای دیسک' : 'Configure Discovered Media'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                  {itemType === 'novel' ? (isFa ? 'رمان' : 'Novel') : (isFa ? 'ویدیو/سریال' : 'Video')}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {isFa ? 'پوشه شناسایی‌شده:' : 'Folder:'} {item.diskFolderName || item.title || item.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* One-time setup lock notice banner */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-900 dark:text-amber-200">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold block">
                {isFa ? 'قانون تغییر یک‌باره مشخصات و قیمت‌گذاری:' : 'One-Time Metadata & Pricing Lock:'}
              </span>
              <p className="leading-relaxed text-[11px] text-amber-800 dark:text-amber-300/90">
                {isFa
                  ? 'این محتوا مستقیماً از پوشه دستگاه شناسایی شده است. شما فقط یک‌بار مجاز به تعیین قیمت و مشخصات آن هستید. پس از ثبت نهایی، مشخصات اثر قفل شده و قیمت‌گذاری آن در فروشگاه ثابت خواهد ماند.'
                  : 'This media was auto-discovered on disk. You are allowed to configure its metadata and pricing exactly ONCE. After saving, it will be locked.'}
              </p>
            </div>
          </div>

          {/* Media Discovery Summary Badge */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 block">
                {isFa ? 'فایل‌ها/قسمت‌ها' : 'Files/Parts'}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                {formatNumber(totalPartsCount, language)}
              </span>
            </div>
            {seasonsCount > 0 && (
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block">
                  {isFa ? 'تعداد فصل‌ها' : 'Seasons'}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {formatNumber(seasonsCount, language)}
                </span>
              </div>
            )}
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-500 block">
                {isFa ? 'وضعیت قفل' : 'Lock Status'}
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                {isFa ? 'آماده قفل نهایی' : 'Ready to lock'}
              </span>
            </div>
          </div>

          {/* Section 1: Media Type & Classification (if video) */}
          {itemType === 'movie' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {isFa ? 'نوع اثر چندرسانه‌ای:' : 'Media Type:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'movie', label: isFa ? 'فیلم سینمایی' : 'Movie', icon: Film },
                  { type: 'series', label: isFa ? 'سریال' : 'Series', icon: Tv },
                  { type: 'anime', label: isFa ? 'انیمه' : 'Anime', icon: Sparkles },
                ].map((itemOption) => {
                  const Icon = itemOption.icon;
                  const isSelected = mediaType === itemOption.type;
                  return (
                    <button
                      key={itemOption.type}
                      type="button"
                      onClick={() => setMediaType(itemOption.type as MediaType)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{itemOption.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Titles & Creator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {isFa ? 'عنوان نمایشی اثر (فارسی/دلخواه):' : 'Display Title:'} *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isFa ? 'مثال: انیمه جوجوتسو کایسن / فیلم میان‌ستاره‌ای' : 'Title'}
                required
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {isFa ? 'عنوان اصلی / زبان انگلیسی (اختیاری):' : 'Original Title (Optional):'}
              </label>
              <input
                type="text"
                value={originalTitle}
                onChange={(e) => setOriginalTitle(e.target.value)}
                placeholder="e.g. Jujutsu Kaisen / Interstellar"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {itemType === 'novel' 
                  ? (isFa ? 'نام نویسنده / مترجم:' : 'Author / Translator:') 
                  : (isFa ? 'کارگردان / استودیو سازنده:' : 'Director / Studio:')}
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={isFa ? 'مثال: کریستوفر نولان / نام نویسنده' : 'Creator name'}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {itemType === 'movie' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isFa ? 'انتساب به پلی‌لیست پوشه‌ای:' : 'Assign to Playlist:'}
                </label>
                <select
                  value={playlistId}
                  onChange={(e) => setPlaylistId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">{isFa ? 'بدون پلی‌لیست (مستقل)' : 'Standalone (No playlist)'}</option>
                  {allPlaylists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.title} ({pl.mediaType})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Section 3: Uniform Single Pricing & Coin Configuration */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/50 space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>{isFa ? 'قیمت‌گذاری واحد بر حسب سکه‌های مغزی پاداش:' : 'Uniform Pricing (Brain Coins):'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                  {itemType === 'novel' 
                    ? (isFa ? 'قیمت هر فصل رمان (سکه):' : 'Price per Chapter (Coins):') 
                    : (isFa ? 'قیمت هر قسمت / بخش (سکه):' : 'Price per Episode (Coins):')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                  {isFa ? 'قیمت آزادسازی کل اثر یکجا (سکه):' : 'Unlock All Pack Price (Coins):'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
              <label htmlFor="first-item-free-toggle" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                {itemType === 'novel' 
                  ? (isFa ? 'فصل اول به عنوان پیش‌نمایش رایگان باشد:' : 'Chapter 1 is free as preview:')
                  : (isFa ? 'قسمت اول سریال/انیمه رایگان باشد:' : 'Episode 1 is free as preview:')}
              </label>
              <input
                id="first-item-free-toggle"
                type="checkbox"
                checked={firstItemFree}
                onChange={(e) => setFirstItemFree(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Section 4: Motivational Themes & Genres */}
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {isFa ? 'ژانرها (با کاما جدا کنید):' : 'Genres (comma-separated):'}
              </label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder={isFa ? 'مثال: انگیزشی, علمی-تخیلی, انضباط' : 'Motivation, Sci-Fi, Focus'}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {suggestedGenres.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    if (!genre.includes(g)) {
                      setGenre(genre ? `${genre}, ${g}` : g);
                    }
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  +{g}
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Synopsis & Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              {isFa ? 'خلاصه داستان و پیام آموزشی اثر:' : 'Synopsis & Lesson:'}
            </label>
            <textarea
              rows={3}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder={isFa ? 'خلاصه‌ای از داستان، مفاهیم روانشناسی یا انگیزشی نهفته در این اثر...' : 'Synopsis...'}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          {/* Section 6: Poster Gradient Theme */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              {isFa ? 'تم رنگی گرادیانت پوستر:' : 'Poster Gradient Theme:'}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {gradientOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCoverGradient(opt.value)}
                  className={`h-9 rounded-xl bg-gradient-to-br ${opt.value} border-2 transition cursor-pointer relative flex items-center justify-center ${
                    coverGradient === opt.value ? 'border-amber-400 scale-105 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  title={opt.label}
                >
                  {coverGradient === opt.value && (
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {isFa ? 'انصراف' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSubmitting ? (isFa ? 'در حال ثبت و قفل...' : 'Saving & Locking...') : (isFa ? 'تأیید نهایی و قفل قیمت' : 'Save & Lock Pricing')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
