import { ShopMovie, VideoPlaylist, VideoSeason, VideoEpisode, Language, UserRewardWallet, MediaType } from '../types';
import { safeStorage } from './safeStorage';

export const MOVIES_STORAGE_KEY = 'lally_custom_movies_v1';
export const PLAYLISTS_STORAGE_KEY = 'lally_custom_playlists_v1';
export const DELETED_MOVIES_STORAGE_KEY = 'lally_deleted_movies_v1';
export const DELETED_PLAYLISTS_STORAGE_KEY = 'lally_deleted_playlists_v1';

export const getDeletedMovieIds = (): string[] => {
  try {
    const saved = safeStorage.getItem(DELETED_MOVIES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse deleted movie IDs:', e);
  }
  return [];
};

export const saveDeletedMovieIds = (ids: string[]) => {
  try {
    safeStorage.setItem(DELETED_MOVIES_STORAGE_KEY, JSON.stringify(ids));
  } catch (e) {
    console.warn('Failed to save deleted movie IDs:', e);
  }
};

export const getDeletedPlaylistIds = (): string[] => {
  try {
    const saved = safeStorage.getItem(DELETED_PLAYLISTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse deleted playlist IDs:', e);
  }
  return [];
};

export const saveDeletedPlaylistIds = (ids: string[]) => {
  try {
    safeStorage.setItem(DELETED_PLAYLISTS_STORAGE_KEY, JSON.stringify(ids));
  } catch (e) {
    console.warn('Failed to save deleted playlist IDs:', e);
  }
};

// Default Curated Playlists / Collections (Empty by default)
export const getDefaultPlaylists = (_language: Language): VideoPlaylist[] => {
  return [];
};

// Default high-quality media: Movies (فیلم سینمایی), Series (سریال), and Anime (انیمه)
export const getDefaultMovies = (_language: Language): ShopMovie[] => {
  return [];
  /* Removed default movies and series */
  if (false) {
    return [
      // --- 1. FEATURE MOVIES (فیلم‌های سینمایی) ---
      {
        id: 'movie-interstellar',
        mediaType: 'movie',
        title: 'میان‌ستاره‌ای (Interstellar)',
        originalTitle: 'Interstellar',
        director: 'کریستوفر نولان',
        year: 2014,
        duration: '۲ ساعت و ۴۹ دقیقه',
        genre: 'علمی-تخیلی / انگیزشی / فلسفی',
        genres: ['علمی-تخیلی', 'انگیزشی', 'فلسفی', 'درام'],
        synopsis: 'در آینده‌ای که زمین با قحطی روبروست، گروهی از فضانوردان از طریق یک کرم‌چاله به جستجوی خانه‌ای تازه برای بشریت می‌روند. این اثر کاوشی عمیق در استقامت، عشق فراتر از زمان و پایداری در برابر ناممکن‌هاست.',
        price: 15,
        rating: 4.9,
        imdbRating: '8.7',
        coverGradient: 'from-blue-950 via-indigo-900 to-slate-950',
        quality: '4K Ultra HD',
        motivationalTheme: 'اراده بی‌پایان، امید در دل تاریکی مطلق، فداکاری و استمرار در ناممکن‌ترین شرایط',
        tags: ['علمی-تخیلی', 'فضا', 'امید', 'کریستوفر نولان', 'موسیقی هانس زیمر'],
        uploadedAt: '2026-08-27',
        isDefault: true,
        playlistId: 'playlist-nolan-masterpieces',
        playlistTitle: 'شاهکارهای فلسفی کریستوفر نولان',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        trailerUrl: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
        fileSize: '4.2 GB',
      },
      {
        id: 'movie-inception',
        mediaType: 'movie',
        title: 'تلقین (Inception)',
        originalTitle: 'Inception',
        director: 'کریستوفر نولان',
        year: 2010,
        duration: '۲ ساعت و ۲۸ دقیقه',
        genre: 'اکشن / معمایی / کنترل ذهن و ناخودآگاه',
        genres: ['علمی-تخیلی', 'روانشناسی', 'ناخودآگاه', 'معمایی'],
        synopsis: 'دام کاب یک دزد حرفه‌ای است که با نفوذ به ضمیر ناخودآگاه افراد در حین خواب، اسرار را می‌دزدد. او این بار مامور کاشتن یک ایده عمیق در ذهن سوژه می‌شود؛ فرآیندی مانند بازسازی مدارهای عصبی.',
        price: 14,
        rating: 4.9,
        imdbRating: '8.8',
        coverGradient: 'from-cyan-950 via-slate-900 to-indigo-950',
        quality: '4K Ultra HD',
        motivationalTheme: 'کاشت و ریشه‌دوانی ایده‌ها در لایه‌های پنهان مغز، قدرت باور و شکستن الگوهای ذهنی کهنه',
        tags: ['ضمیر ناخودآگاه', 'معماری رویا', 'دی‌کاپریو', 'روانشناسی'],
        uploadedAt: '2026-08-27',
        isDefault: true,
        playlistId: 'playlist-nolan-masterpieces',
        playlistTitle: 'شاهکارهای فلسفی کریستوفر نولان',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        trailerUrl: 'https://www.youtube.com/watch?v=YoHD9XEInc0',
        fileSize: '3.5 GB',
      },
      {
        id: 'movie-whiplash',
        mediaType: 'movie',
        title: 'شلاق (Whiplash)',
        originalTitle: 'Whiplash',
        director: 'دیمین شزل',
        year: 2014,
        duration: '۱ ساعت و ۴۷ دقیقه',
        genre: 'درام / روانشناسی / انضباط وسواس‌گونه',
        genres: ['روانشناسی', 'انضباط', 'موسیقی', 'درام'],
        synopsis: 'اندرو نیمن، یک درامر جوان و بااستعداد جاز، زیر نظر یک رهبر ارکستر بی‌رحم و کمال‌گرا آموزش می‌بیند. مرز باریک بین تلاش دیوانه‌وار برای برتری و فرسایش روانی، به شدیدترین شکل ممکن به تصویر کشیده می‌شود.',
        price: 12,
        rating: 4.9,
        imdbRating: '8.5',
        coverGradient: 'from-amber-950 via-stone-900 to-black',
        quality: '1080p Full HD',
        motivationalTheme: 'تمرین وسواس‌گونه، گذشتن از منطقه امن، انضباط بی‌پایان و بهای استادی در مهارت',
        tags: ['انضباط', 'جاز', 'تمرین', 'اراده', 'کمال‌گرایی'],
        uploadedAt: '2026-08-27',
        isDefault: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        trailerUrl: 'https://www.youtube.com/watch?v=7d_jQycdQGo',
        fileSize: '2.4 GB',
      },
      {
        id: 'movie-pursuit-of-happyness',
        mediaType: 'movie',
        title: 'در جستجوی خوشبختی (The Pursuit of Happyness)',
        originalTitle: 'The Pursuit of Happyness',
        director: 'گابریل موچینو',
        year: 2006,
        duration: '۱ ساعت و ۵۷ دقیقه',
        genre: 'بیوگرافی / درام / انگیزش روزانه',
        genres: ['بیوگرافی', 'انگیزشی', 'درام', 'پایداری'],
        synopsis: 'داستان واقعی کریس گاردنر، پدری بی‌پناه که در اوج بحران‌های مالی و بی‌خانمانی، با نگهداری از فرزند خردسالش و شرکت در دوره کارآموزی بدون حقوق، تسلیم سختی‌ها نمی‌شود و با عادات پولادین سرنوشتش را دگرگون می‌کند.',
        price: 10,
        rating: 4.8,
        imdbRating: '8.0',
        coverGradient: 'from-rose-950 via-slate-900 to-slate-950',
        quality: '1080p Full HD',
        motivationalTheme: 'هرگز تسلیم نشدن در سخت‌ترین روزها، ارزش عادات کوچک هرروزه و باور بی‌قیدوشرط به هدف',
        tags: ['پشتکار', 'داستان واقعی', 'ویل اسمیت', 'موفقیت', 'پدرانه'],
        uploadedAt: '2026-08-27',
        isDefault: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        trailerUrl: 'https://www.youtube.com/watch?v=DMOBlEcRuw8',
        fileSize: '2.1 GB',
      },
      {
        id: 'movie-shawshank-redemption',
        mediaType: 'movie',
        title: 'رستگاری در شاوشنک (The Shawshank Redemption)',
        originalTitle: 'The Shawshank Redemption',
        director: 'فرانک دارابونت',
        year: 1994,
        duration: '۲ ساعت و ۲۲ دقیقه',
        genre: 'درام / استقامت / شاهکار سینما',
        genres: ['درام', 'امید', 'استقامت', 'کلاسیک'],
        synopsis: 'اندی دوفرین، بانکداری که به ناحق به حبس ابد در زندان خشن شاوشنک محکوم شده، با حفظ امید، خردورزی و استمرار باورنکردنی در طول دو دهه، بزرگ‌ترین نماد صبر و پیروزی اراده انسان را می‌آفریند.',
        price: 15,
        rating: 5.0,
        imdbRating: '9.3',
        coverGradient: 'from-slate-950 via-blue-950 to-neutral-950',
        quality: '4K Ultra HD',
        motivationalTheme: 'قدرت صبر استراتژیک، اثر مرکب کارهای کوچک روزمره در بازه ۲۰ ساله و امید فناناپذیر',
        tags: ['رتبه ۱ تاریخ سینما', 'امید', 'صبر', 'استمرار', 'مورگان فریمن'],
        uploadedAt: '2026-08-27',
        isDefault: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        trailerUrl: 'https://www.youtube.com/watch?v=PLl99DlL6b4',
        fileSize: '3.8 GB',
      },
      {
        id: 'movie-beautiful-mind',
        mediaType: 'movie',
        title: 'ذهن زیبا (A Beautiful Mind)',
        originalTitle: 'A Beautiful Mind',
        director: 'ران هاوارد',
        year: 2001,
        duration: '۲ ساعت و ۱۵ دقیقه',
        genre: 'بیوگرافی / روانشناسی / ریاضیات و اراده',
        genres: ['بیوگرافی', 'روانشناسی', 'ذهن', 'درام'],
        synopsis: 'داستان زندگی جان نش، نابغه ریاضی و برنده جایزه نوبل، که با شجاعت بی‌مانند و به کارگیری اراده و کنترل شناختی، با بیماری اسکیزوفرنی خود مبارزه می‌کند و یاد می‌گیرد چگونه توهمات را مهار کند.',
        price: 10,
        rating: 4.8,
        imdbRating: '8.2',
        coverGradient: 'from-emerald-950 via-teal-950 to-slate-950',
        quality: '1080p Full HD',
        motivationalTheme: 'تسلط آگاهانه بر توهمات و حواس‌پرتی‌های ذهن، تعهد به حقیقت و کشف نظم در آشفتگی',
        tags: ['ریاضی', 'نوبل', 'روانشناسی', 'راسل کرو', 'شاهکار'],
        uploadedAt: '2026-08-27',
        isDefault: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
        trailerUrl: 'https://www.youtube.com/watch?v=YWwAOutgWBQ',
        fileSize: '2.2 GB',
      },

      // --- 2. TV SERIES (سریال‌ها با فصل‌بندی و قسمت‌ها) ---
      {
        id: 'series-queens-gambit',
        mediaType: 'series',
        title: 'سریال گامبی وزیر (The Queen\'s Gambit)',
        originalTitle: 'The Queen\'s Gambit',
        director: 'اسکات فرانک',
        year: 2020,
        duration: '۱ فصل • ۷ قسمت',
        genre: 'درام / استراتژی ذهن / تمرکز عمیق',
        genres: ['سریال', 'شطرنج', 'استراتژی', 'تمرکز', 'روانشناسی'],
        synopsis: 'بث هارمون، یک یتیم نابغه شطرنج، در مسیر تبدیل شدن به قهرمان بلامنازع جهان، با چالش‌های روانی، اعتیاد و نبردهای شناختی سهمگین در برابر استادان بزرگ بین‌المللی روبرو می‌شود.',
        price: 20, // Full series unlock
        pricePerEpisode: 3, // Unlock episode by episode
        rating: 4.9,
        imdbRating: '8.6',
        coverGradient: 'from-amber-950 via-stone-900 to-slate-950',
        quality: '4K Ultra HD',
        motivationalTheme: 'تمرکز عمیق (Deep Work)، مصورسازی ذهنی و بازسازی مداوم استراتژی پس از شکست‌ها',
        tags: ['شطرنج', 'تمرکز', 'نابغه', 'سریال کوتاه', 'نتفلیکس'],
        uploadedAt: '2026-08-26',
        isDefault: true,
        playlistId: 'playlist-psychological-series',
        playlistTitle: 'سریال‌های تمرکز و استادی ذهن',
        hasSeasons: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        seasons: [
          {
            id: 'season-qg-1',
            seasonNumber: 1,
            title: 'فصل اول: فتح خانه‌های ۶۴گانه',
            description: 'از زیرزمین پرورشگاه تا نبرد حماسی در برابر قهرمانان شوروی در مسکو',
            episodes: [
              {
                id: 'ep-qg-1',
                episodeNumber: 1,
                title: 'قسمت ۱: گشایش‌ها (Openings)',
                duration: '۵۹ دقیقه',
                quality: '4K Ultra HD',
                price: 0, // First episode free preview!
                synopsis: 'بث هارمون در زیرزمین پرورشگاه برای اولین بار با تخته شطرنج و سرایدار مرموز روبرو می‌شود.',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
              },
              {
                id: 'ep-qg-2',
                episodeNumber: 2,
                title: 'قسمت ۲: مبادله‌ها (Exchanges)',
                duration: '۶۵ دقیقه',
                quality: '4K Ultra HD',
                price: 3,
                synopsis: 'بث در مسابقات ایالتی ثبت‌نام می‌کند و همه را با محاسبات سرعتی خود شگفت‌زده می‌سازد.',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
              },
              {
                id: 'ep-qg-3',
                episodeNumber: 3,
                title: 'قسمت ۳: پیاده‌های دوگانه (Doubled Pawns)',
                duration: '۵۵ دقیقه',
                quality: '4K Ultra HD',
                price: 3,
                synopsis: 'سفر به سینسیناتی و رویارویی با اولین فشارهای رسانه‌ای و رقبای سرسخت.',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
              },
              {
                id: 'ep-qg-4',
                episodeNumber: 4,
                title: 'قسمت ۴: بازی میانی (Middle Game)',
                duration: '۴۸ دقیقه',
                quality: '4K Ultra HD',
                price: 3,
                synopsis: 'سفر به مکزیکوسیتی و روبه‌رو شدن با اسطوره روسی واسیلی بورگوف.',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
              },
              {
                id: 'ep-qg-5',
                episodeNumber: 5,
                title: 'قسمت ۵: حمله متقابل (End Game & Mastery)',
                duration: '۶۷ دقیقه',
                quality: '4K Ultra HD',
                price: 3,
                synopsis: 'تمرینات فوق‌سخت با رفقای قدیمی و آماده‌سازی برای رویارویی نهایی در مسکو.',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
              },
            ],
          },
        ],
      },

      // --- 3. ANIME (انیمه‌ها با فصل‌بندی و قسمت‌ها) ---
      {
        id: 'anime-attack-on-titan',
        mediaType: 'anime',
        title: 'انیمه حمله به تایتان (Attack on Titan)',
        originalTitle: 'Shingeki no Kyojin',
        director: 'تتسورو آراکی / استودیو WIT',
        year: 2013,
        duration: '۴ فصل • ۸۷ قسمت',
        genre: 'انیمه / حماسی / آزادی و عزم پولادین',
        genres: ['انیمه', 'حماسی', 'ارن یگر', 'آزادی', 'اکشن'],
        synopsis: 'در دنیایی که آخرین بازماندگان بشریت پشت دیوارهای غول‌پیکر از دست تایتان‌ها پناه گرفته‌اند، ارن یگر و دوستانش سوگند یاد می‌کنند که برای آزادی و دیدن جهان آن‌سوی دیوارها تا پای جان بجنگند.',
        price: 25,
        pricePerEpisode: 2,
        rating: 5.0,
        imdbRating: '9.1',
        coverGradient: 'from-rose-950 via-slate-900 to-amber-950',
        quality: '1080p Full HD',
        motivationalTheme: 'پیشروی بدون توقف («Tatakae»)، فداکاری برای اهداف بزرگ‌تر و شکستن دیوارهای محدودیت ذهنی',
        tags: ['انیمه', 'ارن یگر', 'میکاسا', 'لیوای', 'آزادی', 'شاهکار'],
        uploadedAt: '2026-08-25',
        isDefault: true,
        playlistId: 'playlist-epic-anime-willpower',
        playlistTitle: 'کالکشن انیمه‌های حماسی و اراده',
        hasSeasons: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        seasons: [
          {
            id: 'season-aot-1',
            seasonNumber: 1,
            title: 'فصل اول: سقوط شیگانشینا و سوگند پیشاهنگان',
            description: 'نقطه آغاز نبرد، ورود به سپاه ۱۰۴ام آموزشی و دفاع از منطقه تروست',
            episodes: [
              {
                id: 'ep-aot-s1-1',
                episodeNumber: 1,
                title: 'قسمت ۱: به سوی تو، در دو هزار سال آینده',
                duration: '۲۴ دقیقه',
                quality: '1080p Full HD',
                price: 0, // Free first episode
                synopsis: 'شکسته شدن دیوار ماریا توسط تایتان عظیم‌الجثه و تصمیم سرنوشت‌ساز ارن یگر.',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
              },
              {
                id: 'ep-aot-s1-2',
                episodeNumber: 2,
                title: 'قسمت ۲: آن روز (سقوط شیگانشینا)',
                duration: '۲۴ دقیقه',
                quality: '1080p Full HD',
                price: 2,
                synopsis: 'پناهندگان در پشت دیوار رز و شروع تمرینات سخت برای پیوستن به ارتش.',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              },
              {
                id: 'ep-aot-s1-3',
                episodeNumber: 3,
                title: 'قسمت ۳: نوری ضعیف در دل ناامیدی',
                duration: '۲۴ دقیقه',
                quality: '1080p Full HD',
                price: 2,
                synopsis: 'ارن با اراده‌ای تسلیم‌ناپذیر تعادل روی ابزار مانور سه‌بعدی را فرا می‌گیرد.',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
              },
              {
                id: 'ep-aot-s1-4',
                episodeNumber: 4,
                title: 'قسمت ۴: شب جشن فارغ‌التحصیلی',
                duration: '۲۴ دقیقه',
                quality: '1080p Full HD',
                price: 2,
                synopsis: 'انتخاب سپاه پیشاهنگی و حمله غافلگیرکننده دوم تایتان عظیم‌الجثه.',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
              },
            ],
          },
          {
            id: 'season-aot-2',
            seasonNumber: 2,
            title: 'فصل دوم: راز تایتان‌های درون دیوار',
            description: 'نبرد قلعه اوتگارد و افشای تکان‌دهنده هویت تایتان زره‌پوش',
            episodes: [
              {
                id: 'ep-aot-s2-1',
                episodeNumber: 1,
                title: 'قسمت ۱ (۲۶): تایتان حیوانی',
                duration: '۲۴ دقیقه',
                quality: '1080p Full HD',
                price: 2,
                synopsis: 'ظهور تایتان سخنگو با هیبت میمون و خطر رخنه در دیوار رز.',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
              },
              {
                id: 'ep-aot-s2-2',
                episodeNumber: 2,
                title: 'قسمت ۲ (۲۷): من برگشتم',
                duration: '۲۴ دقیقه',
                quality: '1080p Full HD',
                price: 2,
                synopsis: 'ساشا برای نجات دختربچه روستایی با تبر و کمان به تنهایی با تایتان می‌جنگد.',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
              },
            ],
          },
        ],
      },
      {
        id: 'anime-vinland-saga',
        mediaType: 'anime',
        title: 'انیمه حماسه وینلند (Vinland Saga)',
        originalTitle: 'Vinland Saga',
        director: 'شوهی یابوتا / استودیو MAPPA',
        year: 2019,
        duration: '۲ فصل • ۴۸ قسمت',
        genre: 'انیمه / تاریخی / رشد شخصیت و بخشش',
        genres: ['انیمه', 'وایکینگ‌ها', 'رشد فردی', 'استقامت', 'درام'],
        synopsis: 'تورفین جوان پس از کشته شدن پدرش، به گروه قاتل او می‌پیوندد تا در دوئلی عادلانه انتقام بگیرد. اما در طول سال‌ها درمی‌یابد که جنگجوی واقعی کیست و چگونه می‌توان چرخه‌های خشونت را با ساخت جامعه‌ای در صلح در هم شکست.',
        price: 22,
        pricePerEpisode: 2,
        rating: 4.9,
        imdbRating: '8.8',
        coverGradient: 'from-blue-950 via-slate-900 to-emerald-950',
        quality: '1080p Full HD',
        motivationalTheme: '«تو هیچ دشمنی نداری»؛ سفر از خشم کورکورانه به خرد و بازسازی معنادار زندگی',
        tags: ['وایکینگ', 'حماسی', 'تورفین', 'روانشناسی', 'بلوغ'],
        uploadedAt: '2026-08-25',
        isDefault: true,
        playlistId: 'playlist-epic-anime-willpower',
        playlistTitle: 'کالکشن انیمه‌های حماسی و اراده',
        hasSeasons: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        seasons: [
          {
            id: 'season-vs-1',
            seasonNumber: 1,
            title: 'فصل اول: عصر شمشیر و انتقام',
            description: 'نبردهای انگلستان و آزمون‌های سخت تورفین در کنار آسکلاد',
            episodes: [
              {
                id: 'ep-vs-1',
                episodeNumber: 1,
                title: 'قسمت ۱: جایی در سرزمین دور',
                duration: '۲۴ دقیقه',
                quality: '1080p Full HD',
                price: 0,
                synopsis: 'تورفین در ایسلند داستان‌های ملوان پیر از سرزمین سرسبز و آزاد وینلند را می‌شنود.',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
              },
              {
                id: 'ep-vs-2',
                episodeNumber: 2,
                title: 'قسمت ۲: شمشیر جنگجوی واقعی',
                duration: '۲۴ دقیقه',
                quality: '1080p Full HD',
                price: 2,
                synopsis: 'تورس، پدر تورفین، راز یک جنگجوی حقیقی را که نیازی به شمشیر ندارد به او می‌آموزد.',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
              },
            ],
          },
        ],
      },
    ];
  }

  // English defaults
  return [
    {
      id: 'movie-interstellar',
      mediaType: 'movie',
      title: 'Interstellar',
      originalTitle: 'Interstellar',
      director: 'Christopher Nolan',
      year: 2014,
      duration: '169 min',
      genre: 'Sci-Fi / Adventure / Philosophy',
      genres: ['Sci-Fi', 'Motivation', 'Philosophy', 'Drama'],
      synopsis: 'When Earth becomes uninhabitable in the future, a team of explorers travels through a wormhole in space in an attempt to ensure humanity\'s survival.',
      price: 15,
      rating: 4.9,
      imdbRating: '8.7',
      coverGradient: 'from-blue-950 via-indigo-900 to-slate-950',
      quality: '4K Ultra HD',
      motivationalTheme: 'Unyielding willpower, persistence across impossible odds, and deep human resilience.',
      tags: ['Sci-Fi', 'Space', 'Resilience', 'Christopher Nolan'],
      uploadedAt: '2026-08-27',
      isDefault: true,
      playlistId: 'playlist-nolan-masterpieces',
      playlistTitle: 'Christopher Nolan Masterpieces',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      trailerUrl: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
      fileSize: '4.2 GB',
    },
    {
      id: 'movie-inception',
      mediaType: 'movie',
      title: 'Inception',
      originalTitle: 'Inception',
      director: 'Christopher Nolan',
      year: 2010,
      duration: '148 min',
      genre: 'Sci-Fi / Mind Architecture / Mystery',
      genres: ['Sci-Fi', 'Psychology', 'Subconscious', 'Mystery'],
      synopsis: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
      price: 14,
      rating: 4.9,
      imdbRating: '8.8',
      coverGradient: 'from-cyan-950 via-slate-900 to-indigo-950',
      quality: '4K Ultra HD',
      motivationalTheme: 'Planting resilient ideas deep within the subconscious and constructing mental habits.',
      tags: ['Subconscious', 'Mind Architecture', 'DiCaprio'],
      uploadedAt: '2026-08-27',
      isDefault: true,
      playlistId: 'playlist-nolan-masterpieces',
      playlistTitle: 'Christopher Nolan Masterpieces',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      trailerUrl: 'https://www.youtube.com/watch?v=YoHD9XEInc0',
      fileSize: '3.5 GB',
    },
    {
      id: 'movie-whiplash',
      mediaType: 'movie',
      title: 'Whiplash',
      originalTitle: 'Whiplash',
      director: 'Damien Chazelle',
      year: 2014,
      duration: '107 min',
      genre: 'Drama / Music / Relentless Discipline',
      genres: ['Psychology', 'Discipline', 'Music', 'Drama'],
      synopsis: 'A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student\'s potential.',
      price: 12,
      rating: 4.9,
      imdbRating: '8.5',
      coverGradient: 'from-amber-950 via-stone-900 to-black',
      quality: '1080p Full HD',
      motivationalTheme: 'Relentless practice, breaking comfort zones, and the true cost of mastery.',
      tags: ['Discipline', 'Music', 'Obsession', 'Mastery'],
      uploadedAt: '2026-08-27',
      isDefault: true,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      trailerUrl: 'https://www.youtube.com/watch?v=7d_jQycdQGo',
      fileSize: '2.4 GB',
    },
    {
      id: 'series-queens-gambit',
      mediaType: 'series',
      title: 'The Queen\'s Gambit',
      originalTitle: 'The Queen\'s Gambit',
      director: 'Scott Frank',
      year: 2020,
      duration: '1 Season • 7 Episodes',
      genre: 'Drama / Strategy / Intense Focus',
      genres: ['Series', 'Chess', 'Strategy', 'Focus'],
      synopsis: 'Orphaned at the tender age of nine, prodigious introvert Beth Harmon discovers and masters the game of chess in 1960s USA.',
      price: 20,
      pricePerEpisode: 3,
      rating: 4.9,
      imdbRating: '8.6',
      coverGradient: 'from-amber-950 via-stone-900 to-slate-950',
      quality: '4K Ultra HD',
      motivationalTheme: 'Deep cognitive visualization, intense focus and strategic recovery from failure.',
      tags: ['Chess', 'Focus', 'Miniseries'],
      uploadedAt: '2026-08-26',
      isDefault: true,
      playlistId: 'playlist-psychological-series',
      playlistTitle: 'Mastery & Strategy Series Collection',
      hasSeasons: true,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      seasons: [
        {
          id: 'season-qg-1',
          seasonNumber: 1,
          title: 'Season 1: Openings and Grandmasters',
          description: 'From the orphanage basement to the world stage in Moscow.',
          episodes: [
            {
              id: 'ep-qg-1',
              episodeNumber: 1,
              title: 'Episode 1: Openings',
              duration: '59 min',
              quality: '4K Ultra HD',
              price: 0,
              synopsis: 'Beth discovers the chessboard and begins her journey.',
              videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            },
            {
              id: 'ep-qg-2',
              episodeNumber: 2,
              title: 'Episode 2: Exchanges',
              duration: '65 min',
              quality: '4K Ultra HD',
              price: 3,
              synopsis: 'Entering the state championship and stunning opponents.',
              videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
            },
          ],
        },
      ],
    },
    {
      id: 'anime-attack-on-titan',
      mediaType: 'anime',
      title: 'Attack on Titan (Shingeki no Kyojin)',
      originalTitle: 'Shingeki no Kyojin',
      director: 'Tetsuro Araki / WIT Studio',
      year: 2013,
      duration: '4 Seasons • 87 Episodes',
      genre: 'Anime / Epic / Unyielding Will',
      genres: ['Anime', 'Epic', 'Freedom', 'Action'],
      synopsis: 'After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans.',
      price: 25,
      pricePerEpisode: 2,
      rating: 5.0,
      imdbRating: '9.1',
      coverGradient: 'from-rose-950 via-slate-900 to-amber-950',
      quality: '1080p Full HD',
      motivationalTheme: 'Keep advancing until freedom is won ("Tatakae"). Breaking mental and physical walls.',
      tags: ['Anime', 'Eren', 'Action', 'Masterpiece'],
      uploadedAt: '2026-08-25',
      isDefault: true,
      playlistId: 'playlist-epic-anime-willpower',
      playlistTitle: 'Epic Anime Willpower Anthology',
      hasSeasons: true,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      seasons: [
        {
          id: 'season-aot-1',
          seasonNumber: 1,
          title: 'Season 1: The Fall of Shiganshina',
          description: 'The beginning of the battle against the Titans.',
          episodes: [
            {
              id: 'ep-aot-s1-1',
              episodeNumber: 1,
              title: 'Episode 1: To You, in 2000 Years',
              duration: '24 min',
              quality: '1080p Full HD',
              price: 0,
              synopsis: 'The Colossal Titan breaks Wall Maria.',
              videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
            },
            {
              id: 'ep-aot-s1-2',
              episodeNumber: 2,
              title: 'Episode 2: That Day',
              duration: '24 min',
              quality: '1080p Full HD',
              price: 2,
              synopsis: 'Refugees behind Wall Rose begin military training.',
              videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            },
          ],
        },
      ],
    },
  ];
};

// Custom user-uploaded movies storage
export const getCustomMovies = (): ShopMovie[] => {
  try {
    const saved = safeStorage.getItem(MOVIES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse custom movies:', e);
  }
  return [];
};

export const saveCustomMovies = (movies: ShopMovie[]) => {
  try {
    safeStorage.setItem(MOVIES_STORAGE_KEY, JSON.stringify(movies));
  } catch (e) {
    console.warn('Failed to save custom movies:', e);
  }
};

// Custom user-created playlists storage
export const getCustomPlaylists = (): VideoPlaylist[] => {
  try {
    const saved = safeStorage.getItem(PLAYLISTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse custom playlists:', e);
  }
  return [];
};

export const saveCustomPlaylists = (playlists: VideoPlaylist[]) => {
  try {
    safeStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
  } catch (e) {
    console.warn('Failed to save custom playlists:', e);
  }
};

// Combine defaults + custom uploaded movies safely, filtering out deleted items
export const getAllMovies = (
  language: Language,
  customMovies: ShopMovie[] = [],
  deletedMovieIds: string[] = getDeletedMovieIds()
): ShopMovie[] => {
  const defaults = getDefaultMovies(language);
  const deletedSet = new Set(deletedMovieIds);
  const defaultIds = new Set(defaults.map((d) => d.id));
  const customs = customMovies.filter((c) => !defaultIds.has(c.id));
  return [...defaults, ...customs].filter((m) => !deletedSet.has(m.id));
};

// Combine defaults + custom playlists safely
export const getAllPlaylists = (
  language: Language,
  customPlaylists: VideoPlaylist[] = [],
  deletedPlaylistIds: string[] = []
): VideoPlaylist[] => {
  const defaults = getDefaultPlaylists(language);
  const deletedSet = new Set(deletedPlaylistIds);
  const defaultIds = new Set(defaults.map((p) => p.id));
  const customs = customPlaylists.filter((c) => !defaultIds.has(c.id));
  return [...defaults, ...customs].filter((p) => !deletedSet.has(p.id));
};

// Check if an entire movie/series is unlocked
export const isMovieUnlocked = (wallet: UserRewardWallet, movieId: string): boolean => {
  if (!wallet || !wallet.unlockedMovieIds) return false;
  return wallet.unlockedMovieIds.includes(movieId);
};

// Check if a specific episode is unlocked
export const isEpisodeUnlocked = (wallet: UserRewardWallet, movieId: string, episode: VideoEpisode): boolean => {
  if (!wallet) return false;
  // If price is 0 or undefined, it is free
  if (!episode.price || episode.price <= 0) return true;
  // If entire movie/series is unlocked, all episodes are unlocked
  if (wallet.unlockedMovieIds && wallet.unlockedMovieIds.includes(movieId)) return true;
  // If episode key is present in unlockedEpisodeIds
  const epKey = `${movieId}:${episode.id}`;
  if (wallet.unlockedEpisodeIds && wallet.unlockedEpisodeIds.includes(epKey)) return true;
  return false;
};

// Get unlock price for an individual episode
export const getEpisodePrice = (episode: VideoEpisode, fallbackPrice = 2): number => {
  if (episode.price !== undefined) {
    return Math.max(0, episode.price);
  }
  return fallbackPrice;
};

// Count total episodes in a movie/series
export const countTotalEpisodes = (movie: ShopMovie): number => {
  if (movie.hasSeasons && movie.seasons && movie.seasons.length > 0) {
    return movie.seasons.reduce((acc, s) => acc + (s.episodes?.length || 0), 0);
  }
  if (movie.standaloneEpisodes && movie.standaloneEpisodes.length > 0) {
    return movie.standaloneEpisodes.length;
  }
  return 1; // Standalone movie counts as 1
};

// Calculate total unlock price for full playlist/series/movie (single flat price if defined, or sum/per-item)
export const getMovieTotalCalculatedPrice = (movie: ShopMovie): number => {
  // If a flat price is explicitly defined for the whole movie/series/playlist, respect it directly
  if (movie.price !== undefined && movie.price !== null) {
    return Math.max(0, Number(movie.price));
  }
  if (movie.hasSeasons && movie.seasons && movie.seasons.length > 0) {
    const sum = movie.seasons.reduce((acc, s) => {
      const seasonSum = (s.episodes || []).reduce((epAcc, ep) => {
        const p = ep.price !== undefined ? Math.max(0, Number(ep.price)) : (movie.pricePerEpisode !== undefined ? Math.max(0, Number(movie.pricePerEpisode)) : 2);
        return epAcc + p;
      }, 0);
      return acc + seasonSum;
    }, 0);
    return sum;
  }
  if (movie.standaloneEpisodes && movie.standaloneEpisodes.length > 0) {
    const sum = movie.standaloneEpisodes.reduce((epAcc, ep) => {
      const p = ep.price !== undefined ? Math.max(0, Number(ep.price)) : (movie.pricePerEpisode !== undefined ? Math.max(0, Number(movie.pricePerEpisode)) : 2);
      return epAcc + p;
    }, 0);
    return sum;
  }
  return 10;
};

// Count total seasons in a movie/series
export const countTotalSeasons = (movie: ShopMovie): number => {
  if (movie.hasSeasons && movie.seasons) {
    return movie.seasons.length;
  }
  return 0;
};

// Get localized media type label and color
export const getMediaTypeMeta = (mediaType: MediaType = 'movie', language: Language) => {
  const isFa = language === 'fa';
  switch (mediaType) {
    case 'series':
      return {
        label: isFa ? 'سریال' : 'TV Series',
        badgeBg: 'bg-slate-800 text-indigo-300 border-slate-700',
        dotColor: 'bg-indigo-400',
      };
    case 'anime':
      return {
        label: isFa ? 'انیمه' : 'Anime',
        badgeBg: 'bg-slate-800 text-cyan-300 border-slate-700',
        dotColor: 'bg-cyan-400',
      };
    case 'movie':
    default:
      return {
        label: isFa ? 'فیلم سینمایی' : 'Movie',
        badgeBg: 'bg-slate-800 text-blue-300 border-slate-700',
        dotColor: 'bg-blue-400',
      };
  }
};
