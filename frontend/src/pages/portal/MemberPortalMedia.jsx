import { useEffect, useState } from 'react';
import { Film, Play, Headphones, Video, Search, Clock, User, BookOpen, ExternalLink, Loader2, Sparkles, X } from 'lucide-react';
import { format } from 'date-fns';
import { memberPortalAPI } from '../../api/memberClient';
import toast from 'react-hot-toast';

const TYPES = [
  { id: '', label: 'All Media' },
  { id: 'sermon', label: 'Sermons' },
  { id: 'audio', label: 'Audio' },
  { id: 'video', label: 'Video' },
  { id: 'podcast', label: 'Podcast' },
];

export default function MemberPortalMedia() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('');
  const [search, setSearch] = useState('');
  const [activeMedia, setActiveMedia] = useState(null);

  const fetchMedia = () => {
    setLoading(true);
    memberPortalAPI.media({ type: selectedType || undefined, search: search || undefined })
      .then(res => setItems(res.data.data || []))
      .catch(() => toast.error('Failed to load media files'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMedia();
  }, [selectedType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMedia();
  };

  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs} min`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2">
          <Film size={14} className="text-indigo-600" />
          <span>Sermon & Media Library</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-display">Media Files & Messages</h1>
        <p className="text-gray-500 text-sm mt-1">
          Listen to life-transforming sermons, watch video recordings, and stay spiritually nourished.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                selectedType === t.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search title, preacher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-500 focus:bg-white outline-none"
          />
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center text-gray-500">
          <Headphones size={44} className="mx-auto text-gray-300 mb-3" />
          <h3 className="font-bold text-gray-800 text-lg">No Media Files Available</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mt-1">
            Check back soon for new sermon audio, video messages, and podcasts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(item => (
            <div
              key={item.id}
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col group"
            >
              {/* Thumbnail / Cover */}
              <div
                className="relative aspect-video bg-gradient-to-br from-slate-900 to-brand-950 flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => setActiveMedia(item)}
              >
                {item.thumbnail_url ? (
                  <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="text-white/40 flex flex-col items-center gap-1.5">
                    {item.media_type === 'video' ? <Video size={36} /> : <Headphones size={36} />}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/25 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/90 text-brand-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play size={20} className="translate-x-0.5" />
                  </div>
                </div>
                {item.duration_seconds && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[11px] font-medium rounded-md flex items-center gap-1">
                    <Clock size={11} /> {formatDuration(item.duration_seconds)}
                  </span>
                )}
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-brand-600/90 text-white text-[10px] font-bold uppercase tracking-wider rounded-md">
                  {item.media_type || 'Media'}
                </span>
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  {item.series_name && (
                    <div className="text-[11px] text-brand-600 font-semibold mb-0.5 truncate">
                      {item.series_name}
                    </div>
                  )}
                  <h3
                    className="font-bold text-gray-900 text-base leading-snug group-hover:text-brand-600 transition-colors line-clamp-2 cursor-pointer"
                    onClick={() => setActiveMedia(item)}
                  >
                    {item.title}
                  </h3>
                  {item.minister_name && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                      <User size={12} className="text-gray-400" />
                      <span>{item.minister_name}</span>
                    </div>
                  )}
                  {item.scripture_reference && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 mt-1">
                      <BookOpen size={12} />
                      <span className="font-medium">{item.scripture_reference}</span>
                    </div>
                  )}
                  {item.description && (
                    <p className="text-gray-500 text-xs mt-2 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-3 border-t border-gray-50 flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy') : ''}
                  </span>
                  <button
                    onClick={() => setActiveMedia(item)}
                    className="text-brand-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    Play Now <Play size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media Player Modal */}
      {activeMedia && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveMedia(null)}>
          <div className="bg-slate-900 text-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/10">
              <div className="min-w-0 pr-4">
                <span className="text-[10px] uppercase font-bold text-brand-400 tracking-wider">
                  {activeMedia.media_type || 'Media'}
                </span>
                <h3 className="text-lg font-bold truncate text-white mt-0.5">{activeMedia.title}</h3>
                {activeMedia.minister_name && <p className="text-xs text-gray-400">{activeMedia.minister_name}</p>}
              </div>
              <button onClick={() => setActiveMedia(null)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4">
              {activeMedia.file_url ? (
                activeMedia.media_type === 'video' ? (
                  <div className="aspect-video rounded-2xl overflow-hidden bg-black">
                    <video src={activeMedia.file_url} controls autoPlay className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-center space-y-3">
                    <Headphones size={48} className="mx-auto text-brand-400 animate-pulse" />
                    <audio src={activeMedia.file_url} controls autoPlay className="w-full mt-2" />
                  </div>
                )
              ) : (
                <div className="p-8 text-center bg-white/5 rounded-2xl text-gray-400 text-sm">
                  Media streaming link is being prepared by church media team.
                </div>
              )}

              {activeMedia.description && (
                <p className="text-sm text-gray-300 leading-relaxed bg-white/5 p-4 rounded-xl">
                  {activeMedia.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
