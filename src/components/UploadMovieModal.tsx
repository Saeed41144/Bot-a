import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Film,
  Tv,
  Sparkles,
  Upload,
  Plus,
  Coins,
  Link,
  Clock,
  User,
  Calendar,
  Layers,
  Star,
  CheckCircle2,
  Trash2,
  AlertCircle,
  AlertTriangle,
  FileVideo,
  Eye,
  Tag,
  FolderPlus,
  Folder,
  Play,
  Edit2,
  ChevronDown,
  Info,
  Archive,
  RefreshCw,
  HardDrive,
  Check,
  FolderTree
} from 'lucide-react';
import { ShopMovie, VideoPlaylist, VideoSeason, VideoEpisode, MediaType, Language } from '../types';
import { formatNumber } from '../utils/translations';
import { countTotalEpisodes, countTotalSeasons, getAllPlaylists } from '../utils/movieData';

interface UploadMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMovie?: ShopMovie | null;
  language: Language;
  playlists?: VideoPlaylist[];
  customPlaylists?: VideoPlaylist[];
  deletedPlaylistIds?: string[];
  existingMovies?: ShopMovie[];
  onSaveMovie: (movie: ShopMovie) => void;
  onCreatePlaylist?: (playlist: VideoPlaylist) => void;
  onDeleteMovie?: (movieId: string) => Promise<any> | void;
  onDeleteSeason?: (movieId: string, seasonId: string) => Promise<any> | void;
  onDeleteEpisode?: (movieId: string, episodeId: string) => Promise<any> | void;
  onRefreshMediaCatalog?: () => Promise<any> | void;
}

export const UploadMovieModal: React.FC<UploadMovieModalProps> = ({
  isOpen,
  onClose,
  targetMovie,
  language,
  playlists = [],
  customPlaylists = [],
  deletedPlaylistIds = [],
  existingMovies = [],
  onSaveMovie,
  onCreatePlaylist,
  onDeleteMovie,
  onDeleteSeason,
  onDeleteEpisode,
  onRefreshMediaCatalog,
}) => {
  const isFa = language === 'fa';
  const isAr = language === 'ar';
  const isRtl = isFa || isAr;

  // Active form section
  const [activeTab, setActiveTab] = useState<'info' | 'episodes' | 'media' | 'pricing' | 'bulkZip'>('info');

  // Media Type: movie | series | anime
  const [mediaType, setMediaType] = useState<MediaType>('movie');

  // Basic Info
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [genresText, setGenresText] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [motivationalTheme, setMotivationalTheme] = useState('');
  const [quality, setQuality] = useState<'4K Ultra HD' | '1080p Full HD' | '720p HD'>('1080p Full HD');

  // Playlist Assignment & State
  const [localCustomPlaylists, setLocalCustomPlaylists] = useState<VideoPlaylist[]>(customPlaylists || []);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const [isCreatingNewPlaylist, setIsCreatingNewPlaylist] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');

  // Keep localCustomPlaylists in sync with customPlaylists prop
  useEffect(() => {
    setLocalCustomPlaylists(customPlaylists || []);
  }, [customPlaylists]);

  // Compute all available playlists (defaults + custom playlists minus deleted ones)
  const availablePlaylists: VideoPlaylist[] = React.useMemo(() => {
    if (playlists && playlists.length > 0) {
      const deletedSet = new Set(deletedPlaylistIds);
      return playlists.filter((p) => !deletedSet.has(p.id));
    }
    return getAllPlaylists(language, localCustomPlaylists, deletedPlaylistIds);
  }, [playlists, localCustomPlaylists, deletedPlaylistIds, language]);

  // Pricing
  const [price, setPrice] = useState<number>(12);
  const [pricePerEpisode, setPricePerEpisode] = useState<number>(2);

  // Standalone Movie Video Source
  const [videoUrl, setVideoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverGradient, setCoverGradient] = useState('from-indigo-950 via-slate-900 to-slate-950');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [fileData, setFileData] = useState('');

  // Seasons & Episodes Manager (for Series & Anime)
  const [hasSeasons, setHasSeasons] = useState(false);
  const [seasons, setSeasons] = useState<VideoSeason[]>([]);
  const [activeSeasonIndex, setActiveSeasonIndex] = useState<number>(0);

  // New Season Inputs
  const [newSeasonTitle, setNewSeasonTitle] = useState('');

  // New Episode Inputs
  const [newEpTitle, setNewEpTitle] = useState('');
  const [newEpNumber, setNewEpNumber] = useState<number>(1);
  const [newEpDuration, setNewEpDuration] = useState('');
  const [newEpPrice, setNewEpPrice] = useState<number>(2);
  const [newEpQuality, setNewEpQuality] = useState<'4K Ultra HD' | '1080p Full HD' | '720p HD'>('1080p Full HD');
  const [newEpVideoUrl, setNewEpVideoUrl] = useState('');
  const [newEpFileName, setNewEpFileName] = useState('');
  const [newEpFileData, setNewEpFileData] = useState('');
  const [newEpSynopsis, setNewEpSynopsis] = useState('');

  // Bulk ZIP / Directory Scan State
  const [isScanningDisk, setIsScanningDisk] = useState(false);
  const [isUploadingZip, setIsUploadingZip] = useState(false);
  const [zipFolderName, setZipFolderName] = useState('');
  const [zipSelectedFileName, setZipSelectedFileName] = useState('');
  const [zipSuccessMessage, setZipSuccessMessage] = useState('');
  const zipInputRef = useRef<HTMLInputElement | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [isConfirmingMovieDelete, setIsConfirmingMovieDelete] = useState(false);
  const [isDeletingMovieProgress, setIsDeletingMovieProgress] = useState(false);

  const gradientOptions = [
    { label: isFa ? 'نیلی و ارغوانی' : 'Indigo & Purple', value: 'from-indigo-950 via-slate-900 to-slate-950' },
    { label: isFa ? 'آبی کبالت و کیهانی' : 'Blue Cosmic', value: 'from-blue-950 via-cyan-950 to-slate-950' },
    { label: isFa ? 'کهربایی و طلایی' : 'Amber Gold', value: 'from-amber-950 via-stone-900 to-black' },
    { label: isFa ? 'زمردی و یشمی' : 'Emerald Jade', value: 'from-emerald-950 via-teal-950 to-slate-950' },
    { label: isFa ? 'یاقوتی و زرشکی' : 'Ruby Crimson', value: 'from-rose-950 via-slate-900 to-slate-950' },
    { label: isFa ? 'زغالی و تاریک' : 'Dark Charcoal', value: 'from-slate-950 via-zinc-900 to-black' },
  ];

  // Quick genre tags
  const suggestedGenres = isFa
    ? ['انگیزشی', 'روانشناسی', 'علمی-تخیلی', 'درام', 'استراتژی', 'تمرکز', 'حماسی', 'اراده', 'بیوگرافی']
    : ['Motivation', 'Psychology', 'Sci-Fi', 'Drama', 'Strategy', 'Focus', 'Epic', 'Willpower', 'Biography'];

  useEffect(() => {
    if (targetMovie) {
      setMediaType(targetMovie.mediaType || 'movie');
      setTitle(targetMovie.title || '');
      setOriginalTitle(targetMovie.originalTitle || '');
      setDuration(targetMovie.duration || '');
      setGenresText(targetMovie.genres?.join(', ') || targetMovie.genre || '');
      setSynopsis(targetMovie.synopsis || '');
      setMotivationalTheme(targetMovie.motivationalTheme || '');
      setPrice(targetMovie.price ?? 12);
      setPricePerEpisode(targetMovie.pricePerEpisode ?? 2);
      setQuality((targetMovie.quality as any) || '1080p Full HD');
      setSelectedPlaylistId(targetMovie.playlistId || '');

      setVideoUrl(targetMovie.videoUrl || '');
      setCoverUrl(targetMovie.coverUrl || '');
      setCoverGradient(targetMovie.coverGradient || 'from-indigo-950 via-slate-900 to-slate-950');
      setFileName(targetMovie.fileName || '');
      setFileSize(targetMovie.fileSize || '');
      setFileData(targetMovie.fileData || '');

      const isEpisodic = targetMovie.hasSeasons || targetMovie.mediaType === 'series' || targetMovie.mediaType === 'anime';
      setHasSeasons(isEpisodic);
      if (targetMovie.seasons && targetMovie.seasons.length > 0) {
        setSeasons(targetMovie.seasons);
      } else if (isEpisodic) {
        setSeasons([
          {
            id: `season-init-${Date.now()}`,
            seasonNumber: 1,
            title: isFa ? 'فصل اول' : 'Season 1',
            episodes: targetMovie.standaloneEpisodes || [],
          },
        ]);
      } else {
        setSeasons([]);
      }
      setActiveSeasonIndex(0);
    } else {
      // Reset form
      setMediaType('movie');
      setTitle('');
      setOriginalTitle('');
      setDuration(isFa ? '۱ ساعت و ۴۵ دقیقه' : '1h 45m');
      setGenresText(isFa ? 'انگیزشی, روانشناسی, درام' : 'Motivation, Psychology, Drama');
      setSynopsis('');
      setMotivationalTheme(isFa ? 'اراده پولادین، استمرار روزانه و غلبه بر چالش‌ها' : 'Willpower, daily persistence and overcoming challenges');
      setPrice(12);
      setPricePerEpisode(2);
      setQuality('1080p Full HD');
      setSelectedPlaylistId('');
      setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
      setCoverUrl('');
      setCoverGradient('from-indigo-950 via-slate-900 to-slate-950');
      setFileName('');
      setFileSize('1.8 GB');
      setFileData('');
      setHasSeasons(false);
      setSeasons([]);
      setActiveSeasonIndex(0);
    }
    setErrorMsg('');
    setSuccessToast('');
    setIsCreatingNewPlaylist(false);
  }, [targetMovie, isOpen, isFa]);

  // When mediaType changes, auto adjust hasSeasons default
  const handleMediaTypeChange = (newType: MediaType) => {
    setMediaType(newType);
    if (newType === 'series' || newType === 'anime') {
      setHasSeasons(true);
      if (seasons.length === 0) {
        setSeasons([
          {
            id: `season-${Date.now()}`,
            seasonNumber: 1,
            title: isFa ? 'فصل اول' : 'Season 1',
            episodes: [],
          },
        ]);
      }
      if (!duration || duration.includes('ساعت') || duration.includes('hour')) {
        setDuration(isFa ? '۱ فصل' : '1 Season');
      }
    } else {
      setHasSeasons(false);
      if (duration.includes('فصل') || duration.includes('Season')) {
        setDuration(isFa ? '۱ ساعت و ۵۰ دقیقه' : '1h 50m');
      }
    }
  };

  if (!isOpen) return null;

  // File upload handler for standalone video
  const handleMainFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);

    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFileData(result);
      if (!videoUrl || videoUrl.includes('sample')) {
        setVideoUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Image cover upload handler
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // File upload for individual episode
  const handleEpisodeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewEpFileName(file.name);
    if (!newEpTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setNewEpTitle(cleanName);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setNewEpFileData(result);
      if (!newEpVideoUrl) {
        setNewEpVideoUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add Season
  const handleAddSeason = () => {
    const nextSeasonNum = seasons.length + 1;
    const sTitle = newSeasonTitle.trim() || (isFa ? `فصل ${nextSeasonNum}` : `Season ${nextSeasonNum}`);
    const newSeason: VideoSeason = {
      id: `season-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      seasonNumber: nextSeasonNum,
      title: sTitle,
      episodes: [],
    };
    setSeasons((prev) => [...prev, newSeason]);
    setActiveSeasonIndex(seasons.length);
    setNewSeasonTitle('');
    setSuccessToast(isFa ? `فصل «${sTitle}» اضافه شد.` : `Season "${sTitle}" added.`);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  // Remove Season
  const handleRemoveSeason = async (seasonIndex: number) => {
    const seasonToRemove = seasons[seasonIndex];
    if (seasonToRemove && targetMovie && onDeleteSeason) {
      const res: any = await onDeleteSeason(targetMovie.id, seasonToRemove.id);
      const freedMsg = res && typeof res === 'object' && res.formattedFreedBytes
        ? (isFa ? ` (${res.formattedFreedBytes} حافظه سرور آزاد شد)` : ` (${res.formattedFreedBytes} freed)`)
        : '';
      setSuccessToast(isFa ? `فصل «${seasonToRemove.title}» از سرور حذف شد${freedMsg}` : `Season deleted from server${freedMsg}`);
      setTimeout(() => setSuccessToast(''), 3500);
    }
    setSeasons((prev) => prev.filter((_, idx) => idx !== seasonIndex));
    if (activeSeasonIndex >= seasonIndex && activeSeasonIndex > 0) {
      setActiveSeasonIndex(activeSeasonIndex - 1);
    }
  };

  // Add Episode to Active Season
  const handleAddEpisodeToSeason = (e: React.FormEvent) => {
    e.preventDefault();
    if (seasons.length === 0) {
      handleAddSeason();
    }

    const currentSeason = seasons[activeSeasonIndex] || seasons[0];
    if (!currentSeason) return;

    const epNum = newEpNumber || (currentSeason.episodes.length + 1);
    const epTitleText = newEpTitle.trim() || (isFa ? `قسمت ${epNum}` : `Episode ${epNum}`);

    const episodeObj: VideoEpisode = {
      id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      episodeNumber: epNum,
      title: epTitleText,
      duration: newEpDuration.trim() || (isFa ? '۲۴ دقیقه' : '24 min'),
      quality: newEpQuality,
      price: Math.max(0, Number(newEpPrice) || 0),
      videoUrl: newEpVideoUrl.trim() || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      fileName: newEpFileName.trim() || undefined,
      fileData: newEpFileData || undefined,
      synopsis: newEpSynopsis.trim() || undefined,
      uploadedAt: new Date().toISOString().split('T')[0],
    };

    setSeasons((prev) =>
      prev.map((season, idx) => {
        if (idx !== activeSeasonIndex) return season;
        return {
          ...season,
          episodes: [...season.episodes, episodeObj],
        };
      })
    );

    // Reset episode inputs for next addition
    setNewEpTitle('');
    setNewEpNumber(epNum + 1);
    setNewEpDuration(isFa ? '۲۴ دقیقه' : '24 min');
    setNewEpVideoUrl('');
    setNewEpFileName('');
    setNewEpFileData('');
    setNewEpSynopsis('');

    setSuccessToast(isFa ? `قسمت ${epNum} به ${currentSeason.title} اضافه شد.` : `Episode ${epNum} added to ${currentSeason.title}.`);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  // Delete Episode
  const handleDeleteEpisode = async (seasonIndex: number, episodeId: string) => {
    if (targetMovie && onDeleteEpisode) {
      const res: any = await onDeleteEpisode(targetMovie.id, episodeId);
      const freedMsg = res && typeof res === 'object' && res.formattedFreedBytes
        ? (isFa ? ` (${res.formattedFreedBytes} حافظه آزاد شد)` : ` (${res.formattedFreedBytes} freed)`)
        : '';
      setSuccessToast(isFa ? `قسمت از سرور حذف شد${freedMsg}` : `Episode deleted from server${freedMsg}`);
      setTimeout(() => setSuccessToast(''), 3500);
    }
    setSeasons((prev) =>
      prev.map((season, idx) => {
        if (idx !== seasonIndex) return season;
        return {
          ...season,
          episodes: season.episodes.filter((ep) => ep.id !== episodeId),
        };
      })
    );
  };

  // Add genre tag from suggestion
  const handleToggleGenreTag = (genreTag: string) => {
    const currentList = genresText
      .split(/[,،]+/)
      .map((g) => g.trim())
      .filter(Boolean);

    if (currentList.includes(genreTag)) {
      setGenresText(currentList.filter((g) => g !== genreTag).join(', '));
    } else {
      setGenresText([...currentList, genreTag].join(', '));
    }
  };

  // Create Playlist on the fly
  const handleCreateInlinePlaylist = () => {
    if (!newPlaylistTitle.trim()) return;

    const newPlaylist: VideoPlaylist = {
      id: `playlist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: newPlaylistTitle.trim(),
      description: newPlaylistDesc.trim() || (isFa ? 'مجموعه اختصاصی ایجادشده توسط کاربر' : 'Custom user playlist'),
      mediaType,
      createdAt: new Date().toISOString().split('T')[0],
      coverGradient,
      tags: [mediaType],
      itemIds: [],
    };

    setLocalCustomPlaylists((prev) => [newPlaylist, ...prev]);

    if (onCreatePlaylist) {
      onCreatePlaylist(newPlaylist);
    }
    setSelectedPlaylistId(newPlaylist.id);
    setIsCreatingNewPlaylist(false);
    setNewPlaylistTitle('');
    setNewPlaylistDesc('');
    setSuccessToast(isFa ? `پلی‌لیست «${newPlaylist.title}» ساخته و انتخاب شد.` : `Playlist "${newPlaylist.title}" created & selected.`);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  // Form Submission
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg(isFa ? 'لطفاً عنوان فیلم یا سریال را وارد کنید.' : 'Please enter the title.');
      setActiveTab('info');
      return;
    }

    const parsedGenres = genresText
      .split(/[,،]+/)
      .map((g) => g.trim())
      .filter(Boolean);

    // Selected playlist object from all available playlists
    const matchedPlaylist = availablePlaylists.find((p) => p.id === selectedPlaylistId);

    // Compute duration summary and total price if episodic
    let computedDuration = duration.trim();
    let computedPrice = Math.max(0, Number(price) || 0);

    if (hasSeasons && seasons.length > 0) {
      const totalEp = seasons.reduce((acc, s) => acc + s.episodes.length, 0);
      computedDuration = isFa
        ? `${seasons.length} فصل • ${totalEp} قسمت`
        : `${seasons.length} Seasons • ${totalEp} Episodes`;

      // Full unlock price is automatically the exact sum of all episode prices
      computedPrice = seasons.reduce((acc, s) => {
        return (
          acc +
          (s.episodes || []).reduce((epAcc, ep) => {
            const epP = ep.price !== undefined ? Math.max(0, Number(ep.price)) : Math.max(0, Number(pricePerEpisode) || 2);
            return epAcc + epP;
          }, 0)
        );
      }, 0);
    }

    const movieObj: ShopMovie = {
      id: targetMovie?.id || `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      mediaType,
      title: title.trim(),
      originalTitle: originalTitle.trim() || undefined,
      duration: computedDuration || (isFa ? '۱ ساعت و ۵۰ دقیقه' : '110 min'),
      genre: parsedGenres.join(' / ') || (isFa ? 'انگیزشی / سینما' : 'Motivation / Cinema'),
      genres: parsedGenres.length > 0 ? parsedGenres : [isFa ? 'انگیزشی' : 'Motivation'],
      synopsis: synopsis.trim() || (isFa ? 'یک اثر الهام‌بخش درباره قدرت اراده، غلبه بر موانع و توسعه فردی.' : 'An inspiring piece on willpower and overcoming obstacles.'),
      motivationalTheme: motivationalTheme.trim() || undefined,
      price: computedPrice,
      pricePerEpisode: hasSeasons ? Math.max(0, Number(pricePerEpisode) || 2) : undefined,
      quality,
      playlistId: selectedPlaylistId || undefined,
      playlistTitle: matchedPlaylist?.title || undefined,
      hasSeasons,
      seasons: hasSeasons ? seasons : undefined,
      videoUrl: videoUrl.trim() || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      coverUrl: coverUrl.trim() || undefined,
      coverGradient,
      fileName: fileName.trim() || undefined,
      fileSize: fileSize.trim() || (hasSeasons ? `${seasons.reduce((acc, s) => acc + s.episodes.length, 0) * 250} MB` : '1.8 GB'),
      fileData: fileData || undefined,
      tags: parsedGenres,
      uploadedAt: targetMovie?.uploadedAt || new Date().toISOString().split('T')[0],
      isDefault: targetMovie?.isDefault || false,
    };

    onSaveMovie(movieObj);
    onClose();
  };

  const currentSeason = seasons[activeSeasonIndex];

  return (
    <div
      id="upload-movie-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-lg shadow-rose-500/10 shrink-0">
              {mediaType === 'series' ? (
                <Tv className="w-5 h-5" />
              ) : mediaType === 'anime' ? (
                <Sparkles className="w-5 h-5 text-rose-400" />
              ) : (
                <Film className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {targetMovie
                  ? (isFa ? 'ویرایش اثر چندرسانه‌ای' : 'Edit Media Item')
                  : (isFa ? 'بارگذاری ویدیو، سریال، انیمه یا فیلم' : 'Upload Video, Series, Anime or Movie')}
              </span>
              <h2 className="text-sm sm:text-base font-black text-white">
                {title || (isFa ? 'افزودن اثر جدید به فروشگاه' : 'Add New Media to Store')}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Media Type Switcher & Navigation Tabs */}
        <div className="px-4 pt-3 pb-2 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
          {/* Media Type Selector */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => handleMediaTypeChange('movie')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                mediaType === 'movie'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>{isFa ? 'فیلم سینمایی' : 'Movie'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleMediaTypeChange('series')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                mediaType === 'series'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>{isFa ? 'سریال' : 'Series'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleMediaTypeChange('anime')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                mediaType === 'anime'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isFa ? 'انیمه' : 'Anime'}</span>
            </button>
          </div>

          {/* Section Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'info'
                  ? 'bg-slate-800 text-white border border-slate-700 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>{isFa ? 'مشخصات' : 'Info'}</span>
            </button>

            {(mediaType === 'series' || mediaType === 'anime' || hasSeasons) && (
              <button
                type="button"
                onClick={() => setActiveTab('episodes')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                  activeTab === 'episodes'
                    ? 'bg-slate-800 text-rose-300 border border-rose-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isFa ? 'فصل‌ها و قسمت‌ها' : 'Seasons & Episodes'}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-[10px] text-rose-300">
                  {seasons.reduce((acc, s) => acc + s.episodes.length, 0)}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('media')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'media'
                  ? 'bg-slate-800 text-white border border-slate-700 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isFa ? 'ویدیو و کاور' : 'Media & Cover'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'pricing'
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{isFa ? 'قیمت‌گذاری' : 'Pricing'}</span>
            </button>
          </div>
        </div>

        {/* Notifications & Alerts */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successToast && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 overflow-y-auto flex-1 custom-scrollbar space-y-4 text-xs">
          {/* TAB 1: BASIC INFO & PLAYLIST */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Title & Original Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    {isFa ? 'عنوان اثر *' : 'Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      mediaType === 'series'
                        ? (isFa ? 'مثال: سریال برکینگ بد (Breaking Bad)' : 'e.g. Breaking Bad')
                        : mediaType === 'anime'
                        ? (isFa ? 'مثال: انیمه حمله به تایتان' : 'e.g. Attack on Titan')
                        : (isFa ? 'مثال: میان‌ستاره‌ای (Interstellar)' : 'e.g. Interstellar')
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-rose-500 text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    {isFa ? 'عنوان اصلی / انگلیسی' : 'Original Title'}
                  </label>
                  <input
                    type="text"
                    value={originalTitle}
                    onChange={(e) => setOriginalTitle(e.target.value)}
                    placeholder="e.g. Interstellar / Shingeki no Kyojin"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-rose-500 text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Playlist Selection & Inline Creation */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-amber-400" />
                    <span>{isFa ? 'پلی‌لیست و مجموعه اختصاصی:' : 'Target Playlist / Collection:'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewPlaylist(!isCreatingNewPlaylist)}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>{isFa ? '+ ساخت پلی‌لیست جدید' : '+ New Playlist'}</span>
                  </button>
                </div>

                {!isCreatingNewPlaylist ? (
                  <div className="space-y-2.5">
                    {/* Dropdown Selector */}
                    <div className="relative">
                      <select
                        value={selectedPlaylistId}
                        onChange={(e) => setSelectedPlaylistId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-amber-500 outline-none transition cursor-pointer text-xs"
                      >
                        <option value="">{isFa ? '— بدون پلی‌لیست (اثر مستقل) —' : '— Standalone Item (No Playlist) —'}</option>
                        {availablePlaylists.map((pl) => {
                          const typeLabel = pl.mediaType === 'series'
                            ? (isFa ? 'سریال' : 'Series')
                            : pl.mediaType === 'anime'
                            ? (isFa ? 'انیمه' : 'Anime')
                            : (isFa ? 'فیلم' : 'Movie');
                          const isCurated = pl.isDefault ? (isFa ? 'پیش‌فرض' : 'Curated') : (isFa ? 'اختصاصی' : 'Custom');
                          return (
                            <option key={pl.id} value={pl.id}>
                              {pl.title} ({typeLabel} • {isCurated})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Quick Selection Pills (if available) */}
                    {availablePlaylists.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[10px] text-slate-400 font-medium">
                          {isFa ? 'انتخاب سریع پلی‌لیست‌های موجود:' : 'Quick Select Existing Playlists:'}
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-1 rounded-xl bg-slate-950/60 border border-slate-900">
                          {/* Standalone Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedPlaylistId('')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                              !selectedPlaylistId
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            <Film className="w-3 h-3" />
                            <span>{isFa ? 'اثر مستقل' : 'Standalone'}</span>
                          </button>

                          {availablePlaylists.map((pl) => {
                            const isSelected = selectedPlaylistId === pl.id;
                            return (
                              <button
                                key={pl.id}
                                type="button"
                                onClick={() => setSelectedPlaylistId(isSelected ? '' : pl.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm ring-1 ring-amber-500/30'
                                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                                }`}
                              >
                                <Folder className="w-3 h-3 text-amber-400 shrink-0" />
                                <span className="truncate max-w-[180px]">{pl.title}</span>
                                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                                  {pl.mediaType === 'series' ? (isFa ? 'سریال' : 'TV') : pl.mediaType === 'anime' ? (isFa ? 'انیمه' : 'Anime') : (isFa ? 'فیلم' : 'Film')}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Selected Playlist Active Badge */}
                    {selectedPlaylistId && (
                      <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 flex items-center justify-between gap-2 animate-in fade-in">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                            <Folder className="w-3.5 h-3.5" />
                          </div>
                          <div className="truncate">
                            <div className="text-[11px] font-bold text-white truncate">
                              {availablePlaylists.find((p) => p.id === selectedPlaylistId)?.title || selectedPlaylistId}
                            </div>
                            <div className="text-[10px] text-amber-300/80 truncate">
                              {availablePlaylists.find((p) => p.id === selectedPlaylistId)?.description || (isFa ? 'پلی‌لیست انتخاب‌شده برای این اثر' : 'Selected playlist for this item')}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPlaylistId('')}
                          className="p-1 rounded-lg text-amber-400 hover:text-white hover:bg-amber-500/20 transition cursor-pointer shrink-0"
                          title={isFa ? 'حذف از پلی‌لیست' : 'Remove from playlist'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between text-amber-300 font-bold">
                      <span>{isFa ? 'ایجاد پلی‌لیست جدید' : 'Create New Playlist'}</span>
                      <button
                        type="button"
                        onClick={() => setIsCreatingNewPlaylist(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newPlaylistTitle}
                      onChange={(e) => setNewPlaylistTitle(e.target.value)}
                      placeholder={isFa ? 'نام پلی‌لیست (مثال: کالکشن انیمه‌های فلسفی)' : 'Playlist title'}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none"
                    />
                    <input
                      type="text"
                      value={newPlaylistDesc}
                      onChange={(e) => setNewPlaylistDesc(e.target.value)}
                      placeholder={isFa ? 'توضیحات کوتاه درباره این مجموعه' : 'Short description'}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCreateInlinePlaylist}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition cursor-pointer"
                      >
                        {isFa ? 'تایید و افزودن به این اثر' : 'Create & Select'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Genre Tags & Suggestions */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  {isFa ? 'ژانرها و برچسب‌ها (با کاما جدا کنید)' : 'Genres & Tags'}
                </label>
                <input
                  type="text"
                  value={genresText}
                  onChange={(e) => setGenresText(e.target.value)}
                  placeholder={isFa ? 'انگیزشی, علمی-تخیلی, روانشناسی, درام' : 'Motivation, Sci-Fi, Psychology'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-rose-500 text-white placeholder-slate-500 outline-none mb-2"
                />
                {/* Suggested pills */}
                <div className="flex flex-wrap gap-1.5">
                  {suggestedGenres.map((g) => {
                    const isSelected = genresText.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleToggleGenreTag(g)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        + {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Synopsis */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  {isFa ? 'خلاصه داستان / موضوع اثر' : 'Synopsis / Overview'}
                </label>
                <textarea
                  rows={3}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder={isFa ? 'شرح داستان، فضای اثر و نکات برجسته...' : 'Plot summary and highlights...'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-rose-500 text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>

              {/* Motivational Theme */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isFa ? 'پیام انگیزشی و توسعه فردی (تم اراده و عادات):' : 'Motivational & Willpower Theme:'}</span>
                </label>
                <input
                  type="text"
                  value={motivationalTheme}
                  onChange={(e) => setMotivationalTheme(e.target.value)}
                  placeholder={isFa ? 'مثال: استقامت در برابر ناممکن‌ها، تمرکز عمیق و انضباط پولادین' : 'e.g. Resilience, deep work and cognitive focus'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-rose-500 text-white placeholder-slate-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: SEASONS & EPISODES MANAGER */}
          {activeTab === 'episodes' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Season Tabs Header */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white text-xs">
                      {isFa ? 'مدیریت فصل‌ها:' : 'Manage Seasons:'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-bold">
                    {formatNumber(seasons.length, language)} {isFa ? 'فصل' : 'Seasons'} •{' '}
                    {formatNumber(seasons.reduce((acc, s) => acc + s.episodes.length, 0), language)} {isFa ? 'قسمت' : 'Episodes'}
                  </span>
                </div>

                {/* Seasons pill selectors */}
                <div className="flex flex-wrap items-center gap-2">
                  {seasons.map((season, sIdx) => (
                    <div
                      key={season.id || sIdx}
                      className={`flex items-center rounded-xl border transition ${
                        activeSeasonIndex === sIdx
                          ? 'bg-purple-600/20 border-purple-500/50 text-white font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveSeasonIndex(sIdx)}
                        className="px-3 py-1.5 cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{season.title || `فصل ${sIdx + 1}`}</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-purple-500/30 text-[10px] text-purple-300">
                          {season.episodes?.length || 0}
                        </span>
                      </button>

                      {seasons.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSeason(sIdx)}
                          className="pe-2 ps-1 py-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                          title={isFa ? 'حذف این فصل' : 'Delete Season'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add Season Button */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newSeasonTitle}
                      onChange={(e) => setNewSeasonTitle(e.target.value)}
                      placeholder={isFa ? `نام فصل ${seasons.length + 1}` : `Season ${seasons.length + 1}`}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs w-28 text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddSeason}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isFa ? 'افزودن فصل' : 'Add Season'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Current Season's Episodes List */}
              {currentSeason && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-bold text-white text-xs flex items-center gap-2">
                      <Play className="w-3.5 h-3.5 text-rose-400" />
                      <span>{isFa ? `قسمت‌های ${currentSeason.title}:` : `Episodes of ${currentSeason.title}:`}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {currentSeason.episodes.length === 0
                        ? (isFa ? 'هنوز قسمتی اضافه نشده' : 'No episodes yet')
                        : `${currentSeason.episodes.length} ${isFa ? 'قسمت' : 'episodes'}`}
                    </span>
                  </div>

                  {/* Episodes Table / List */}
                  {currentSeason.episodes.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {currentSeason.episodes.map((ep) => (
                        <div
                          key={ep.id}
                          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 hover:border-slate-700 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-black text-[11px] flex items-center justify-center shrink-0">
                              {ep.episodeNumber}
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-bold text-white text-xs truncate">{ep.title}</h4>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span>{ep.duration || '۲۴ دقیقه'}</span>
                                <span>•</span>
                                <span className="text-slate-300">{ep.quality || '1080p'}</span>
                                <span>•</span>
                                <span className={ep.price === 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                                  {ep.price === 0 ? (isFa ? 'رایگان (پیش‌نمایش)' : 'Free') : `${ep.price} ${isFa ? 'سکه' : 'coins'}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteEpisode(activeSeasonIndex, ep.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer shrink-0"
                            title={isFa ? 'حذف قسمت' : 'Delete episode'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Episode Subform */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-purple-500/20 space-y-2.5">
                    <h5 className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isFa ? `افزودن قسمت جدید به ${currentSeason.title}` : `Add New Episode to ${currentSeason.title}`}</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-400 text-[11px] font-bold mb-1">
                          {isFa ? 'شماره قسمت' : 'Ep #'}
                        </label>
                        <input
                          type="number"
                          value={newEpNumber}
                          onChange={(e) => setNewEpNumber(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-slate-400 text-[11px] font-bold mb-1">
                          {isFa ? 'عنوان قسمت' : 'Episode Title'}
                        </label>
                        <input
                          type="text"
                          value={newEpTitle}
                          onChange={(e) => setNewEpTitle(e.target.value)}
                          placeholder={isFa ? `مثال: قسمت ${newEpNumber}: آغاز نبرد` : `e.g. Ep ${newEpNumber}: The Beginning`}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-400 text-[11px] font-bold mb-1">
                          {isFa ? 'مدت زمان' : 'Duration'}
                        </label>
                        <input
                          type="text"
                          value={newEpDuration}
                          onChange={(e) => setNewEpDuration(e.target.value)}
                          placeholder={isFa ? '۲۴ دقیقه / 45 min' : '24 min'}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[11px] font-bold mb-1">
                          {isFa ? 'کیفیت' : 'Quality'}
                        </label>
                        <select
                          value={newEpQuality}
                          onChange={(e) => setNewEpQuality(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none"
                        >
                          <option value="4K Ultra HD">4K Ultra HD</option>
                          <option value="1080p Full HD">1080p Full HD</option>
                          <option value="720p HD">720p HD</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[11px] font-bold mb-1 flex items-center gap-1">
                          <Coins className="w-3 h-3 text-amber-400" />
                          <span>{isFa ? 'قیمت قسمت (سکه)' : 'Coin Price'}</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={newEpPrice}
                          onChange={(e) => setNewEpPrice(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 font-bold text-xs outline-none"
                        />
                      </div>
                    </div>

                    {/* Episode Video Source */}
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-slate-400 text-[11px] font-bold">
                        {isFa ? 'آدرس ویدیو یا بارگذاری فایل قسمت:' : 'Video Link or Upload:'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newEpVideoUrl}
                          onChange={(e) => setNewEpVideoUrl(e.target.value)}
                          placeholder="https://example.com/episode.mp4"
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none"
                        />
                        <label className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isFa ? 'فایل' : 'File'}</span>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleEpisodeFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {newEpFileName && (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {newEpFileName}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddEpisodeToSeason}
                      className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isFa ? 'ثبت و افزودن این قسمت به فصل' : 'Add Episode to Season'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VIDEO SOURCE & POSTER COVER */}
          {activeTab === 'media' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Standalone Movie Video Source (or Series Main Trailer) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="block text-slate-300 font-bold text-xs flex items-center gap-1.5">
                  <FileVideo className="w-4 h-4 text-rose-400" />
                  <span>
                    {mediaType === 'movie'
                      ? (isFa ? 'منبع ویدیوی فیلم اصلی (آپلود مستقیم یا لینک):' : 'Main Movie Video Source:')
                      : (isFa ? 'ویدیوی پیش‌نمایش / تریلر سریال:' : 'Series Trailer / Preview Video:')}
                  </span>
                </label>

                {/* Upload local file */}
                <div className="border-2 border-dashed border-slate-800 hover:border-rose-500/50 rounded-2xl p-4 text-center bg-slate-900/50 transition">
                  <input
                    type="file"
                    id="main-movie-file-input"
                    accept="video/mp4,video/webm,video/ogg,video/mkv,.mp4,.webm,.mkv"
                    onChange={handleMainFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="main-movie-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs">
                        {fileName
                          ? (isFa ? `فایل انتخاب شده: ${fileName} (${fileSize})` : `Selected: ${fileName} (${fileSize})`)
                          : (isFa ? 'برای بارگذاری فایل ویدیو کلیک کنید یا آن را اینجا رها کنید' : 'Click or drop video file here')}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isFa ? 'پشتیبانی از فرمت‌های MP4، WebM، MKV' : 'Supports MP4, WebM, MKV'}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Or Direct Video URL */}
                <div className="space-y-1.5">
                  <label className="block text-slate-400 font-bold text-[11px]">
                    {isFa ? 'یا آدرس مستقیم ویدیوی آنلاین (Stream / Direct MP4 URL):' : 'Or Direct Online Video URL:'}
                  </label>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-rose-500 text-white placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              {/* Poster Cover / Image */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="block text-slate-300 font-bold text-xs">
                  {isFa ? 'پوستر و تصویر کاور:' : 'Cover Poster & Background:'}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold text-[11px] mb-1">
                      {isFa ? 'آدرس اینترنتی تصویر پوستر (Poster URL):' : 'Poster Image URL:'}
                    </label>
                    <input
                      type="text"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-rose-500 text-white placeholder-slate-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold text-[11px] mb-1">
                      {isFa ? 'یا آپلود تصویر از سیستم:' : 'Or Upload Cover File:'}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Gradient themes presets */}
                <div>
                  <label className="block text-slate-400 font-bold text-[11px] mb-1.5">
                    {isFa ? 'تم رنگی گرادیانت پیش‌فرض:' : 'Gradient Theme:'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {gradientOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCoverGradient(opt.value)}
                        className={`p-2.5 rounded-xl border text-start flex items-center gap-2 transition cursor-pointer ${
                          coverGradient === opt.value
                            ? 'border-rose-500 bg-rose-500/10 text-white font-bold'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-lg bg-gradient-to-br ${opt.value} shrink-0 border border-white/20`} />
                        <span className="text-[11px] truncate">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRICING & REWARDS */}
          {activeTab === 'pricing' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <Coins className="w-5 h-5" />
                  <span>{isFa ? 'تنظیم قیمت‌گذاری و سکه‌های پاداش' : 'Pricing & Coins Configuration'}</span>
                </div>

                {mediaType === 'series' || mediaType === 'anime' || hasSeasons ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Per-Episode Default Price */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <label className="block text-slate-200 font-bold text-xs">
                          {isFa ? 'قیمت پیش‌فرض هر قسمت (سکه)' : 'Default Per-Episode Price (Coins)'}
                        </label>
                        <p className="text-[11px] text-slate-400">
                          {isFa
                            ? 'قیمت بازگشایی تک‌قسمت‌ها به صورت پیش‌فرض (قابل تنظیم برای هر قسمت در تب قسمت‌ها).'
                            : 'Default price for unlocking individual episodes.'}
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={pricePerEpisode}
                            onChange={(e) => setPricePerEpisode(Number(e.target.value))}
                            className="w-28 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-blue-400 font-bold text-sm outline-none"
                          />
                          <span className="text-xs font-bold text-blue-400">{isFa ? 'سکه به ازای هر قسمت' : 'Coins / ep'}</span>
                        </div>
                      </div>

                      {/* Auto-Calculated Full Playlist Price Summary */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 flex flex-col justify-between">
                        <div>
                          <span className="block text-slate-200 font-bold text-xs">
                            {isFa ? 'قیمت بازگشایی کل پلی‌لیست' : 'Full Playlist Unlock Price'}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {isFa
                              ? 'قیمت کل پلی‌لیست به صورت خودکار از مجموع قیمت تمام قسمت‌های ثبت‌شده محاسبه می‌شود.'
                              : 'Automatically calculated as the exact sum of all registered episode prices.'}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            {isFa
                              ? `${formatNumber(seasons.reduce((acc, s) => acc + s.episodes.length, 0), language)} قسمت ثبت‌شده`
                              : `${seasons.reduce((acc, s) => acc + s.episodes.length, 0)} episodes`}
                          </span>
                          <span className="text-sm font-bold text-blue-400 flex items-center gap-1">
                            <Coins className="w-4 h-4" />
                            <span>
                              {formatNumber(
                                seasons.reduce((acc, s) => {
                                  return (
                                    acc +
                                    (s.episodes || []).reduce((epAcc, ep) => {
                                      const epP = ep.price !== undefined ? Math.max(0, Number(ep.price)) : Math.max(0, Number(pricePerEpisode) || 2);
                                      return epAcc + epP;
                                    }, 0)
                                  );
                                }, 0),
                                language
                              )}{' '}
                              {isFa ? 'سکه (مجموع کل)' : 'Coins (Total)'}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standalone Movie Single Price */
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 max-w-md">
                    <label className="block text-slate-200 font-bold text-xs">
                      {isFa ? 'قیمت تماشای فیلم (سکه)' : 'Movie Watch Price (Coins)'}
                    </label>
                    <p className="text-[11px] text-slate-400">
                      {isFa
                        ? 'تعداد سکه‌هایی که کاربر برای بازگشایی و تماشای این فیلم پرداخت می‌کند (۰ برای رایگان).'
                        : 'Coins required to unlock and watch this movie.'}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-28 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-blue-400 font-bold text-sm outline-none"
                      />
                      <span className="text-xs font-bold text-blue-400">{isFa ? 'سکه پاداش' : 'Coins'}</span>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-blue-400" />
                  <span>
                    {isFa
                      ? 'نکته: کاربران با انجام هر عادت روزانه ۱۰ سکه پاداش می‌گیرند و می‌توانند از سکه‌های خود برای تماشای قسمت‌ها یا کل اثر استفاده کنند.'
                      : 'Tip: Users earn 10 reward coins for each habit check-in to unlock video episodes.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>

              {targetMovie && onDeleteMovie && (
                <button
                  id="delete-movie-from-upload-modal-btn"
                  type="button"
                  onClick={() => setIsConfirmingMovieDelete(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-300 hover:text-rose-100 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title={isFa ? 'حذف دائمی از روی سرور و آزادسازی حافظه' : 'Delete and wipe from server'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isFa ? 'حذف این اثر از سرور' : 'Delete from Server'}</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs shadow-lg shadow-rose-600/20 flex items-center gap-2 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {targetMovie
                  ? (isFa ? 'ذخیره تغییرات' : 'Save Changes')
                  : (isFa ? 'ثبت و انتشار اثر در فروشگاه' : 'Publish to Store')}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal for UploadMovieModal */}
      {isConfirmingMovieDelete && targetMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div
            dir={isRtl ? 'rtl' : 'ltr'}
            className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/60 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="font-black text-white text-base">
                  {isFa ? 'حذف اثر و پاک‌سازی فایل‌ها' : 'Delete Movie & Wipe Files'}
                </h4>
                <p className="text-xs text-rose-300/80">
                  {isFa ? 'این عملیات غیرقابل بازگشت است' : 'This action cannot be undone'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p className="font-bold text-white">«{targetMovie.title}»</p>
              <p className="text-slate-400 leading-relaxed">
                {isFa
                  ? 'با تایید این درخواست، این اثر از فهرست فروشگاه حذف شده و کلیه فایل‌های ویدیویی ذخیره‌شده آن از روی حافظه سرور به‌طور کامل پاک‌سازی خواهند شد.'
                  : 'Confirming this will remove the movie from the store and permanently wipe all its uploaded video files from the server.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingMovieProgress}
                onClick={() => setIsConfirmingMovieDelete(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeletingMovieProgress}
                onClick={async () => {
                  if (onDeleteMovie && targetMovie) {
                    setIsDeletingMovieProgress(true);
                    try {
                      await onDeleteMovie(targetMovie.id);
                      setIsConfirmingMovieDelete(false);
                      onClose();
                    } finally {
                      setIsDeletingMovieProgress(false);
                    }
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingMovieProgress ? (isFa ? 'در حال حذف...' : 'Deleting...') : (isFa ? 'بله، حذف و پاک‌سازی شود' : 'Yes, Delete & Wipe')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
