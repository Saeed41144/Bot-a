import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Lock,
  CheckCircle2,
  Coins,
  Search,
  Sparkles,
  Plus,
  Trash2,
  Download,
  Star,
  TrendingUp,
  History,
  PieChart,
  Film,
  Play,
  Eye,
  Tv,
  Clock,
  User,
  Calendar,
  Layers,
  ArrowDownLeft,
  ChevronDown,
  Folder,
  FolderPlus,
  Tag,
  Filter,
  Check,
  Edit2,
  List,
  BookCheck,
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import { WebNovel, ShopMovie, VideoPlaylist, UserRewardWallet, Language, MediaType } from '../types';
import { formatNumber, truncateTitleByWords } from '../utils/translations';
import {
  getDefaultWebNovels,
  getNovelTotalCalculatedPrice,
  getLastReadChapterNumber,
  getReadChaptersCount,
  resolveNovelSynopsis,
} from '../utils/rewardWallet';
import { getDefaultMovies, getDefaultPlaylists, countTotalEpisodes, countTotalSeasons, getMediaTypeMeta, getMovieTotalCalculatedPrice } from '../utils/movieData';
import { CoinReportModal } from './CoinReportModal';
import { BackgroundTranslationProgressBanner } from './BackgroundTranslationProgressBanner';
import { ResolvedAppearance } from '../utils/themeAppearance';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: UserRewardWallet;
  novels?: WebNovel[];
  customNovels?: WebNovel[];
  movies?: ShopMovie[];
  customMovies?: ShopMovie[];
  playlists?: VideoPlaylist[];
  customPlaylists?: VideoPlaylist[];
  deletedMovieIds?: string[];
  deletedPlaylistIds?: string[];
  deletedNovelIds?: string[];
  language: Language;
  appearance?: ResolvedAppearance;
  onUnlockNovel: (novel: WebNovel) => boolean;
  onUnlockMovie?: (movie: ShopMovie) => boolean;
  onOpenReader: (novel: WebNovel) => void;
  onOpenMoviePlayer?: (movie: ShopMovie) => void;
  onOpenUploadModal: (targetNovel?: WebNovel) => void;
  onOpenUploadMovieModal?: (targetMovie?: ShopMovie) => void;
  onDeleteCustomNovel?: (novelId: string) => Promise<any> | void;
  onDeleteCustomMovie?: (movieId: string) => Promise<any> | void;
  onCreatePlaylist?: (playlist: VideoPlaylist) => void;
  onDeleteCustomPlaylist?: (playlistId: string, deleteContainedMovies?: boolean) => Promise<any> | void;
}

type MainSection = 'movies' | 'novels' | 'history';
type FilterStatus = 'all' | 'unlocked' | 'locked';
type MovieSubFilter = 'all' | 'movie' | 'series' | 'anime' | 'playlists';

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  wallet,
  novels,
  customNovels = [],
  movies,
  customMovies = [],
  playlists,
  customPlaylists = [],
  deletedMovieIds = [],
  deletedPlaylistIds = [],
  deletedNovelIds = [],
  language,
  appearance,
  onUnlockNovel,
  onUnlockMovie,
  onOpenReader,
  onOpenMoviePlayer,
  onOpenUploadModal,
  onOpenUploadMovieModal,
  onDeleteCustomNovel,
  onDeleteCustomMovie,
  onCreatePlaylist,
  onDeleteCustomPlaylist,
}) => {
  const [activeSection, setActiveSection] = useState<MainSection>('movies');
  const [novelStatusFilter, setNovelStatusFilter] = useState<FilterStatus>('all');
  const [movieStatusFilter, setMovieStatusFilter] = useState<FilterStatus>('all');
  const [movieTypeFilter, setMovieTypeFilter] = useState<MovieSubFilter>('all');
  const [selectedPlaylistFilter, setSelectedPlaylistFilter] = useState<string | null>(null);

  const [novelSearchQuery, setNovelSearchQuery] = useState('');
  const [movieSearchQuery, setMovieSearchQuery] = useState('');

  const [selectedNovelGenre, setSelectedNovelGenre] = useState<string>('all');
  const [selectedMovieGenre, setSelectedMovieGenre] = useState<string>('all');

  const [novelSortBy, setNovelSortBy] = useState<'price_asc' | 'price_desc' | 'rating' | 'newest'>('newest');
  const [movieSortBy, setMovieSortBy] = useState<'rating' | 'price_asc' | 'price_desc' | 'newest'>('rating');

  const [purchaseAlert, setPurchaseAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Quick playlist creation modal state
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [newPlaylistType, setNewPlaylistType] = useState<MediaType>('movie');

  // Media deletion confirmation and storage cleanup state
  const [movieToDelete, setMovieToDelete] = useState<ShopMovie | null>(null);
  const [isDeletingMovie, setIsDeletingMovie] = useState(false);

  // Novel deletion confirmation state
  const [novelToDelete, setNovelToDelete] = useState<WebNovel | null>(null);
  const [isDeletingNovel, setIsDeletingNovel] = useState(false);

  // Playlist deletion state
  const [playlistToDelete, setPlaylistToDelete] = useState<VideoPlaylist | null>(null);
  const [deletePlaylistAndMovies, setDeletePlaylistAndMovies] = useState(false);
  const [isDeletingPlaylist, setIsDeletingPlaylist] = useState(false);

  const [deletionSuccessToast, setDeletionSuccessToast] = useState<{ message: string; freedText?: string } | null>(null);

  const isFa = language === 'fa';
  const isAr = language === 'ar';
  const isRtl = isFa || isAr;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > 45 && !isHeaderCollapsed) {
      setIsHeaderCollapsed(true);
    } else if (scrollTop <= 10 && isHeaderCollapsed) {
      setIsHeaderCollapsed(false);
    }
  };

  // Complete array of novels (combining custom and default, minus deleted items)
  const defaultNovels = getDefaultWebNovels(language);
  const deletedNovelSet = new Set(deletedNovelIds || []);
  const defaultNovelIds = new Set(defaultNovels.map((d) => d.id));
  const customNovelsFiltered = (customNovels || []).filter((c) => !defaultNovelIds.has(c.id));
  const allNovels: WebNovel[] = (novels && novels.length > 0
    ? novels
    : [...customNovelsFiltered, ...defaultNovels]
  ).filter((n) => !deletedNovelSet.has(n.id));

  // Complete array of movies & series (combining custom and default, minus deleted items)
  const defaultMoviesList = getDefaultMovies(language);
  const deletedMovieSet = new Set(deletedMovieIds || []);
  const defaultIds = new Set(defaultMoviesList.map((d) => d.id));
  const customMoviesFiltered = (customMovies || []).filter((c) => !defaultIds.has(c.id));
  const allMovies: ShopMovie[] = (movies && movies.length > 0
    ? movies
    : [...customMoviesFiltered, ...defaultMoviesList]
  ).filter((m) => !deletedMovieSet.has(m.id));

  // Complete array of playlists
  const defaultPlaylistsList = getDefaultPlaylists(language);
  const deletedPlaylistSet = new Set(deletedPlaylistIds || []);
  const defaultPlIds = new Set(defaultPlaylistsList.map((p) => p.id));
  const customPls = (customPlaylists || []).filter((c) => !defaultPlIds.has(c.id));
  const allPlaylists: VideoPlaylist[] = (playlists && playlists.length > 0
    ? playlists
    : [...customPls, ...defaultPlaylistsList]
  )
    .filter((p) => !deletedPlaylistSet.has(p.id))
    .map((pl) => ({
      ...pl,
      itemIds: (pl.itemIds || []).filter((id) => !deletedMovieSet.has(id)),
    }));

  if (!isOpen) return null;

  // Extract unique genres
  const novelGenres = ['all', ...Array.from(new Set(allNovels.map((n) => n.genre).filter(Boolean)))];
  const movieGenresSet = new Set<string>();
  allMovies.forEach((m) => {
    if (m.genres && Array.isArray(m.genres)) {
      m.genres.forEach((g) => movieGenresSet.add(g));
    } else if (m.genre) {
      m.genre.split(/[\/,]+/).forEach((g) => movieGenresSet.add(g.trim()));
    }
  });
  const movieGenres = ['all', ...Array.from(movieGenresSet)];

  // Filtered & sorted novels
  const filteredNovels = allNovels.filter((novel) => {
    const isUnlocked = (wallet?.unlockedNovelIds || []).includes(novel.id);
    if (novelStatusFilter === 'unlocked' && !isUnlocked) return false;
    if (novelStatusFilter === 'locked' && isUnlocked) return false;

    if (selectedNovelGenre !== 'all' && novel.genre !== selectedNovelGenre) return false;

    if (novelSearchQuery.trim()) {
      const q = novelSearchQuery.toLowerCase();
      const matchTitle = (novel.title || '').toLowerCase().includes(q);
      const matchAuthor = (novel.author || '').toLowerCase().includes(q);
      const cleanSynopsis = resolveNovelSynopsis(novel, language);
      const matchSynopsis = cleanSynopsis.toLowerCase().includes(q);
      const matchTags = (novel.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchAuthor && !matchSynopsis && !matchTags) return false;
    }

    return true;
  }).sort((a, b) => {
    if (novelSortBy === 'price_asc') return getNovelTotalCalculatedPrice(a) - getNovelTotalCalculatedPrice(b);
    if (novelSortBy === 'price_desc') return getNovelTotalCalculatedPrice(b) - getNovelTotalCalculatedPrice(a);
    if (novelSortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    return (b.uploadedAt || '').localeCompare(a.uploadedAt || '');
  });

  // Filtered & sorted movies
  const filteredMovies = allMovies.filter((movie) => {
    const isUnlocked = (wallet?.unlockedMovieIds || []).includes(movie.id);
    if (movieStatusFilter === 'unlocked' && !isUnlocked) return false;
    if (movieStatusFilter === 'locked' && isUnlocked) return false;

    // Filter by specific playlist
    if (selectedPlaylistFilter && movie.playlistId !== selectedPlaylistFilter) {
      return false;
    }

    // Filter by media type subfilter
    if (movieTypeFilter !== 'all' && movieTypeFilter !== 'playlists') {
      const actualType = movie.mediaType || 'movie';
      if (actualType !== movieTypeFilter) return false;
    }

    if (selectedMovieGenre !== 'all') {
      const hasGenre = (movie.genres || []).includes(selectedMovieGenre) || (movie.genre || '').includes(selectedMovieGenre);
      if (!hasGenre) return false;
    }

    if (movieSearchQuery.trim()) {
      const q = movieSearchQuery.toLowerCase();
      const matchTitle = (movie.title || '').toLowerCase().includes(q);
      const matchOriginal = (movie.originalTitle || '').toLowerCase().includes(q);
      const matchDirector = (movie.director || '').toLowerCase().includes(q);
      const matchSynopsis = (movie.synopsis || '').toLowerCase().includes(q);
      const matchTheme = (movie.motivationalTheme || '').toLowerCase().includes(q);
      const matchPlaylist = (movie.playlistTitle || '').toLowerCase().includes(q);
      const matchTags = (movie.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchOriginal && !matchDirector && !matchSynopsis && !matchTheme && !matchPlaylist && !matchTags) return false;
    }

    return true;
  }).sort((a, b) => {
    if (movieSortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
    if (movieSortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
    if (movieSortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    return (b.uploadedAt || '').localeCompare(a.uploadedAt || '');
  });

  const unlockedNovelsCount = (wallet?.unlockedNovelIds || []).length;
  const unlockedMoviesCount = (wallet?.unlockedMovieIds || []).length;

  const handlePurchaseNovel = (novel: WebNovel) => {
    if (wallet.unlockedNovelIds.includes(novel.id)) {
      onOpenReader(novel);
      return;
    }

    const calculatedPrice = getNovelTotalCalculatedPrice(novel);

    if (wallet.coins < calculatedPrice) {
      setPurchaseAlert({
        type: 'error',
        message: isFa
          ? `موجودی سکه کافی نیست! شما ${formatNumber(wallet.coins, language)} سکه دارید اما این رمان به ${formatNumber(calculatedPrice, language)} سکه نیاز دارد. با انجام عادات روزانه سکه کسب کنید!`
          : `Insufficient coins! You have ${wallet.coins} coins but this novel costs ${calculatedPrice} coins. Complete daily habits to earn more!`,
      });
      setTimeout(() => setPurchaseAlert(null), 4000);
      return;
    }

    const success = onUnlockNovel(novel);
    if (success) {
      setPurchaseAlert({
        type: 'success',
        message: isFa
          ? `تبریک! رمان «${novel.title}» با موفقیت خریداری شد و به کتابخانه شما اضافه گردید.`
          : `Success! Novel "${novel.title}" unlocked successfully!`,
      });
      setTimeout(() => setPurchaseAlert(null), 3500);
    }
  };

  const handlePurchaseMovie = (movie: ShopMovie) => {
    if ((wallet?.unlockedMovieIds || []).includes(movie.id)) {
      if (onOpenMoviePlayer) onOpenMoviePlayer(movie);
      return;
    }

    const calculatedPrice = getMovieTotalCalculatedPrice(movie);

    if (wallet.coins < calculatedPrice) {
      setPurchaseAlert({
        type: 'error',
        message: isFa
          ? `موجودی سکه کافی نیست! شما ${formatNumber(wallet.coins, language)} سکه دارید اما بازگشایی کامل به ${formatNumber(calculatedPrice, language)} سکه نیاز دارد. با انجام عادات روزانه سکه جمع‌آوری کنید!`
          : `Insufficient coins! You have ${wallet.coins} coins but this media requires ${calculatedPrice} coins. Complete habits to earn more!`,
      });
      setTimeout(() => setPurchaseAlert(null), 4000);
      return;
    }

    if (onUnlockMovie) {
      const success = onUnlockMovie(movie);
      if (success) {
        setPurchaseAlert({
          type: 'success',
          message: isFa
            ? `تبریک! «${movie.title}» بازگشایی شد و اکنون آماده تماشا است.`
            : `Success! "${movie.title}" unlocked successfully!`,
        });
        setTimeout(() => setPurchaseAlert(null), 3500);
      }
    }
  };

  const downloadMovieFile = (movie: ShopMovie) => {
    if (movie.fileData) {
      const a = document.createElement('a');
      a.href = movie.fileData;
      a.download = movie.fileName || `${movie.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (movie.videoUrl) {
      window.open(movie.videoUrl, '_blank');
    }
  };

  // Novel Deletion Handler with Confirmation
  const handleConfirmNovelDeletion = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!novelToDelete) return;
    const targetNovel = novelToDelete;
    setIsDeletingNovel(true);
    try {
      if (onDeleteCustomNovel) {
        await onDeleteCustomNovel(targetNovel.id);
        setDeletionSuccessToast({
          message: isFa
            ? `رمان «${targetNovel.title}» با موفقیت حذف شد.`
            : isAr
            ? `تم حذف الرواية «${targetNovel.title}» بنجاح.`
            : `Novel "${targetNovel.title}" deleted successfully.`,
        });
        setTimeout(() => setDeletionSuccessToast(null), 4000);
      }
    } catch (err) {
      console.error('Error deleting novel:', err);
    } finally {
      setIsDeletingNovel(false);
      setNovelToDelete(null);
    }
  };

  // Movie Deletion Handler with Server Disk Cleanup
  const handleConfirmMovieDeletion = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!movieToDelete) return;
    const targetMovie = movieToDelete;
    setIsDeletingMovie(true);
    try {
      if (onDeleteCustomMovie) {
        const res: any = await onDeleteCustomMovie(targetMovie.id);
        const freedMsg = res && typeof res === 'object' && res.formattedFreedBytes
          ? (isFa ? ` و ${res.formattedFreedBytes} حافظه سرور آزاد گردید.` : ` and ${res.formattedFreedBytes} disk space freed.`)
          : '';

        setDeletionSuccessToast({
          message: isFa
            ? `اثر «${targetMovie.title}» با موفقیت حذف شد${freedMsg}`
            : `"${targetMovie.title}" deleted successfully${freedMsg}`,
          freedText: res?.formattedFreedBytes,
        });
        setTimeout(() => setDeletionSuccessToast(null), 4500);
      }
    } catch (err) {
      console.error('Error deleting movie:', err);
    } finally {
      setIsDeletingMovie(false);
      setMovieToDelete(null);
    }
  };

  // Playlist Deletion Handler with Optional Movie Wipe
  const handleConfirmPlaylistDeletion = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!playlistToDelete) return;
    const targetPl = playlistToDelete;
    setIsDeletingPlaylist(true);
    try {
      if (onDeleteCustomPlaylist) {
        const res: any = await onDeleteCustomPlaylist(targetPl.id, deletePlaylistAndMovies);
        const freedMsg = res && typeof res === 'object' && res.formattedFreedBytes
          ? (isFa ? ` و ${res.formattedFreedBytes} حافظه سرور آزاد شد.` : ` and ${res.formattedFreedBytes} disk space freed.`)
          : '';

        setDeletionSuccessToast({
          message: isFa
            ? `پلی‌لیست «${targetPl.title}» با موفقیت حذف گردید${freedMsg}`
            : `Playlist "${targetPl.title}" deleted successfully${freedMsg}`,
          freedText: res?.formattedFreedBytes,
        });
        setTimeout(() => setDeletionSuccessToast(null), 4500);
      }
    } catch (err) {
      console.error('Error deleting playlist:', err);
    } finally {
      setIsDeletingPlaylist(false);
      setPlaylistToDelete(null);
      setDeletePlaylistAndMovies(false);
    }
  };

  // Quick Create Playlist Handler
  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim()) return;

    const newPl: VideoPlaylist = {
      id: `playlist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: newPlaylistTitle.trim(),
      description: newPlaylistDesc.trim() || (isFa ? 'مجموعه اختصاصی ایجادشده توسط کاربر' : 'Custom user collection'),
      mediaType: newPlaylistType,
      createdAt: new Date().toISOString().split('T')[0],
      coverGradient: 'from-purple-950 via-slate-900 to-indigo-950',
      tags: [newPlaylistType],
      itemIds: [],
    };

    if (onCreatePlaylist) {
      onCreatePlaylist(newPl);
    }

    setNewPlaylistTitle('');
    setNewPlaylistDesc('');
    setIsPlaylistModalOpen(false);
    setPurchaseAlert({
      type: 'success',
      message: isFa ? `پلی‌لیست «${newPl.title}» با موفقیت ایجاد شد.` : `Playlist "${newPl.title}" created successfully.`,
    });
    setTimeout(() => setPurchaseAlert(null), 3500);
  };

  // Active playlist metadata if filtered
  const activePlaylistObj = selectedPlaylistFilter
    ? allPlaylists.find((p) => p.id === selectedPlaylistFilter)
    : null;

  return (
    <div
      id="shop-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div
        style={appearance?.modalBoxStyle}
        className="w-full max-w-5xl bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* HEADER                                                                    */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-blue-400" />
                  {isFa ? 'مرکز پاداش، سینما و سرگرمی انگیزش' : 'Reward Center & Cinema'}
                </span>
                <h2 className="text-base sm:text-xl font-black text-white">
                  {isFa ? 'فروشگاه چندرسانه‌ای و کتابخانه' : 'Media Shop & Library'}
                </h2>
              </div>
            </div>

            {/* Wallet Balance Badge & Close */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsReportOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-bold flex items-center gap-2 hover:bg-slate-800 hover:border-slate-700 transition cursor-pointer"
                title={isFa ? 'مشاهده گزارش تحلیلی سکه‌ها و پیشرفت' : 'View Coins Report'}
              >
                <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black text-xs">
                  <Coins className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col text-start">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {isFa ? 'موجودی سکه' : 'Coins'}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white leading-none">
                    {formatNumber(wallet.coins, language)}
                  </span>
                </div>
                <PieChart className="w-3.5 h-3.5 text-slate-400 ms-1 hidden sm:block" />
              </button>

              <button
                type="button"
                id="close-shop-modal-btn"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Top Navigation Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                id="tab-shop-movies"
                onClick={() => {
                  setActiveSection('movies');
                  setSelectedPlaylistFilter(null);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeSection === 'movies'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>{isFa ? 'فیلم، سریال و انیمه' : 'Cinema & Series'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/60 text-slate-200 border border-white/10">
                  {allMovies.length}
                </span>
              </button>

              <button
                type="button"
                id="tab-shop-novels"
                onClick={() => setActiveSection('novels')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeSection === 'novels'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>{isFa ? 'رمان‌ها و کتاب‌ها' : 'Novels & Books'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/60 text-slate-200 border border-white/10">
                  {allNovels.length}
                </span>
              </button>

              <button
                type="button"
                id="tab-shop-history"
                onClick={() => setActiveSection('history')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeSection === 'history'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-4 h-4" />
                <span>{isFa ? 'تراکنش‌ها' : 'History'}</span>
              </button>
            </div>

            {/* Action buttons (Upload Video / Novel / Create Playlist) */}
            <div className="flex items-center gap-2">
              {activeSection === 'movies' && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsPlaylistModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4 text-blue-400" />
                    <span className="hidden sm:inline">{isFa ? 'ساخت پلی‌لیست' : 'New Playlist'}</span>
                  </button>

                  <button
                    type="button"
                    id="open-upload-movie-btn"
                    onClick={() => onOpenUploadMovieModal && onOpenUploadMovieModal()}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>{isFa ? 'آپلود ویدیو / سریال / انیمه' : 'Upload Video / Series'}</span>
                  </button>
                </>
              )}

              {activeSection === 'novels' && (
                <button
                  type="button"
                  id="open-upload-novel-btn"
                  onClick={() => onOpenUploadModal()}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>{isFa ? 'افزودن رمان جدید' : 'Upload Novel'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Purchase Notifications / Alerts */}
        {purchaseAlert && (
          <div
            className={`mx-4 mt-3 p-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-2 ${
              purchaseAlert.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            {purchaseAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <X className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{purchaseAlert.message}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BODY CONTAINER                                                            */}
        {/* ========================================================================= */}
        <div
          onScroll={handleScroll}
          className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6"
        >
          {/* ========================================================================= */}
          {/* 1. CINEMA, SERIES & ANIME SECTION (OVERHAULED)                            */}
          {/* ========================================================================= */}
          {activeSection === 'movies' && (
            <div className="space-y-5">
              {/* Media Sub-Filter Bar (All, Movie, Series, Anime, Playlists) */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setMovieTypeFilter('all');
                      setSelectedPlaylistFilter(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      movieTypeFilter === 'all' && !selectedPlaylistFilter
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isFa ? 'همه آثار' : 'All Media'}</span>
                    <span className="text-[10px] opacity-70">({allMovies.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMovieTypeFilter('movie');
                      setSelectedPlaylistFilter(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      movieTypeFilter === 'movie'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>{isFa ? 'فیلم‌های سینمایی' : 'Movies'}</span>
                    <span className="text-[10px] opacity-70">
                      ({allMovies.filter((m) => !m.mediaType || m.mediaType === 'movie').length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMovieTypeFilter('series');
                      setSelectedPlaylistFilter(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      movieTypeFilter === 'series'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
                    }`}
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>{isFa ? 'سریال‌ها' : 'Series'}</span>
                    <span className="text-[10px] opacity-70">
                      ({allMovies.filter((m) => m.mediaType === 'series').length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMovieTypeFilter('anime');
                      setSelectedPlaylistFilter(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      movieTypeFilter === 'anime'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isFa ? 'انیمه‌ها' : 'Anime'}</span>
                    <span className="text-[10px] opacity-70">
                      ({allMovies.filter((m) => m.mediaType === 'anime').length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMovieTypeFilter('playlists');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      movieTypeFilter === 'playlists'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>{isFa ? 'پلی‌لیست‌ها و مجموعه‌ها' : 'Playlists'}</span>
                    <span className="text-[10px] opacity-70">({allPlaylists.length})</span>
                  </button>
                </div>

                {/* Status Toggle: All / Unlocked / Locked */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  {(['all', 'unlocked', 'locked'] as FilterStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setMovieStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        movieStatusFilter === st
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st === 'all'
                        ? (isFa ? 'همه' : 'All')
                        : st === 'unlocked'
                        ? (isFa ? 'خریداری‌شده' : 'My Items')
                        : (isFa ? 'قابل خرید' : 'Locked')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Playlist Filter Notice */}
              {selectedPlaylistFilter && activePlaylistObj && (
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Folder className="w-5 h-5 text-blue-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 font-bold block">
                        {isFa ? 'در حال نمایش مجموعه:' : 'Viewing Collection:'}
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-white break-words whitespace-normal leading-snug">
                        {activePlaylistObj.title}
                      </h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPlaylistFilter(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer shrink-0"
                  >
                    {isFa ? 'نمایش همه آثار' : 'Show All'}
                  </button>
                </div>
              )}

              {/* PLAYLISTS VIEW (if playlists tab selected) */}
              {movieTypeFilter === 'playlists' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-black text-slate-200 flex items-center gap-2">
                      <Folder className="w-4 h-4 text-blue-400" />
                      <span>{isFa ? 'کالکشن‌ها و پلی‌لیست‌های انگیزش و تمرکز' : 'Curated Playlists & Collections'}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsPlaylistModalOpen(true)}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isFa ? '+ ساخت پلی‌لیست جدید' : '+ New Playlist'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allPlaylists.map((pl) => {
                      const itemsInPlaylist = allMovies.filter((m) => m.playlistId === pl.id);
                      const plMeta = getMediaTypeMeta(pl.mediaType, language);

                      return (
                        <div
                          key={pl.id}
                          className="rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition overflow-hidden flex flex-col justify-between group relative"
                        >
                          <div
                            className={`min-h-28 h-auto bg-slate-900 p-4 flex flex-col justify-between gap-2.5 relative overflow-hidden border-b border-slate-800`}
                          >
                            <div className="flex items-center justify-between z-10">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${plMeta.badgeBg}`}>
                                {plMeta.label}
                              </span>
                              <span className="text-[10px] font-bold bg-slate-950/80 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800">
                                {formatNumber(itemsInPlaylist.length, language)} {isFa ? 'اثر' : 'items'}
                              </span>
                            </div>

                            <div className="z-10 min-w-0 w-full">
                              <h4 className="text-sm font-black text-white break-words whitespace-normal leading-snug">
                                {pl.title}
                              </h4>
                            </div>
                          </div>

                          <div className="p-4 flex-1 flex flex-col justify-between gap-3 text-xs">
                            <p className="text-slate-400 text-xs line-clamp-2">
                              {pl.description}
                            </p>

                            {/* Tags */}
                            {pl.tags && pl.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {pl.tags.map((t, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] text-slate-400">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPlaylistFilter(pl.id);
                                  setMovieTypeFilter('all');
                                }}
                                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>{isFa ? 'مشاهده آثار این مجموعه' : 'View Items'}</span>
                              </button>

                              {onDeleteCustomPlaylist && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPlaylistToDelete(pl);
                                    setDeletePlaylistAndMovies(false);
                                  }}
                                  className="px-2.5 py-2 rounded-xl bg-slate-950 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition cursor-pointer flex items-center gap-1 shrink-0"
                                  title={isFa ? 'حذف پلی‌لیست و مدیریت محتوا' : 'Delete Playlist'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold">{isFa ? 'حذف' : 'Delete'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* MOVIES, SERIES & ANIME GRID */
                <>
                  {/* Search and Filters Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-slate-500 absolute start-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={movieSearchQuery}
                        onChange={(e) => setMovieSearchQuery(e.target.value)}
                        placeholder={isFa ? 'جستجوی فیلم، سریال، انیمه، کارگردان...' : 'Search media, series, anime...'}
                        className="w-full ps-10 pe-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-hidden transition"
                      />
                      {movieSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setMovieSearchQuery('')}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                      <select
                        value={selectedMovieGenre}
                        onChange={(e) => setSelectedMovieGenre(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-blue-500 outline-hidden cursor-pointer"
                      >
                        <option value="all">{isFa ? 'همه ژانرها' : 'All Genres'}</option>
                        {movieGenres.filter((g) => g !== 'all').map((g) => (
                          <option key={g} value={g} className="bg-slate-900 text-white">
                            {g}
                          </option>
                        ))}
                      </select>

                      <select
                        value={movieSortBy}
                        onChange={(e) => setMovieSortBy(e.target.value as any)}
                        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-blue-500 outline-hidden cursor-pointer"
                      >
                        <option value="rating">{isFa ? 'بالاترین امتیاز IMDb' : 'Top Rated'}</option>
                        <option value="price_asc">{isFa ? 'ارزان‌ترین' : 'Lowest Price'}</option>
                        <option value="price_desc">{isFa ? 'گران‌ترین' : 'Highest Price'}</option>
                        <option value="newest">{isFa ? 'جدیدترین‌ها' : 'Newest'}</option>
                      </select>
                    </div>
                  </div>

                  {/* Media Grid Cards */}
                  {filteredMovies.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
                      <Film className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-slate-300">
                        {isFa ? 'اثری با این مشخصات یافت نشد.' : 'No media items found.'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {isFa ? 'می‌توانید فیلم، سریال یا انیمه دلخواه خود را بارگذاری و به فروشگاه اضافه کنید!' : 'You can upload your own custom media!'}
                      </p>
                      <button
                        type="button"
                        onClick={() => onOpenUploadMovieModal && onOpenUploadMovieModal()}
                        className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm hover:bg-blue-500 transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isFa ? 'آپلود اثر جدید' : 'Upload New Media'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                      {filteredMovies.map((movie) => {
                        const isUnlocked = (wallet?.unlockedMovieIds || []).includes(movie.id);
                        const calculatedTotalPrice = getMovieTotalCalculatedPrice(movie);
                        const canAfford = wallet.coins >= calculatedTotalPrice;
                        const mediaMeta = getMediaTypeMeta(movie.mediaType || 'movie', language);
                        const isEpisodic = movie.hasSeasons || movie.mediaType === 'series' || movie.mediaType === 'anime';
                        const totalEp = countTotalEpisodes(movie);
                        const totalSeasons = countTotalSeasons(movie);

                        return (
                          <div
                            key={movie.id}
                            id={`movie-card-${movie.id}`}
                            className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all duration-200 group relative ${
                              isUnlocked
                                ? 'bg-slate-900/60 border-slate-700 hover:border-slate-600 shadow-sm'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {/* Cinematic Poster Top Banner */}
                            <div
                              onClick={() => onOpenMoviePlayer && onOpenMoviePlayer(movie)}
                              className="h-36 bg-slate-900 p-4 flex flex-col justify-between relative overflow-hidden border-b border-slate-800 cursor-pointer"
                            >
                              {/* Top Row: Type & Quality badge & Unlocked/Price */}
                              <div className="flex items-center justify-between gap-2 z-10">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border shadow-xs ${mediaMeta.badgeBg}`}>
                                    {mediaMeta.label}
                                  </span>

                                  {movie.imdbRating && (
                                    <span className="text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                                      <Star className="w-3 h-3 text-slate-300 fill-slate-300" />
                                      <span>{movie.imdbRating}</span>
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {isUnlocked ? (
                                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      {isFa ? 'خریداری‌شده' : 'Unlocked'}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-bold bg-slate-800 text-blue-300 border border-slate-700 px-2.5 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                                      <Coins className="w-3.5 h-3.5" />
                                      <span>{formatNumber(calculatedTotalPrice, language)} {isFa ? 'سکه' : 'coins'}</span>
                                    </span>
                                  )}

                                  {onDeleteCustomMovie && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMovieToDelete(movie);
                                      }}
                                      className="p-1 rounded-md bg-slate-950/80 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer shadow-xs"
                                      title={isFa ? 'حذف این اثر و آزادسازی حافظه سرور' : 'Delete media & free server storage'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Bottom Row of Poster: Title & Playlist */}
                              <div className="z-10">
                                <h3 className="text-base font-bold text-white leading-tight drop-shadow-sm line-clamp-1 group-hover:text-blue-300 transition">
                                  {movie.title}
                                </h3>
                                {movie.playlistTitle && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mt-0.5">
                                    <span>📂 {movie.playlistTitle}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-4 flex-1 flex flex-col justify-between gap-3 text-xs">
                              <div>
                                {/* Duration, Seasons & Genre Row */}
                                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2.5 border-b border-slate-800/80">
                                  <span className="flex items-center gap-1 font-bold text-slate-300">
                                    {isEpisodic ? (
                                      <>
                                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                                        <span>
                                          {totalSeasons > 0 ? `${totalSeasons} ${isFa ? 'فصل' : 'S'}` : ''}{' '}
                                          • {totalEp} {isFa ? 'قسمت' : 'Ep'}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                                        <span>{movie.duration}</span>
                                      </>
                                    )}
                                  </span>
                                  <span className="text-slate-300 font-medium truncate max-w-[140px]">
                                    {movie.genre}
                                  </span>
                                </div>

                                {/* Motivational Theme Banner */}
                                {movie.motivationalTheme && (
                                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-[11px] mt-2.5 flex items-start gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                                    <span className="line-clamp-2 font-medium">
                                      {movie.motivationalTheme}
                                    </span>
                                  </div>
                                )}

                                {/* Synopsis */}
                                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed line-clamp-2">
                                  {movie.synopsis}
                                </p>
                              </div>

                              {/* Action Buttons */}
                              <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  {/* Direct Playlist & Episode Entry Button - Always Available */}
                                  <button
                                    type="button"
                                    id={`open-playlist-btn-${movie.id}`}
                                    onClick={() => onOpenMoviePlayer && onOpenMoviePlayer(movie)}
                                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                                  >
                                    <Layers className="w-4 h-4" />
                                    <span>
                                      {isEpisodic
                                        ? (isFa ? 'ورود به پلی‌لیست و قسمت‌ها' : 'Open Playlist & Episodes')
                                        : (isFa ? 'ورود به پلی‌لیست و تماشا' : 'Open Playlist & Watch')}
                                    </span>
                                  </button>

                                  {/* Full Unlock Shortcut (if locked) OR Download button (if unlocked) */}
                                  {!isUnlocked ? (
                                    <button
                                      type="button"
                                      id={`buy-all-btn-${movie.id}`}
                                      onClick={() => handlePurchaseMovie(movie)}
                                      className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs ${
                                        canAfford
                                          ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30'
                                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
                                      }`}
                                      title={isFa ? `خرید کل اثر (${formatNumber(calculatedTotalPrice, language)} سکه)` : `Unlock Full (${calculatedTotalPrice} Coins)`}
                                    >
                                      <Coins className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">
                                        {isFa ? `خرید کل (${formatNumber(calculatedTotalPrice, language)})` : `Buy All (${calculatedTotalPrice})`}
                                      </span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => downloadMovieFile(movie)}
                                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer shrink-0"
                                      title={isFa ? 'دانلود یا لینک مستقیم' : 'Download / Stream'}
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>

                                {/* Media Management: Edit & Delete */}
                                <div className="flex items-center gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => onOpenUploadMovieModal && onOpenUploadMovieModal(movie)}
                                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3 text-slate-400" />
                                    <span>{isFa ? 'ویرایش اثر / قسمت‌ها' : 'Edit Media'}</span>
                                  </button>

                                  {onDeleteCustomMovie && (
                                    <button
                                      type="button"
                                      onClick={() => setMovieToDelete(movie)}
                                      className="py-1.5 px-2.5 rounded-xl bg-slate-950 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition cursor-pointer font-bold text-[11px] flex items-center gap-1 shrink-0"
                                      title={isFa ? 'حذف این اثر و آزادسازی حافظه سرور' : 'Delete media & free storage'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>{isFa ? 'حذف' : 'Delete'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. NOVELS & BOOKS SECTION                                                 */}
          {/* ========================================================================= */}
          {activeSection === 'novels' && (
            <div className="space-y-4">
              {/* Novel Filters Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute start-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={novelSearchQuery}
                    onChange={(e) => setNovelSearchQuery(e.target.value)}
                    placeholder={isFa ? 'جستجوی رمان، نویسنده، خلاصه...' : 'Search novels, author, synopsis...'}
                    className="w-full ps-10 pe-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-hidden transition"
                  />
                  {novelSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setNovelSearchQuery('')}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  {(['all', 'unlocked', 'locked'] as FilterStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNovelStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        novelStatusFilter === st
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st === 'all'
                        ? (isFa ? 'همه رمان‌ها' : 'All')
                        : st === 'unlocked'
                        ? (isFa ? 'کتاب‌های من' : 'My Books')
                        : (isFa ? 'قابل خرید' : 'Locked')}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                  <select
                    value={selectedNovelGenre}
                    onChange={(e) => setSelectedNovelGenre(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-blue-500 outline-hidden cursor-pointer"
                  >
                    <option value="all">{isFa ? 'همه ژانرهای رمان' : 'All Genres'}</option>
                    {novelGenres.filter((g) => g !== 'all').map((g) => (
                      <option key={g} value={g} className="bg-slate-900 text-white">
                        {g}
                      </option>
                    ))}
                  </select>

                  <select
                    value={novelSortBy}
                    onChange={(e) => setNovelSortBy(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-blue-500 outline-hidden cursor-pointer"
                  >
                    <option value="newest">{isFa ? 'جدیدترین‌ها' : 'Newest'}</option>
                    <option value="rating">{isFa ? 'بالاترین امتیاز' : 'Top Rated'}</option>
                    <option value="price_asc">{isFa ? 'ارزان‌ترین' : 'Lowest Price'}</option>
                    <option value="price_desc">{isFa ? 'گران‌ترین' : 'Highest Price'}</option>
                  </select>
                </div>
              </div>

              {/* Live Background Translation Progress Widget Banner */}
              <BackgroundTranslationProgressBanner
                language={language}
                onOpenReader={onOpenReader}
                novels={allNovels}
              />

              {/* Novels Grid */}
              {filteredNovels.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
                  <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-300">
                    {isFa ? 'رمانی با این مشخصات یافت نشد.' : 'No novels found.'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {isFa ? 'می‌توانید رمان دلخواه خود را اضافه کنید یا فیلترها را تغییر دهید.' : 'You can upload your own custom web novel!'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {filteredNovels.map((novel) => {
                    const isUnlocked = (wallet?.unlockedNovelIds || []).includes(novel.id);
                    const calculatedPrice = getNovelTotalCalculatedPrice(novel);
                    const canAfford = wallet.coins >= calculatedPrice;
                    const readingProg = wallet.readingProgress?.[novel.id];
                    const lastReadChapter = getLastReadChapterNumber(wallet, novel.id);
                    const readCount = getReadChaptersCount(wallet, novel.id);

                    return (
                      <div
                        key={novel.id}
                        id={`novel-card-${novel.id}`}
                        className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all duration-200 group ${
                          isUnlocked
                            ? 'bg-slate-900/60 border-slate-700 hover:border-slate-600 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Cover Top Gradient Banner */}
                        <div
                          className="min-h-[7.5rem] h-auto bg-slate-900 p-4 flex flex-col justify-between gap-2.5 relative overflow-hidden border-b border-slate-800"
                        >
                          <div className="flex items-center justify-between gap-2 z-10">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold bg-slate-950 text-slate-300 px-2.5 py-0.5 rounded-md border border-slate-800">
                                {novel.genre}
                              </span>
                              {lastReadChapter !== null && (
                                <span
                                  id={`novel-card-last-read-${novel.id}`}
                                  className="text-[10px] font-black bg-blue-600/30 text-blue-200 border border-blue-400/50 px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 backdrop-blur-xs animate-in fade-in"
                                  title={isFa ? `آخرین فصل خوانده شده: فصل ${formatNumber(lastReadChapter, language)}` : `Last read chapter: ${lastReadChapter}`}
                                >
                                  <BookCheck className="w-3 h-3 text-blue-300 stroke-[2.5]" />
                                  <span>{isFa ? `فصل ${formatNumber(lastReadChapter, language)}` : isAr ? `فصل ${formatNumber(lastReadChapter, language)}` : `Ch. ${lastReadChapter}`}</span>
                                </span>
                              )}
                            </div>

                            {isUnlocked ? (
                              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {isFa ? 'خریداری‌شده' : 'Unlocked'}
                              </span>
                            ) : (
                              <div className="flex flex-col items-end">
                                <span className="text-[11px] font-bold bg-slate-800 text-blue-300 border border-slate-700 px-2.5 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                                  <Coins className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>{formatNumber(calculatedPrice, language)} {isFa ? 'سکه' : 'coins'}</span>
                                </span>
                                {novel.pricePerChapter && novel.chapters && novel.chapters.length > 1 && (
                                  <span className="text-[9px] text-slate-400 mt-0.5 font-medium">
                                    ({formatNumber(novel.pricePerChapter, language)} {isFa ? 'سکه/فصل' : 'coins/ch'})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="z-10 min-w-0 w-full">
                            <h3
                              className="text-base font-bold text-white leading-tight drop-shadow-sm break-words"
                              title={novel.title}
                            >
                              {truncateTitleByWords(novel.title, 6, 38)}
                            </h3>
                            <p
                              className="text-[11px] text-slate-400 font-medium truncate block mt-1"
                              title={novel.author}
                            >
                              {isFa ? 'نویسنده:' : 'By:'} {novel.author}
                            </p>
                          </div>
                        </div>

                        {/* Novel Body */}
                        <div className="p-4 flex-1 flex flex-col justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800 gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                                  <span>{formatNumber(novel.chapters?.length || 0, language)} {isFa ? 'فصل' : 'chapters'}</span>
                                </span>
                                {lastReadChapter !== null && (
                                  <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded-md text-[10px]">
                                    <CheckCheck className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                                    <span>{isFa ? `فصل ${formatNumber(lastReadChapter, language)}` : isAr ? `فصل ${formatNumber(lastReadChapter, language)}` : `Ch. ${lastReadChapter}`}</span>
                                  </span>
                                )}
                              </div>
                              <span className="flex items-center gap-1 text-slate-300 font-bold shrink-0">
                                <Star className="w-3 h-3 fill-slate-300 text-slate-300" />
                                <span>{novel.rating || 4.9}</span>
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 mt-2.5 leading-relaxed line-clamp-3">
                              {resolveNovelSynopsis(novel, language)}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onOpenReader(novel)}
                                className={`flex-1 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${
                                  isUnlocked
                                    ? 'bg-blue-600 hover:bg-blue-500 w-full'
                                    : 'bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200'
                                }`}
                              >
                                {isUnlocked ? (
                                  <>
                                    <BookOpen className="w-4 h-4" />
                                    <span>{isFa ? 'فهرست و مطالعه رمان' : isAr ? 'فهرس وقراءة الرواية' : 'Chapters & Read'}</span>
                                  </>
                                ) : (
                                  <>
                                    <List className="w-4 h-4 text-blue-400" />
                                    <span>{isFa ? 'مشاهده قسمت‌ها و مطالعه' : isAr ? 'عرض الفصول والقراءة' : 'View Chapters'}</span>
                                  </>
                                )}
                              </button>

                              {!isUnlocked && (
                                <button
                                  type="button"
                                  onClick={() => handlePurchaseNovel(novel)}
                                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-xs ${
                                    canAfford
                                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
                                  }`}
                                  title={isFa ? `خرید کل رمان (${formatNumber(calculatedPrice, language)} سکه)` : `Unlock all (${calculatedPrice} coins)`}
                                >
                                  <Coins className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>{formatNumber(calculatedPrice, language)}</span>
                                </button>
                              )}
                            </div>

                            {!novel.isDefault && (
                              <div className="flex items-center gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => onOpenUploadModal(novel)}
                                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-purple-300 hover:text-purple-200 border border-purple-900/40 hover:border-purple-500/50 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                                  title={isFa ? 'افزودن فصل‌های جدید به این رمان' : 'Add new chapters to this novel'}
                                >
                                  <FolderPlus className="w-3.5 h-3.5 text-purple-400" />
                                  <span>{isFa ? 'افزودن فصل جدید' : isAr ? 'إضافة فصول' : 'Add Chapters'}</span>
                                </button>
                                {onDeleteCustomNovel && (
                                  <button
                                    type="button"
                                    onClick={() => setNovelToDelete(novel)}
                                    className="p-1.5 rounded-xl bg-slate-950 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-slate-800 transition cursor-pointer shrink-0"
                                    title={isFa ? 'حذف رمان' : 'Delete Novel'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. TRANSACTION HISTORY SECTION                                            */}
          {/* ========================================================================= */}
          {activeSection === 'history' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {isFa ? 'موجودی فعلی' : 'Current Coins'}
                    </span>
                    <span className="text-base font-black text-blue-400">
                      {formatNumber(wallet.coins, language)} {isFa ? 'سکه' : 'coins'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {isFa ? 'کل سکه‌های کسب‌شده' : 'Total Earned'}
                    </span>
                    <span className="text-base font-black text-emerald-400">
                      +{formatNumber(wallet.totalCoinsEarned, language)} {isFa ? 'سکه' : 'coins'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {isFa ? 'کل سکه‌های خرج‌شده' : 'Total Spent'}
                    </span>
                    <span className="text-base font-black text-rose-400">
                      -{formatNumber(wallet.totalCoinsSpent, language)} {isFa ? 'سکه' : 'coins'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <h3 className="text-xs font-black text-slate-300">
                  {isFa ? 'ریز تراکنش‌ها و فعالیت‌ها:' : 'Transaction History:'}
                </h3>

                {wallet.transactions && wallet.transactions.length > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                    {wallet.transactions.map((tx) => {
                      const isEarn = tx.type === 'earn';
                      return (
                        <div
                          key={tx.id}
                          className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isEarn
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {isEarn ? '+' : '-'}
                            </div>
                            <div>
                              <p className="font-bold text-white leading-snug">{tx.description}</p>
                              <span className="text-[10px] text-slate-500">{tx.timestamp}</span>
                            </div>
                          </div>

                          <span
                            className={`font-black text-xs shrink-0 ${
                              isEarn ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isEarn ? '+' : '-'}
                            {formatNumber(tx.amount, language)} {isFa ? 'سکه' : 'coins'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-6">
                    {isFa ? 'هنوز تراکنشی ثبت نشده است.' : 'No transactions recorded yet.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info banner */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between px-5">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>
              {isFa
                ? 'با انجام مداوم عادات روزانه خود، سکه‌های بیشتر پاداش بگیرید و آرشیو سینمایی و رمان‌ها را گسترش دهید.'
                : 'Complete daily habits to earn reward coins and unlock media masterpieces.'}
            </span>
          </span>
          <span className="text-slate-500 font-bold hidden sm:inline">
            {formatNumber(unlockedMoviesCount, language)} {isFa ? 'فیلم و سریال بازشده' : 'Unlocked Media'}
          </span>
        </div>
      </div>

      {/* QUICK CREATE PLAYLIST MODAL DIALOG */}
      {isPlaylistModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsPlaylistModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 text-white rounded-3xl border border-slate-800 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">
                  {isFa ? 'ایجاد پلی‌لیست و کالکشن جدید' : 'Create New Playlist'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPlaylistModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {isFa ? 'نام پلی‌لیست / کالکشن *' : 'Playlist Title *'}
                </label>
                <input
                  type="text"
                  required
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  placeholder={isFa ? 'مثال: شاهکارهای نولان / انیمه‌های اراده' : 'e.g. Nolan Collection'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {isFa ? 'نوع محتوای این پلی‌لیست' : 'Media Type'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'movie', label: isFa ? 'فیلم سینمایی' : 'Movie' },
                    { id: 'series', label: isFa ? 'سریال' : 'Series' },
                    { id: 'anime', label: isFa ? 'انیمه' : 'Anime' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewPlaylistType(t.id as MediaType)}
                      className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        newPlaylistType === t.id
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {isFa ? 'توضیحات کوتاه درباره موضوع کالکشن' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder={isFa ? 'مجموعه‌ای با تم استقامت و تمرکز عمیق...' : 'Curated collection for deep work...'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaylistModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  {isFa ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs"
                >
                  {isFa ? 'ایجاد پلی‌لیست' : 'Create Playlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEDICATED MEDIA DELETION & SERVER STORAGE WIPE CONFIRMATION MODAL */}
      {movieToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
          dir={isRtl ? 'rtl' : 'ltr'}
          onClick={(e) => {
            e.stopPropagation();
            if (!isDeletingMovie) setMovieToDelete(null);
          }}
        >
          <div
            dir={isRtl ? 'rtl' : 'ltr'}
            className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-white relative animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {isFa ? 'حذف اثر و آزادسازی حافظه سرور' : 'Delete Media & Free Server Storage'}
                  </h3>
                  <p className="text-[11px] text-rose-400 font-medium">
                    {isFa ? 'عملیات غیرقابل بازگشت پاک‌سازی فایل‌ها' : 'Irreversible physical file deletion'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDeletingMovie) setMovieToDelete(null);
                }}
                disabled={isDeletingMovie}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Media Card Preview */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-black text-rose-200 line-clamp-1">
                  {movieToDelete.title}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-800 text-rose-300">
                  {getMediaTypeMeta(movieToDelete.mediaType || 'movie', language).label}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap">
                {movieToDelete.duration && (
                  <span>⏱️ {movieToDelete.duration}</span>
                )}
                {countTotalSeasons(movieToDelete) > 0 && (
                  <span>📂 {countTotalSeasons(movieToDelete)} {isFa ? 'فصل' : 'Seasons'}</span>
                )}
                {countTotalEpisodes(movieToDelete) > 0 && (
                  <span>🎬 {countTotalEpisodes(movieToDelete)} {isFa ? 'قسمت' : 'Episodes'}</span>
                )}
                {movieToDelete.fileSize && (
                  <span>💾 {movieToDelete.fileSize}</span>
                )}
              </div>
            </div>

            {/* Warning Explanation Text */}
            <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-900/50 text-[11px] text-slate-300 leading-relaxed space-y-1.5">
              <p className="font-bold text-rose-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span>{isFa ? 'توضیحات پاک‌سازی دیسک و سرور:' : 'Disk & Storage Wipe Details:'}</span>
              </p>
              <p>
                {isFa
                  ? 'با تایید این درخواست، تمام فایل‌های ویدیویی آپلود شده، تمام قسمت‌ها، تصاویر پوستر و رکوردهای پایگاه داده این فیلم/سریال به صورت فیزیکی از روی هارد سرور و حافظه محلی به طور کامل حذف می‌گردد تا فضای ذخیره‌سازی آزاد شود.'
                  : 'Confirming will physically delete all uploaded video files, episodes, covers, and database entries from the server disk and local storage to free up maximum space.'}
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMovieToDelete(null);
                }}
                disabled={isDeletingMovie}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleConfirmMovieDeletion}
                disabled={isDeletingMovie}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs shadow-lg shadow-rose-900/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isDeletingMovie ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isFa ? 'در حال حذف و آزادسازی حافظه...' : 'Deleting & Freeing Space...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isFa ? 'حذف دائمی و آزادسازی فضا' : 'Permanently Delete & Free Space'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOVEL DELETION CONFIRMATION MODAL */}
      {novelToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          dir={isRtl ? 'rtl' : 'ltr'}
          onClick={(e) => {
            e.stopPropagation();
            if (!isDeletingNovel) setNovelToDelete(null);
          }}
        >
          <div
            className="w-full max-w-md bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {isFa ? 'حذف رمان از فروشگاه' : isAr ? 'حذف الرواية من المتجر' : 'Delete Novel'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isFa ? 'آیا از حذف این رمان اطمینان دارید؟' : 'Are you sure you want to delete this novel?'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDeletingNovel) setNovelToDelete(null);
                }}
                disabled={isDeletingNovel}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Novel Card Details */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-rose-300">
                  {novelToDelete.title}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                  {novelToDelete.genre || (isFa ? 'فانتزی' : 'Fantasy')}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap">
                {novelToDelete.author && (
                  <span>✍️ {novelToDelete.author}</span>
                )}
                <span>📖 {formatNumber(novelToDelete.chapters?.length || 0, language)} {isFa ? 'فصل' : isAr ? 'فصل' : 'chapters'}</span>
                <span>🪙 {formatNumber(getNovelTotalCalculatedPrice(novelToDelete), language)} {isFa ? 'سکه' : 'coins'}</span>
              </div>
            </div>

            {/* Warning Explanation Text */}
            <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-900/50 text-[11px] text-slate-300 leading-relaxed space-y-1.5">
              <p className="font-bold text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>{isFa ? 'هشدار حذف غیرقابل بازگشت:' : 'Permanent Deletion Warning:'}</span>
              </p>
              <p>
                {isFa
                  ? 'با حذف این رمان، تمام فصل‌ها و متن‌های مربوط به آن از پایگاه داده و فروشگاه حذف خواهند شد و این عملیات قابل بازگشت نخواهد بود.'
                  : 'Deleting this novel will permanently remove all its chapters and text from the store and database. This action cannot be undone.'}
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setNovelToDelete(null);
                }}
                disabled={isDeletingNovel}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                {isFa ? 'انصراف' : isAr ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleConfirmNovelDeletion}
                disabled={isDeletingNovel}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs shadow-lg shadow-rose-900/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isDeletingNovel ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isFa ? 'در حال حذف...' : 'Deleting...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isFa ? 'تأیید و حذف رمان' : isAr ? 'تأكيد الحذف' : 'Confirm Delete'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYLIST DELETION CONFIRMATION MODAL */}
      {playlistToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          dir={isRtl ? 'rtl' : 'ltr'}
          onClick={(e) => {
            e.stopPropagation();
            if (!isDeletingPlaylist) setPlaylistToDelete(null);
          }}
        >
          <div
            className="w-full max-w-md bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {isFa ? 'حذف پلی‌لیست / مجموعه' : 'Delete Playlist'}
                  </h3>
                  <p className="text-[11px] text-rose-400 font-medium">
                    {playlistToDelete.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDeletingPlaylist) setPlaylistToDelete(null);
                }}
                disabled={isDeletingPlaylist}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={deletePlaylistAndMovies}
                  onChange={(e) => setDeletePlaylistAndMovies(e.target.checked)}
                  className="mt-1 rounded border-slate-700 text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <div>
                  <span className="font-bold text-white block">
                    {isFa ? 'حذف تمام فیلم‌ها و فایل‌های ویدیویی این مجموعه از سرور' : 'Also delete all movies & video files inside'}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                    {isFa
                      ? 'در صورت فعال کردن این گزینه، کلیه فیلم‌ها و قسمت‌های متعلق به این مجموعه نیز به صورت فیزیکی از روی هارد سرور پاک شده و حافظه آزاد می‌گردد.'
                      : 'Physically delete media files inside this playlist from the server to reclaim storage.'}
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingPlaylist}
                onClick={(e) => {
                  e.stopPropagation();
                  setPlaylistToDelete(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>

              <button
                type="button"
                disabled={isDeletingPlaylist}
                onClick={handleConfirmPlaylistDeletion}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs shadow-lg shadow-rose-900/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isDeletingPlaylist ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isFa ? 'در حال حذف...' : 'Deleting...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isFa ? 'تأیید حذف پلی‌لیست' : 'Confirm Delete'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING DELETION TOAST FEEDBACK */}
      {deletionSuccessToast && (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-emerald-500/50 text-white px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 max-w-md w-[90%]"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-slate-100">{deletionSuccessToast.message}</p>
            {deletionSuccessToast.freedText && (
              <p className="text-[11px] text-emerald-400 font-medium">
                {isFa ? `فضای آزاد شده: ${deletionSuccessToast.freedText}` : `Freed storage: ${deletionSuccessToast.freedText}`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* COINS ANALYTICS REPORT MODAL */}
      <CoinReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        wallet={wallet}
        language={language}
        appearance={appearance}
      />
    </div>
  );
};
