import { useEffect, useState } from 'react';
import { Bell, MessageSquare, Mail, Phone, Calendar, ArrowRight, Loader2, Sparkles, Megaphone } from 'lucide-react';
import { format } from 'date-fns';
import { memberPortalAPI } from '../../api/memberClient';
import toast from 'react-hot-toast';

export default function MemberPortalAnnouncements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    memberPortalAPI.announcements()
      .then(res => setItems(res.data.data || []))
      .catch(() => toast.error('Failed to load announcements'))
      .finally(() => setLoading(false));
  }, []);

  const getChannelIcon = (ch) => {
    switch (ch) {
      case 'sms': return Phone;
      case 'email': return Mail;
      case 'whatsapp': return MessageSquare;
      default: return Megaphone;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-100 mb-2">
          <Bell size={14} className="text-brand-600" />
          <span>Church Communications</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-display">Announcements & Messages</h1>
        <p className="text-gray-500 text-sm mt-1">
          Stay updated with important announcements, service bulletins, and messages from church leadership.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center text-gray-500 shadow-xs">
          <Megaphone size={44} className="mx-auto text-gray-300 mb-3" />
          <h3 className="font-bold text-gray-800 text-lg">No Announcements Yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
            Official announcements and church messages will appear here as soon as they are published.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => {
            const Icon = getChannelIcon(item.channel);
            const dateStr = item.sent_at || item.created_at;
            const formattedDate = dateStr ? format(new Date(dateStr), 'EEEE, MMMM d, yyyy · h:mm a') : '';

            return (
              <div
                key={item.id || idx}
                onClick={() => setSelected(item)}
                className="bg-white border border-gray-100 hover:border-brand-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                          {item.channel || 'Announcement'}
                        </span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400 font-medium">{formattedDate}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1.5 line-clamp-3 leading-relaxed">
                        {item.body}
                      </p>
                    </div>
                  </div>
                  <div className="text-gray-300 group-hover:text-brand-600 transition-colors hidden sm:block">
                    <ArrowRight size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full">
                {selected.channel || 'Announcement'}
              </span>
              <span className="text-xs text-gray-400">
                {selected.sent_at || selected.created_at ? format(new Date(selected.sent_at || selected.created_at), 'PPP · p') : ''}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-display">
              {selected.title}
            </h2>
            <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed border-t border-gray-100 pt-4">
              {selected.body}
            </div>
            <div className="pt-4 flex justify-end">
              <button onClick={() => setSelected(null)} className="btn-secondary text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
