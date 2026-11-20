import { useEffect, useState } from 'react';
import { Loader2, Users, Calendar, ClipboardCheck, CheckCircle2, Clock, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { memberPortalAPI } from '../../api/memberClient';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const fmt = (d) => d ? format(new Date(d), 'MMM yyyy') : '';

export default function MemberPortalGroups() {
  const [data, setData] = useState({ departments: [], groups: [] });
  const [loading, setLoading] = useState(true);

  // Active Checklist Modal
  const [selectedDept, setSelectedDept] = useState(null);
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [activeChecklist, setActiveChecklist] = useState(null);

  useEffect(() => {
    memberPortalAPI.affiliations()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleOpenChecklist = async (dept) => {
    setSelectedDept(dept);
    setChecklistModalOpen(true);
    setChecklistLoading(true);
    try {
      const res = await memberPortalAPI.getActiveDepartmentChecklist(dept.id);
      setActiveChecklist(res.data.data);
    } catch {
      toast.error('Failed to load pre-service checklist');
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleToggleItem = async (itemId) => {
    if (!activeChecklist) return;

    // Optimistic toggle
    setActiveChecklist(prev => {
      if (!prev) return prev;
      const updatedItems = prev.items.map(it => {
        if (it.id === itemId) {
          const newCompleted = !it.is_completed;
          return {
            ...it,
            is_completed: newCompleted,
            completed_at: newCompleted ? new Date().toISOString() : null,
          };
        }
        return it;
      });
      const completedCount = updatedItems.filter(i => i.is_completed).length;
      return {
        ...prev,
        completed_items: completedCount,
        progress_pct: updatedItems.length ? Math.round((completedCount / updatedItems.length) * 100) : 0,
        items: updatedItems,
      };
    });

    try {
      await memberPortalAPI.toggleChecklistItem(itemId);
    } catch {
      toast.error('Failed to update task readiness');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">My Groups & Units</h1>
      <p className="text-gray-500 text-sm mb-6">Departments you serve in and groups you belong to.</p>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : (
        <>
          {/* Departments / Units */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Users size={15} /> Departments & Service Units
            </h2>
            {data.departments.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-xl text-center py-10">
                <p className="text-sm text-gray-500">You haven&apos;t been assigned to a department yet.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {data.departments.map(it => (
                  <div key={it.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 text-base">{it.name}</div>
                          {it.category && <div className="text-[10px] uppercase font-semibold tracking-wider text-gray-400 mt-0.5">{it.category}</div>}
                        </div>
                        <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700">
                          {it.role || 'member'}
                        </span>
                      </div>
                      {(it.description || it.purpose) && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{it.description || it.purpose}</p>
                      )}
                      {it.meeting_schedule && (
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                          <Calendar size={13} className="text-gray-400" /> {it.meeting_schedule}
                        </p>
                      )}
                      {it.joined_at && (
                        <p className="text-xs text-gray-400 mt-1">Joined {fmt(it.joined_at)}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-50">
                      <button
                        onClick={() => handleOpenChecklist(it)}
                        className="w-full py-2 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ClipboardCheck size={14} /> View Pre-Service Checklist
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Groups */}
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Users size={15} /> Community Groups
            </h2>
            {data.groups.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-xl text-center py-10">
                <p className="text-sm text-gray-500">You haven&apos;t joined any group yet.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {data.groups.map(it => (
                  <div key={it.id} className="bg-white border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900">{it.name}</div>
                        {it.category && <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">{it.category}</div>}
                      </div>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
                        {it.role || 'member'}
                      </span>
                    </div>
                    {(it.description || it.purpose) && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{it.description || it.purpose}</p>}
                    {it.meeting_schedule && <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><Calendar size={11} />{it.meeting_schedule}</p>}
                    {it.joined_at && <p className="text-xs text-gray-400 mt-2">Joined {fmt(it.joined_at)}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Pre-Service Checklist Modal for Member */}
      <Modal
        open={checklistModalOpen}
        onClose={() => setChecklistModalOpen(false)}
        title={selectedDept ? `${selectedDept.name} Pre-Service Checklist` : 'Service Checklist'}
        footer={
          <button onClick={() => setChecklistModalOpen(false)} className="btn-secondary text-xs">
            Close
          </button>
        }
      >
        {checklistLoading ? (
          <div className="py-12 text-center">
            <Loader2 size={24} className="animate-spin mx-auto text-brand-600 mb-2" />
            <p className="text-xs text-gray-500">Loading checklist duties…</p>
          </div>
        ) : !activeChecklist ? (
          <div className="py-10 text-center">
            <ClipboardCheck size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="font-semibold text-gray-800 text-sm">No Active Service Checklist</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
              Your unit head has not published a checklist for the upcoming service yet. Please check back before service day.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Service Summary Header */}
            <div className="bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-100 p-3.5 rounded-2xl">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900 text-sm">{activeChecklist.service_title}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {activeChecklist.status === 'published' ? 'Active Service' : activeChecklist.status}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5">
                <Calendar size={12} />
                {new Date(activeChecklist.service_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                {activeChecklist.service_time ? ` • ${activeChecklist.service_time}` : ''}
              </p>

              {/* Progress bar */}
              <div className="mt-3 pt-2 border-t border-brand-100/60">
                <div className="flex items-center justify-between text-xs text-gray-700 mb-1">
                  <span>Unit Readiness: <strong>{activeChecklist.completed_items || 0}</strong> of <strong>{activeChecklist.total_items || 0}</strong> ready</span>
                  <span className="font-bold">{activeChecklist.progress_pct || 0}%</span>
                </div>
                <div className="w-full bg-white rounded-full h-2 overflow-hidden border border-brand-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      (activeChecklist.progress_pct || 0) === 100
                        ? 'bg-emerald-500'
                        : (activeChecklist.progress_pct || 0) > 50
                        ? 'bg-brand-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${activeChecklist.progress_pct || 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Checklist tasks */}
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Operational Tasks & Duties
              </p>
              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto pr-1">
                {activeChecklist.items?.map(item => (
                  <div
                    key={item.id}
                    className={`py-3 px-2 rounded-xl transition-colors flex items-start gap-3 ${
                      item.is_assigned_to_me ? 'bg-indigo-50/50 border border-indigo-100 mb-1' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.is_completed}
                      onChange={() => handleToggleItem(item.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm ${item.is_completed ? 'line-through text-gray-400' : 'text-gray-900 font-medium'}`}>
                          {item.title}
                        </p>
                        {item.is_assigned_to_me && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-brand-600 text-white">
                            Assigned to You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-gray-100 text-gray-600 font-medium">
                          {item.category}
                        </span>
                        {item.is_completed && (
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={11} /> Ready
                          </span>
                        )}
                        {!item.is_assigned_to_me && item.assignee_first_name && (
                          <span className="text-[10px] text-gray-500">
                            Assigned to: {item.assignee_first_name} {item.assignee_last_name || ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
