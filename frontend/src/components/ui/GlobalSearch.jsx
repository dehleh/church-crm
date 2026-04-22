import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, UserPlus, CalendarDays, DollarSign, X, Loader2 } from 'lucide-react';
import api from '../../api/client';
import { format } from 'date-fns';

const currency = n => `₦${Number(n || 0).toLocaleString()}`;

function ResultSection({ title, icon: Icon, items, onSelect, renderItem }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">
        <Icon size={12} /> {title}
      </div>
      {items.map(item => (
        <button key={item.id} onClick={() => onSelect(item)}
          className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-brand-50/60 transition-colors text-left">
          {renderItem(item)}
        </button>
      ))}
    </div>
  );
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); setResults(null); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Click outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (q) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await api.get('/search', { params: { q } });
      setResults(res.data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelect = (type, item) => {
    setOpen(false); setQuery(''); setResults(null);
    if (type === 'member') navigate(`/members/${item.id}`);
    else if (type === 'firstTimer') navigate(`/first-timers`);
    else if (type === 'event') navigate(`/events`);
    else if (type === 'transaction') navigate(`/finance`);
  };

  const totalResults = results
    ? (results.members?.length || 0) + (results.firstTimers?.length || 0) + (results.events?.length || 0) + (results.transactions?.length || 0)
    : 0;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs">
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400 hover:border-brand-300 hover:bg-white transition-all"
      >
        <Search size={14} />
        <span className="flex-1 text-left">Quick search…</span>
        <kbd className="hidden md:flex items-center gap-0.5 text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>

      {open && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden" style={{ minWidth: '400px' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            {loading ? <Loader2 size={16} className="text-brand-500 animate-spin flex-shrink-0" /> : <Search size={16} className="text-gray-400 flex-shrink-0" />}
            <input
              ref={inputRef}
              value={query}
              onChange={handleChange}
              placeholder="Search members, events, transactions…"
              className="flex-1 text-sm outline-none placeholder:text-gray-400"
              autoFocus
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }}
                className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {!query && (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                <Search size={24} className="mx-auto mb-2 opacity-30" />
                Type to search across members, events, finance and more
              </div>
            )}

            {query && !loading && results && totalResults === 0 && (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">No results for "{query}"</div>
            )}

            {results && (
              <>
                <ResultSection title="Members" icon={Users} items={results.members}
                  onSelect={item => handleSelect('member', item)}
                  renderItem={item => (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                        {(item.first_name?.[0] || '') + (item.last_name?.[0] || '')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{item.first_name} {item.last_name}</p>
                        <p className="text-xs text-gray-400">{item.member_number} · {item.phone || item.email || ''}</p>
                      </div>
                      <span className={`badge text-xs flex-shrink-0 ${item.membership_status === 'active' ? 'badge-green' : item.membership_status === 'pending_review' ? 'badge-yellow' : 'badge-gray'}`}>{item.membership_status}</span>
                    </div>
                  )}
                />
                <ResultSection title="First Timers" icon={UserPlus} items={results.firstTimers}
                  onSelect={item => handleSelect('firstTimer', item)}
                  renderItem={item => (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.first_name} {item.last_name}</p>
                      <p className="text-xs text-gray-400">{item.phone} · Visited {item.visit_date ? format(new Date(item.visit_date), 'MMM d, yyyy') : ''}</p>
                    </div>
                  )}
                />
                <ResultSection title="Events" icon={CalendarDays} items={results.events}
                  onSelect={item => handleSelect('event', item)}
                  renderItem={item => (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-400 capitalize">{item.event_type?.replace(/_/g, ' ')} · {item.start_datetime ? format(new Date(item.start_datetime), 'MMM d, yyyy') : ''}</p>
                    </div>
                  )}
                />
                <ResultSection title="Transactions" icon={DollarSign} items={results.transactions}
                  onSelect={item => handleSelect('transaction', item)}
                  renderItem={item => (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{item.description || 'Transaction'}</p>
                        <p className="text-xs text-gray-400">{item.transaction_date ? format(new Date(item.transaction_date), 'MMM d, yyyy') : ''}</p>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${item.transaction_type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {item.transaction_type === 'expense' ? '-' : '+'}{currency(item.amount)}
                      </span>
                    </div>
                  )}
                />
              </>
            )}
          </div>

          {totalResults > 0 && (
            <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400 text-right">
              {totalResults} result{totalResults !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
