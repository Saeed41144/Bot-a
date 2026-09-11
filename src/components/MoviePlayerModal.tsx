import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Film,
  Star,
  Clock,
  Calendar,
  User,
  Layers,
  Download,
  ExternalLink,
  Tv,
  Eye,
  CheckCircle2,
  Bookmark,
  Share2,
  Lock,
  Coins,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  SkipBack,
  Info,
  Trash2,
  Grid
} from 'lucide-react';
import { ShopMovie, Language, UserRewardWallet, VideoSeason, VideoEpisode } from '../types';
import { formatNumber } from '../utils/translations';
import { isMovieUnlocked, isEpisodeUnlocked, getMediaTypeMeta, getMovieTotalCalculatedPrice } from '../utils/movieData';

interface MoviePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie: ShopMovie | null;
  language: Language;
  wallet: UserRewardWallet;
  onUnlockEpisode?: (movieId: string, episodeId: string, cost: number) => void;
  onUnlockMovie?: (movieId: string, cost: number) => void;
  onDeleteMovie?: (movieId: string) => Promise<any> | void;
  onDeleteSeason?: (movieId: string, seasonId: string) => Promise<any> | void;
  onDeleteEpisode?: (movieId: string, episodeId: string) => Promise<any> | void;
}

export const MoviePlayerModal: React.FC<MoviePlayerModalProps> = ({
  isOpen,
  onClose,
  movie,
  language,
  wallet,
  onUnlockEpisode,
  onUnlockMovie,
  onDeleteMovie,
  onDeleteSeason,
  onDeleteEpisode,
}) => {
  const isFa = language === 'fa';
  const isAr = language === 'ar';
  const isRtl = isFa || isAr;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const toggleFullscreen = async () => {
    const container = playerContainerRef.current || videoRef.current;
    if (!container) return;

    try {
      const isAlreadyFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isAlreadyFull) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
          (container as any).mozRequestFullScreen();
        } else if ((container as any).msRequestFullscreen) {
          (container as any).msRequestFullscreen();
        } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
          (videoRef.current as any).webkitEnterFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle fallback triggered:', err);
      try {
        if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
          (videoRef.current as any).webkitEnterFullscreen();
        } else if (videoRef.current?.requestFullscreen) {
          videoRef.current.requestFullscreen().catch(() => {});
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFull);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Screen View Mode: 'seasons' (Seasons Box Selection) | 'episodes' (Episodes Box Selection) | 'player' (Cinema Video Watch)
  const [screenMode, setScreenMode] = useState<'seasons' | 'episodes' | 'player'>('seasons');

  // Episodic navigation state
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState<number>(0);
  const [currentEpisode, setCurrentEpisode] = useState<VideoEpisode | null>(null);
  const [localSeasons, setLocalSeasons] = useState<VideoSeason[]>([]);

  // Deletion states
  const [isConfirmingMovieDelete, setIsConfirmingMovieDelete] = useState(false);
  const [seasonToDelete, setSeasonToDelete] = useState<VideoSeason | null>(null);
  const [episodeToDelete, setEpisodeToDelete] = useState<VideoEpisode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [playerToast, setPlayerToast] = useState<{ message: string; freedText?: string } | null>(null);

  // Derive standalone episodes if seasons aren't present but standalone episodes exist
  const effectiveSeasons: VideoSeason[] = React.useMemo(() => {
    if (localSeasons && localSeasons.length > 0) {
      return localSeasons;
    }
    if (movie?.standaloneEpisodes && movie.standaloneEpisodes.length > 0) {
      return [
        {
          id: 'season-standalone',
          seasonNumber: 1,
          title: isFa ? 'قسمت‌های اثر' : 'Episodes',
          episodes: movie.standaloneEpisodes,
        },
      ];
    }
    return [];
  }, [localSeasons, movie, isFa]);

  const isMultiSeason = effectiveSeasons.length > 1;
  const isEpisodic = effectiveSeasons.length > 0;

  useEffect(() => {
    if (isOpen && movie) {
      setIsPlaying(false);
      const seasonsList = movie.seasons || [];
      setLocalSeasons(seasonsList);

      const hasMultipleSeasons = seasonsList.length > 1;
      const hasAnyEpisodes = seasonsList.length > 0 || (movie.standaloneEpisodes && movie.standaloneEpisodes.length > 0);

      setSelectedSeasonIndex(0);

      if (hasMultipleSeasons) {
        // Multiple seasons: start on seasons screen
        setScreenMode('seasons');
        const firstSeason = seasonsList[0];
        setCurrentEpisode(firstSeason?.episodes?.[0] || null);
      } else if (hasAnyEpisodes) {
        // Single season or direct episodes: start on episodes screen
        setScreenMode('episodes');
        const firstEp = seasonsList[0]?.episodes?.[0] || movie.standaloneEpisodes?.[0] || null;
        setCurrentEpisode(firstEp);
      } else {
        // Feature movie (single video): start directly on player
        setScreenMode('player');
        setCurrentEpisode(null);
      }
    }
  }, [isOpen, movie]);

  if (!isOpen || !movie) return null;

  const activeSeason: VideoSeason | undefined = effectiveSeasons[selectedSeasonIndex] || effectiveSeasons[0];
  const activeEpisodesList = activeSeason?.episodes || movie.standaloneEpisodes || [];

  const handleConfirmDeleteSeason = async () => {
    if (!seasonToDelete || !onDeleteSeason) return;
    setIsDeleting(true);
    try {
      const res: any = await onDeleteSeason(movie.id, seasonToDelete.id);
      const freedMsg = res && typeof res === 'object' && res.formattedFreedBytes
        ? ` (${res.formattedFreedBytes} آزاد شد)`
        : '';
      const updatedSeasons = localSeasons.filter((s) => s.id !== seasonToDelete.id);
      setLocalSeasons(updatedSeasons);
      setSelectedSeasonIndex(0);
      if (updatedSeasons.length > 0 && updatedSeasons[0].episodes?.length > 0) {
        setCurrentEpisode(updatedSeasons[0].episodes[0]);
      } else {
        setCurrentEpisode(null);
      }
      setPlayerToast({
        message: isFa ? `فصل «${seasonToDelete.title}» و فایل‌های ویدیویی آن با موفقیت از سرور حذف شد${freedMsg}` : `Season deleted from server${freedMsg}`,
        freedText: res?.formattedFreedBytes,
      });
      setTimeout(() => setPlayerToast(null), 4000);
      if (updatedSeasons.length <= 1) {
        setScreenMode('episodes');
      }
    } catch (err) {
      console.error('Error deleting season:', err);
    } finally {
      setIsDeleting(false);
      setSeasonToDelete(null);
    }
  };

  const handleConfirmDeleteEpisode = async () => {
    if (!episodeToDelete || !onDeleteEpisode) return;
    setIsDeleting(true);
    try {
      const res: any = await onDeleteEpisode(movie.id, episodeToDelete.id);
      const freedMsg = res && typeof res === 'object' && res.formattedFreedBytes
        ? ` (${res.formattedFreedBytes} آزاد شد)`
        : '';
      const updatedSeasons = localSeasons.map((s) => ({
        ...s,
        episodes: (s.episodes || []).filter((ep) => ep.id !== episodeToDelete.id),
      }));
      setLocalSeasons(updatedSeasons);
      if (currentEpisode?.id === episodeToDelete.id) {
        const nextEp = activeSeason?.episodes?.find((ep) => ep.id !== episodeToDelete.id) || null;
        setCurrentEpisode(nextEp);
      }
      setPlayerToast({
        message: isFa ? `قسمت «${episodeToDelete.title}» با موفقیت از سرور حذف شد${freedMsg}` : `Episode deleted from server${freedMsg}`,
        freedText: res?.formattedFreedBytes,
      });
      setTimeout(() => setPlayerToast(null), 4000);
    } catch (err) {
      console.error('Error deleting episode:', err);
    } finally {
      setIsDeleting(false);
      setEpisodeToDelete(null);
    }
  };

  const handleConfirmDeleteMovie = async () => {
    if (!onDeleteMovie) return;
    setIsDeleting(true);
    try {
      await onDeleteMovie(movie.id);
      onClose();
    } catch (err) {
      console.error('Error deleting movie:', err);
    } finally {
      setIsDeleting(false);
      setIsConfirmingMovieDelete(false);
    }
  };

  const isFullMovieUnlocked = isMovieUnlocked(wallet, movie.id);
  const calculatedFullUnlockPrice = getMovieTotalCalculatedPrice(movie);
  const isCurrentEpisodeUnlocked = currentEpisode
    ? isEpisodeUnlocked(wallet, movie.id, currentEpisode)
    : isFullMovieUnlocked;

  const mediaMeta = getMediaTypeMeta(movie.mediaType || 'movie', language);

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const handleDownload = () => {
    const targetFileData = currentEpisode?.fileData || movie.fileData;
    const targetFileName = currentEpisode?.fileName || movie.fileName || `${movie.title}.mp4`;
    const targetUrl = currentEpisode?.videoUrl || movie.videoUrl;

    if (targetFileData) {
      const a = document.createElement('a');
      a.href = targetFileData;
      a.download = targetFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (targetUrl) {
      window.open(targetUrl, '_blank');
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${movie.title} - ${movie.synopsis}`);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Switch episode and enter video player
  const handlePlayEpisode = (ep: VideoEpisode) => {
    setCurrentEpisode(ep);
    setIsPlaying(false);
    setScreenMode('player');
  };

  // Next / Previous episode navigation
  const currentEpIndex = currentEpisode
    ? activeEpisodesList.findIndex((e) => e.id === currentEpisode.id)
    : -1;

  const handleNextEpisode = () => {
    if (currentEpIndex >= 0 && currentEpIndex < activeEpisodesList.length - 1) {
      handlePlayEpisode(activeEpisodesList[currentEpIndex + 1]);
    }
  };

  const handlePrevEpisode = () => {
    if (currentEpIndex > 0) {
      handlePlayEpisode(activeEpisodesList[currentEpIndex - 1]);
    }
  };

  // Determine active video source
  let currentVideoSrc = '';
  if (isEpisodic && currentEpisode) {
    currentVideoSrc = currentEpisode.fileData || currentEpisode.videoUrl || movie.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  } else {
    currentVideoSrc = movie.fileData || movie.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }

  const totalEpisodesCount = effectiveSeasons.reduce((acc, s) => acc + (s.episodes?.length || 0), 0);

  return (
    <div
      id="movie-player-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-lg overflow-y-auto animate-in fade-in duration-200"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div
        className={`w-full ${
          isTheaterMode ? 'max-w-6xl' : 'max-w-4xl'
        } bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh] transition-all duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* TOP APP-BAR NAVIGATION HEADER                                             */}
        {/* ========================================================================= */}
        <div className="px-4 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          {/* Left / Start: Breadcrumbs & Back Navigation */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {/* If in Player view: Back to Episodes */}
            {screenMode === 'player' && isEpisodic && (
              <button
                type="button"
                id="btn-back-to-episodes"
                onClick={() => {
                  if (videoRef.current) videoRef.current.pause();
                  setIsPlaying(false);
                  setScreenMode('episodes');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                <span>{isFa ? 'بازگشت به قسمت‌ها' : 'Back to Episodes'}</span>
              </button>
            )}

            {/* If in Episodes view and there are multiple seasons: Back to Seasons */}
            {screenMode === 'episodes' && isMultiSeason && (
              <button
                type="button"
                id="btn-back-to-seasons"
                onClick={() => {
                  setScreenMode('seasons');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                <span>{isFa ? 'بازگشت به انتخاب فصل‌ها' : 'Back to Seasons'}</span>
              </button>
            )}

            {/* Title & Media Type Badge */}
            <div className="flex items-center gap-2 min-w-0">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-xs ${mediaMeta.badgeBg}`}>
                {mediaMeta.label}
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                {movie.title}
              </h2>
            </div>

            {/* Breadcrumb Indicators */}
            {screenMode === 'episodes' && activeSeason && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-lg">
                <span>{activeSeason.title}</span>
              </span>
            )}
            {screenMode === 'player' && currentEpisode && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-blue-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-lg truncate max-w-[160px]">
                <span>{currentEpisode.title}</span>
              </span>
            )}
          </div>

          {/* Right / End: Screen Switcher & Action Tools */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Direct Season Switcher Tab if multi-season and in episodes screen */}
            {screenMode === 'episodes' && isMultiSeason && (
              <button
                type="button"
                onClick={() => setScreenMode('seasons')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                title={isFa ? 'مشاهده تمام فصل‌ها' : 'All Seasons'}
              >
                <Grid className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">{isFa ? 'فهرست فصل‌ها' : 'All Seasons'}</span>
              </button>
            )}

            {screenMode === 'player' && (
              <>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                    isFullscreen
                      ? 'bg-blue-600/25 text-blue-300 border-blue-500/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title={isFullscreen ? (isFa ? 'خروج از تمام صفحه' : 'Exit Fullscreen') : (isFa ? 'حالت تمام صفحه' : 'Fullscreen Mode')}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-blue-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isFullscreen ? (isFa ? 'خروج تمام صفحه' : 'Exit Full') : (isFa ? 'تمام صفحه' : 'Fullscreen')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTheaterMode(!isTheaterMode)}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                    isTheaterMode
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title={isFa ? 'حالت سینما و عریض' : 'Theater Mode'}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isFa ? 'حالت سینما' : 'Theater'}</span>
                </button>
              </>
            )}

            <button
              type="button"
              id="close-movie-player-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SCREEN 1: SEASONS SELECTION PAGE (باکس‌های فصل‌ها)                           */}
        {/* ========================================================================= */}
        {screenMode === 'seasons' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6 text-xs animate-in fade-in duration-150">
            {/* Header Hero Banner */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-400" />
                    <span>{isFa ? 'پلی‌لیست فصل‌ها و قسمت‌ها' : 'Series Playlist'}</span>
                  </span>
                  <span className="text-slate-400 font-bold text-xs">
                    {formatNumber(effectiveSeasons.length, language)} {isFa ? 'فصل' : 'Seasons'} •{' '}
                    {formatNumber(totalEpisodesCount, language)} {isFa ? 'قسمت' : 'Episodes'}
                  </span>
                  {movie.imdbRating && (
                    <span className="text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <Star className="w-3 h-3 text-slate-300 fill-slate-300" />
                      <span>{movie.imdbRating}</span>
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {movie.title}
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-2xl line-clamp-2">
                  {movie.synopsis}
                </p>
              </div>

              {/* Full Series Unlock / Action Button */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {!isFullMovieUnlocked && onUnlockMovie && (
                  <button
                    type="button"
                    onClick={() => onUnlockMovie(movie.id, calculatedFullUnlockPrice)}
                    disabled={wallet.coins < calculatedFullUnlockPrice}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Coins className="w-4 h-4" />
                    <span>
                      {isFa
                        ? `بازگشایی کامل همه فصل‌ها (${formatNumber(calculatedFullUnlockPrice, language)} سکه)`
                        : `Unlock Full Series (${calculatedFullUnlockPrice} Coins)`}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Section Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-800 text-blue-400 border border-slate-700 text-xs font-bold flex items-center justify-center">
                  <Grid className="w-3.5 h-3.5" />
                </span>
                <h4 className="font-bold text-slate-200 text-sm sm:text-base">
                  {isFa ? 'یک فصل را برای مشاهده قسمت‌ها انتخاب کنید:' : 'Select a Season to View Episodes:'}
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {formatNumber(effectiveSeasons.length, language)} {isFa ? 'فصل موجود' : 'Seasons available'}
              </span>
            </div>

            {/* SEASONS GRID: EACH SEASON IN A DEDICATED STYLISH BOX */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {effectiveSeasons.map((season, idx) => {
                const epCount = season.episodes?.length || 0;

                return (
                  <div
                    key={season.id || idx}
                    id={`season-box-${season.id || idx}`}
                    className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-slate-700 transition flex flex-col justify-between gap-4 group relative shadow-xs"
                  >
                    <div className="space-y-3">
                      {/* Top Row: Season Icon Badge & Ep Count */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-base flex items-center justify-center">
                            {season.seasonNumber || idx + 1}
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-slate-300 block">
                              {isFa ? `فصل ${season.seasonNumber || idx + 1}` : `Season ${season.seasonNumber || idx + 1}`}
                            </span>
                            <span className="text-[11px] font-medium text-slate-400">
                              {formatNumber(epCount, language)} {isFa ? 'قسمت' : 'Episodes'}
                            </span>
                          </div>
                        </div>

                        {onDeleteSeason && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSeasonToDelete(season);
                            }}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition cursor-pointer"
                            title={isFa ? 'حذف این فصل از سرور' : 'Delete Season'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Season Title */}
                      <h5 className="font-bold text-sm text-white line-clamp-1">
                        {season.title || (isFa ? `فصل ${idx + 1}` : `Season ${idx + 1}`)}
                      </h5>

                      {/* Season Description */}
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 min-h-[32px]">
                        {season.description ||
                          (isFa
                            ? `قسمت‌های ویدیویی فصل ${idx + 1} با کیفیت بالا.`
                            : `Episodes for Season ${idx + 1}.`)}
                      </p>
                    </div>

                    {/* Action: Enter Season and View Episodes */}
                    <button
                      type="button"
                      id={`enter-season-btn-${season.id || idx}`}
                      onClick={() => {
                        setSelectedSeasonIndex(idx);
                        setScreenMode('episodes');
                      }}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isFa ? 'مشاهده قسمت‌های این فصل' : 'View Season Episodes'}</span>
                      {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Motivational Insight Note */}
            {movie.motivationalTheme && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <h4 className="text-xs font-bold text-slate-200">
                    {isFa ? 'پیام انگیزشی اثر:' : 'Motivational Insight:'}
                  </h4>
                </div>
                <p className="text-slate-400 leading-relaxed text-xs">
                  {movie.motivationalTheme}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: EPISODES SELECTION PAGE (باکس‌های قسمت‌ها)                         */}
        {/* ========================================================================= */}
        {screenMode === 'episodes' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6 text-xs animate-in fade-in duration-150">
            {/* Season Context Banner */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {isMultiSeason && (
                    <button
                      type="button"
                      onClick={() => setScreenMode('seasons')}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      {isRtl ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                      <span>{isFa ? 'تغییر فصل' : 'Switch Season'}</span>
                    </button>
                  )}
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold">
                    {activeSeason?.title || (isFa ? 'فهرست قسمت‌ها' : 'Episodes')}
                  </span>
                  <span className="text-slate-400 font-bold text-xs">
                    {formatNumber(activeEpisodesList.length, language)} {isFa ? 'قسمت در این بخش' : 'Episodes'}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white">
                  {movie.title} • {activeSeason?.title || (isFa ? 'فصل اول' : 'Season 1')}
                </h3>
                {activeSeason?.description && (
                  <p className="text-slate-400 text-xs leading-relaxed max-w-2xl line-clamp-2">
                    {activeSeason.description}
                  </p>
                )}
              </div>

              {/* Quick Play First / Full Unlock */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {activeEpisodesList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handlePlayEpisode(activeEpisodesList[0])}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isFa ? 'تماشای قسمت اول' : 'Play First Episode'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Season Selection Dropdown/Tabs if multiple seasons */}
            {isMultiSeason && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-bold text-slate-400 shrink-0">
                  {isFa ? 'انتخاب سریع فصل:' : 'Quick Season:'}
                </span>
                {effectiveSeasons.map((s, idx) => (
                  <button
                    key={s.id || idx}
                    type="button"
                    onClick={() => setSelectedSeasonIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                      selectedSeasonIndex === idx
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    {s.title || (isFa ? `فصل ${idx + 1}` : `Season ${idx + 1}`)}
                  </button>
                ))}
              </div>
            )}

            {/* Section Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-800 text-blue-400 border border-slate-700 text-xs font-bold flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 fill-current" />
                </span>
                <h4 className="font-bold text-slate-200 text-sm sm:text-base">
                  {isFa
                    ? `قسمت‌های ${activeSeason?.title || 'این اثر'}:`
                    : `Episodes of ${activeSeason?.title || 'this title'}:`}
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {formatNumber(activeEpisodesList.length, language)} {isFa ? 'قسمت ویدیو' : 'Episodes'}
              </span>
            </div>

            {/* EPISODES GRID: EACH EPISODE IN A DEDICATED STYLISH BOX */}
            {activeEpisodesList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeEpisodesList.map((ep, idx) => {
                  const isEpUnlocked = isEpisodeUnlocked(wallet, movie.id, ep);
                  const isFree = !ep.price || ep.price === 0;

                  return (
                    <div
                      key={ep.id || idx}
                      id={`episode-box-${ep.id || idx}`}
                      className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-slate-700 transition flex flex-col justify-between gap-3.5 group relative shadow-xs"
                    >
                      <div className="space-y-2.5">
                        {/* Top Row: Episode Number Badge + Duration + Lock Status */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                              {ep.episodeNumber || idx + 1}
                            </span>
                            <div>
                              <span className="text-[11px] font-bold text-slate-300 block">
                                {isFa ? `قسمت ${ep.episodeNumber || idx + 1}` : `Episode ${ep.episodeNumber || idx + 1}`}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {ep.duration || (isFa ? '۲۴ دقیقه' : '24 min')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isEpUnlocked ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{isFree ? (isFa ? 'رایگان' : 'Free') : (isFa ? 'بازگشایی‌شده' : 'Unlocked')}</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-blue-300 border border-slate-700 text-[10px] font-bold flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>{formatNumber(ep.price || 2, language)} {isFa ? 'سکه' : 'coins'}</span>
                              </span>
                            )}

                            {onDeleteEpisode && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEpisodeToDelete(ep);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                                title={isFa ? 'حذف قسمت' : 'Delete Episode'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Episode Title */}
                        <h5 className="font-bold text-sm text-white line-clamp-1">
                          {ep.title}
                        </h5>

                        {/* Episode Synopsis */}
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 min-h-[32px]">
                          {ep.synopsis || (isFa ? 'تماشای این قسمت با کیفیت عالی.' : 'Watch this episode.')}
                        </p>
                      </div>

                      {/* Action Button: Play or Unlock */}
                      <div className="pt-2 border-t border-slate-800/80">
                        {isEpUnlocked ? (
                          <button
                            type="button"
                            id={`play-episode-btn-${ep.id || idx}`}
                            onClick={() => handlePlayEpisode(ep)}
                            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{isFa ? 'تماشای این قسمت' : 'Play Episode'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            id={`unlock-episode-btn-${ep.id || idx}`}
                            onClick={() => {
                              if (onUnlockEpisode) {
                                onUnlockEpisode(movie.id, ep.id, ep.price || 2);
                              }
                            }}
                            disabled={wallet.coins < (ep.price || 2)}
                            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>
                              {isFa
                                ? `بازگشایی با ${formatNumber(ep.price || 2, language)} سکه و تماشا`
                                : `Unlock for ${ep.price || 2} Coins & Watch`}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 space-y-2">
                <Film className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300">
                  {isFa ? 'هنوز قسمتی برای این فصل ثبت نشده است.' : 'No episodes recorded for this season yet.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: CINEMA VIDEO PLAYER PAGE                                        */}
        {/* ========================================================================= */}
        {screenMode === 'player' && (
          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar text-xs animate-in fade-in duration-150">
            {/* Video Player Display or Locked State */}
            <div
              ref={playerContainerRef}
              className={`relative bg-black ${
                isFullscreen ? 'fixed inset-0 z-100 w-screen h-screen' : 'aspect-video w-full'
              } overflow-hidden flex items-center justify-center group`}
            >
              {isCurrentEpisodeUnlocked ? (
                <>
                  <video
                    key={currentVideoSrc}
                    ref={videoRef}
                    src={currentVideoSrc}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    playsInline
                    onDoubleClick={toggleFullscreen}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />

                  {/* Floating Quick Fullscreen Overlay Button */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="absolute top-3 end-3 z-30 p-2.5 rounded-xl bg-black/60 hover:bg-black/85 text-white/90 hover:text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer shadow-lg flex items-center gap-1.5 text-xs font-bold"
                    title={isFullscreen ? (isFa ? 'خروج از تمام صفحه (Esc)' : 'Exit Fullscreen (Esc)') : (isFa ? 'حالت تمام صفحه' : 'Fullscreen')}
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize2 className="w-4 h-4 text-blue-400" />
                        <span className="hidden sm:inline">{isFa ? 'خروج تمام صفحه' : 'Exit'}</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-4 h-4 text-blue-400" />
                        <span className="hidden sm:inline">{isFa ? 'تمام صفحه' : 'Fullscreen'}</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 text-blue-400 flex items-center justify-center mb-4 shadow-md">
                    <Lock className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-1">
                    {currentEpisode
                      ? (isFa ? `قسمت «${currentEpisode.title}» قفل است` : `Episode "${currentEpisode.title}" is locked`)
                      : (isFa ? 'این اثر قفل است' : 'This title is locked')}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mb-4">
                    {isFa
                      ? 'برای تماشای این قسمت، می‌توانید از سکه‌های پاداش دریافتی حاصل از انجام عادات روزانه استفاده کنید.'
                      : 'Unlock this episode with your reward coins earned from building daily habits.'}
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {currentEpisode && onUnlockEpisode && (
                      <button
                        type="button"
                        onClick={() => onUnlockEpisode(movie.id, currentEpisode.id, currentEpisode.price || 2)}
                        disabled={wallet.coins < (currentEpisode.price || 2)}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                      >
                        <Coins className="w-4 h-4" />
                        <span>
                          {isFa
                            ? `بازگشایی این قسمت (${formatNumber(currentEpisode.price || 2, language)} سکه)`
                            : `Unlock this Episode (${currentEpisode.price || 2} Coins)`}
                        </span>
                      </button>
                    )}

                    {onUnlockMovie && (
                      <button
                        type="button"
                        onClick={() => onUnlockMovie(movie.id, calculatedFullUnlockPrice)}
                        disabled={wallet.coins < calculatedFullUnlockPrice}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        <span>
                          {isFa
                            ? `بازگشایی کامل تمامی قسمت‌ها (${formatNumber(calculatedFullUnlockPrice, language)} سکه)`
                            : `Unlock All Episodes (${calculatedFullUnlockPrice} Coins)`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Video Controls and Details */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Playback Status Bar & Episode Jumper */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl font-bold bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 fill-current text-blue-400" />
                    <span>
                      {isEpisodic && currentEpisode
                        ? currentEpisode.title
                        : isFa
                        ? 'در حال پخش ویدیو'
                        : 'Now Playing'}
                    </span>
                  </div>

                  {isEpisodic && (
                    <button
                      type="button"
                      onClick={() => {
                        if (videoRef.current) videoRef.current.pause();
                        setIsPlaying(false);
                        setScreenMode('episodes');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                    >
                      <Grid className="w-3.5 h-3.5 text-blue-400" />
                      <span>{isFa ? 'فهرست قسمت‌ها' : 'Episode List'}</span>
                    </button>
                  )}
                </div>

                {/* Next / Prev Episode navigation & Speed */}
                <div className="flex items-center gap-2">
                  {isEpisodic && activeEpisodesList.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handlePrevEpisode}
                        disabled={currentEpIndex <= 0}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1"
                        title={isFa ? 'قسمت قبلی' : 'Previous Episode'}
                      >
                        {isRtl ? <SkipForward className="w-3.5 h-3.5" /> : <SkipBack className="w-3.5 h-3.5" />}
                        <span className="text-[10px] hidden sm:inline">{isFa ? 'قسمت قبلی' : 'Prev'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleNextEpisode}
                        disabled={currentEpIndex >= activeEpisodesList.length - 1}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1"
                        title={isFa ? 'قسمت بعدی' : 'Next Episode'}
                      >
                        <span className="text-[10px] hidden sm:inline">{isFa ? 'قسمت بعدی' : 'Next'}</span>
                        {isRtl ? <SkipBack className="w-3.5 h-3.5" /> : <SkipForward className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  {/* Playback Speed */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400 font-medium me-1">
                      {isFa ? 'سرعت:' : 'Speed:'}
                    </span>
                    {[1, 1.25, 1.5, 2].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => handleSpeedChange(spd)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          playbackSpeed === spd
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  {/* Fullscreen Mode Button */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      isFullscreen
                        ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
                    }`}
                    title={isFullscreen ? (isFa ? 'خروج از تمام صفحه' : 'Exit Fullscreen') : (isFa ? 'حالت تمام صفحه' : 'Fullscreen')}
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-blue-400" />}
                    <span className="text-[11px]">{isFullscreen ? (isFa ? 'خروج تمام صفحه' : 'Exit') : (isFa ? 'تمام صفحه' : 'Fullscreen')}</span>
                  </button>
                </div>
              </div>

              {/* Motivational Insight Note */}
              {movie.motivationalTheme && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-slate-200">
                      {isFa ? 'پیام انگیزشی اثر:' : 'Motivational Takeaway:'}
                    </h3>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-xs">
                    {movie.motivationalTheme}
                  </p>
                </div>
              )}

              {/* Synopsis */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 mb-2">
                  {isFa ? 'خلاصه داستان:' : 'Synopsis:'}
                </h3>
                <p className="text-slate-400 leading-relaxed text-xs">
                  {currentEpisode?.synopsis || movie.synopsis}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FOOTER ACTIONS                                                            */}
        {/* ========================================================================= */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>{isFa ? 'دریافت ویدیو' : 'Download Video'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title={isFa ? 'اشتراک‌گذاری' : 'Share'}
            >
              {copySuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {onDeleteMovie && (
              <button
                type="button"
                onClick={() => setIsConfirmingMovieDelete(true)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 font-bold flex items-center gap-1.5 transition cursor-pointer"
                title={isFa ? 'حذف کل اثر و آزادسازی حافظه سرور' : 'Delete entire title & free storage'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isFa ? 'حذف کل اثر از سرور' : 'Delete from Server'}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold transition cursor-pointer ms-auto"
          >
            {isFa ? 'بستن' : 'Close'}
          </button>
        </div>
      </div>

      {/* CONFIRMATION DIALOG: DELETE SEASON */}
      {seasonToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          dir={isRtl ? 'rtl' : 'ltr'}
          onClick={() => !isDeleting && setSeasonToDelete(null)}
        >
          <div
            className="w-full max-w-md bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isFa ? 'حذف فصل از سرور' : 'Delete Season from Server'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {seasonToDelete.title} ({formatNumber(seasonToDelete.episodes?.length || 0, language)} {isFa ? 'قسمت' : 'episodes'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setSeasonToDelete(null)}
                disabled={isDeleting}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 leading-relaxed space-y-1">
              <p className="font-bold text-rose-400">
                {isFa ? 'آیا از حذف این فصل اطمینان دارید؟' : 'Are you sure you want to delete this season?'}
              </p>
              <p className="text-slate-400">
                {isFa
                  ? 'تمام قسمت‌ها و فایل‌های ویدیویی این فصل به صورت دائمی از روی سرور پاک شده و حافظه آزاد می‌گردد.'
                  : 'All video files of this season will be permanently deleted from disk and storage.'}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSeasonToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer border border-slate-700"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteSeason}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isFa ? 'در حال حذف...' : 'Deleting...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isFa ? 'تأیید حذف فصل' : 'Confirm Delete'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG: DELETE EPISODE */}
      {episodeToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          dir={isRtl ? 'rtl' : 'ltr'}
          onClick={() => !isDeleting && setEpisodeToDelete(null)}
        >
          <div
            className="w-full max-w-md bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isFa ? 'حذف قسمت از سرور' : 'Delete Episode from Server'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {isFa ? `قسمت ${episodeToDelete.episodeNumber}: ` : `Episode ${episodeToDelete.episodeNumber}: `}
                    {episodeToDelete.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setEpisodeToDelete(null)}
                disabled={isDeleting}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 leading-relaxed space-y-1">
              <p className="font-bold text-rose-400">
                {isFa ? 'آیا از حذف این قسمت اطمینان دارید؟' : 'Are you sure you want to delete this episode?'}
              </p>
              <p className="text-slate-400">
                {isFa
                  ? 'فایل ویدیویی این قسمت از روی سرور پاک شده و فضای ذخیره‌سازی آزاد خواهد شد.'
                  : 'The video file for this episode will be permanently wiped from server disk.'}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEpisodeToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer border border-slate-700"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteEpisode}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isFa ? 'در حال حذف...' : 'Deleting...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isFa ? 'تأیید حذف قسمت' : 'Confirm Delete'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG: DELETE ENTIRE MOVIE */}
      {isConfirmingMovieDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          dir={isRtl ? 'rtl' : 'ltr'}
          onClick={() => !isDeleting && setIsConfirmingMovieDelete(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isFa ? 'حذف اثر و آزادسازی حافظه' : 'Delete Movie & Free Storage'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {movie.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setIsConfirmingMovieDelete(false)}
                disabled={isDeleting}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 leading-relaxed space-y-1">
              <p className="font-bold text-rose-400">
                {isFa ? 'آیا از حذف کامل این اثر اطمینان دارید؟' : 'Confirm complete title deletion?'}
              </p>
              <p className="text-slate-400">
                {isFa
                  ? 'تمامی فایل‌های ویدیویی، فصل‌ها و قسمت‌های این عنوان به طور کامل از روی هارد سرور پاک می‌شوند.'
                  : 'All video files, seasons, and episodes will be physically wiped from the server.'}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmingMovieDelete(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer border border-slate-700"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteMovie}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isFa ? 'در حال حذف...' : 'Deleting...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isFa ? 'حذف دائمی از سرور' : 'Permanently Delete'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST IN CINEMA PLAYER */}
      {playerToast && (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-70 bg-slate-900/95 border border-emerald-500/50 text-white px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in max-w-md w-[90%]"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-slate-100">{playerToast.message}</p>
            {playerToast.freedText && (
              <p className="text-[11px] text-emerald-400 font-medium">
                {isFa ? `فضای آزاد شده: ${playerToast.freedText}` : `Freed: ${playerToast.freedText}`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
