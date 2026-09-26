import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen, Calendar, ChevronLeft, ChevronRight, Share2, Volume2,
  VolumeX, Check, Bookmark, Sparkles, Heart, Sun, Moon, ArrowLeft,
  Copy, MessageCircle, Clock, ExternalLink
} from 'lucide-react';
import { memberPortalAPI } from '../../api/memberClient';
import toast from 'react-hot-toast';

export default function MemberPortalDevotional() {
  const { churchSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [devotional, setDevotional] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [recentList, setRecentList] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const speechSynthRef = useRef(null);

  useEffect(() => {
    loadDevotional(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    // Load recent devotionals for quick archive browsing
    memberPortalAPI.listDevotionals({ limit: 14 })
      .then(res => {
        if (res.data?.data) {
          setRecentList(res.data.data);
        }
      })
      .catch(() => {});

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const loadDevotional = async (dateStr) => {
    setLoading(true);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
    try {
      const res = await memberPortalAPI.getDevotionalByDate(dateStr);
      setDevotional(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load devotional:', err);
      setDevotional(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Text-To-Speech
  const toggleSpeech = () => {
    if (!devotional) return;

    if (!('speechSynthesis' in window)) {
      toast.error('Audio reading is not supported by your browser.');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const textToRead = [
      `Today's Devotional: ${devotional.title}.`,
      `Theme Scripture: ${devotional.scripture_reference}. ${devotional.scripture_text || ''}`,
      `Message: ${devotional.content || ''}`,
      devotional.confession ? `Declaration of Faith: ${devotional.confession}` : '',
      devotional.prayer_point ? `Prayer for Today: ${devotional.prayer_point}` : '',
    ].filter(Boolean).join(' ... ');

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  // Share via WhatsApp
  const shareWhatsApp = () => {
    if (!devotional) return;
    const formattedDate = new Date(devotional.publish_date).toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
    });

    const lines = [
      `📖 *${devotional.title.toUpperCase()}*`,
      `🗓 ${formattedDate}`,
      ``,
      `*Scripture:* ${devotional.scripture_reference}`,
      devotional.scripture_text ? `_"${devotional.scripture_text}"_` : '',
      ``,
      devotional.content,
      ``,
      devotional.confession ? `⚡ *Declaration:* ${devotional.confession}\n` : '',
      devotional.prayer_point ? `🙏 *Prayer Point:* ${devotional.prayer_point}\n` : '',
      devotional.reading_plan ? `📚 *Bible in One Year:* ${devotional.reading_plan}\n` : '',
      `— Shared via Church Portal`
    ].filter(Boolean).join('\n');

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(lines)}`;
    window.open(url, '_blank');
  };

  const copyContent = () => {
    if (!devotional) return;
    const text = `${devotional.title}\n${devotional.scripture_reference}\n\n${devotional.content}\n\nPrayer: ${devotional.prayer_point || ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Devotional copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Daily Devotional</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Spiritual nourishment and daily word for your walk of faith</p>
          </div>
        </div>

        {/* Date Navigator Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 transition"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-2/3 mx-auto"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3 mx-auto"></div>
          <div className="h-32 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-full"></div>
          <div className="h-24 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-full"></div>
        </div>
      ) : !devotional ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Devotional for {selectedDate}</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            The church has not published a devotional entry for this date yet. Check back soon or select another date from the archive below.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={handleToday}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm"
            >
              Go to Today
            </button>
            <Link
              to={`/portal/${churchSlug}`}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      ) : (
        /* Main Devotional Presentation */
        <article className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          {/* Top Banner / Theme Strip */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between text-xs font-semibold text-amber-100 uppercase tracking-widest mb-3">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {new Date(devotional.publish_date).toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                })}
              </span>
              {devotional.author && (
                <span className="bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[11px]">
                  By {devotional.author}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-4 leading-tight">
              {devotional.title}
            </h1>

            {/* Audio Reader & Quick Actions in Banner */}
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <button
                onClick={toggleSpeech}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                  isPlaying
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-white text-amber-900 hover:bg-amber-50'
                }`}
              >
                {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {isPlaying ? 'Pause Audio Reading' : 'Listen with Audio Reader'}
              </button>

              <button
                onClick={shareWhatsApp}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold transition shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Share on WhatsApp
              </button>

              <button
                onClick={copyContent}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10 space-y-8">
            {/* Theme Scripture Block */}
            {devotional.scripture_reference && (
              <div className="relative bg-amber-50/70 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-2xl p-5 sm:p-6">
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400 tracking-wider uppercase mb-1">
                  Theme Scripture
                </div>
                <div className="text-base sm:text-lg font-serif italic text-slate-800 dark:text-slate-200 leading-relaxed">
                  "{devotional.scripture_text || 'Thy word is a lamp unto my feet, and a light unto my path.'}"
                </div>
                <div className="text-right text-xs font-bold text-amber-800 dark:text-amber-300 mt-2">
                  — {devotional.scripture_reference}
                </div>
              </div>
            )}

            {/* Devotional Exposition / Message */}
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-base leading-relaxed whitespace-pre-line font-normal">
              {devotional.content}
            </div>

            {/* Confession & Declarations Section */}
            {devotional.confession && (
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800/90 dark:to-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-sm uppercase tracking-wider mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Declaration of Faith
                </div>
                <p className="text-slate-800 dark:text-slate-100 font-medium text-sm sm:text-base leading-relaxed italic">
                  "{devotional.confession}"
                </p>
              </div>
            )}

            {/* Daily Prayer Point */}
            {devotional.prayer_point && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800/90 dark:to-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm uppercase tracking-wider mb-2">
                  <Heart className="w-4 h-4 text-emerald-500" />
                  Daily Prayer Point
                </div>
                <p className="text-slate-800 dark:text-slate-100 font-medium text-sm sm:text-base leading-relaxed">
                  {devotional.prayer_point}
                </p>
              </div>
            )}

            {/* Bible Reading Plan */}
            {devotional.reading_plan && (
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Bible in One Year:</div>
                  <div className="text-slate-600 dark:text-slate-400">{devotional.reading_plan}</div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation Bar */}
          <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 sm:p-6 flex items-center justify-between">
            <button
              onClick={handlePrevDay}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Day
            </button>

            <button
              onClick={shareWhatsApp}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Send to Fellowship on WhatsApp
            </button>

            <button
              onClick={handleNextDay}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
            >
              Next Day
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </article>
      )}

      {/* Archive / Recent Devotionals Reel */}
      {recentList.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              Recent Devotionals Archive
            </h3>
            <span className="text-xs text-slate-400">Select any day to read</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {recentList.map((item) => {
              const itemDateStr = item.publish_date.split('T')[0];
              const isSelected = itemDateStr === selectedDate;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedDate(itemDateStr)}
                  className={`text-left p-3 rounded-xl border transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-0.5">
                    {new Date(item.publish_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {item.scripture_reference}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
