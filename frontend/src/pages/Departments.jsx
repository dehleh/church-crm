import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Users, ChevronRight, Loader2, ArrowLeft, UserPlus, X,
  Mail, Phone, Calendar, Search, UserMinus, Crown, Trash2, AlertTriangle,
  CheckSquare, ClipboardCheck, Send, CheckCircle2, Clock, Sparkles, Check
} from 'lucide-react';
import { departmentsAPI, membersAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const CATEGORY_COLORS = {
  ministry: 'bg-brand-50 text-brand-700', unit: 'bg-emerald-50 text-emerald-700',
  admin: 'bg-gray-100 text-gray-600', media: 'bg-purple-50 text-purple-700',
  music: 'bg-amber-50 text-amber-700', welfare: 'bg-pink-50 text-pink-700',
};

const ROLE_BADGES = {
  leader: 'bg-amber-100 text-amber-700', assistant: 'bg-blue-50 text-blue-700',
  secretary: 'bg-emerald-50 text-emerald-700', member: 'bg-gray-100 text-gray-600',
};

const canManage = (role) => ['admin', 'head_pastor', 'pastor', 'director', 'hod'].includes(role);
const canDelete = (role) => ['admin', 'head_pastor', 'pastor', 'director'].includes(role);

// Date helpers for quick service scheduling
const getNextSunday = () => {
  const d = new Date();
  const diff = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
};

const getNextThursday = () => {
  const d = new Date();
  const diff = (4 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
};

const getNextWednesday = () => {
  const d = new Date();
  const diff = (3 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
};

// ── Department Detail View ──────────────────────────────────
function DepartmentDetail({ dept, onBack, onMemberChange, onDelete }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'checklists'

  // Member states
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [allMembers, setAllMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [addingId, setAddingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [addRole, setAddRole] = useState('member');

  // Checklist states
  const [checklists, setChecklists] = useState([]);
  const [checklistsLoading, setChecklistsLoading] = useState(false);
  const [showCreateChecklistModal, setShowCreateChecklistModal] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [presetItems, setPresetItems] = useState([]);
  const [presetLoading, setPresetLoading] = useState(false);
  const [newChecklistForm, setNewChecklistForm] = useState({
    serviceTitle: 'Sunday Celebration Service',
    serviceDate: getNextSunday(),
    serviceTime: '08:30 AM',
    usePresets: true,
    customNotes: '',
  });

  // Active Checklist Drawer / Modal
  const [activeChecklist, setActiveChecklist] = useState(null);
  const [activeChecklistLoading, setActiveChecklistLoading] = useState(false);
  const [showViewChecklistModal, setShowViewChecklistModal] = useState(false);
  const [newItemForm, setNewItemForm] = useState({ title: '', category: 'General', assignedMemberId: '' });
  const [addingItem, setAddingItem] = useState(false);

  // Broadcast Modal
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState(null);
  const [broadcastChannels, setBroadcastChannels] = useState(['in_app']);
  const [broadcastCustomNote, setBroadcastCustomNote] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await departmentsAPI.members(dept.id);
      setMembers(res.data.data);
    } catch { toast.error('Failed to load members'); }
    finally { setLoading(false); }
  }, [dept.id]);

  const fetchChecklists = useCallback(async () => {
    setChecklistsLoading(true);
    try {
      const res = await departmentsAPI.checklists(dept.id);
      setChecklists(res.data.data || []);
    } catch {
      toast.error('Failed to load checklists');
    } finally {
      setChecklistsLoading(false);
    }
  }, [dept.id]);

  const fetchPresets = useCallback(async () => {
    setPresetLoading(true);
    try {
      const res = await departmentsAPI.getPresets(dept.name || dept.category || 'general');
      setPresetItems(res.data.data || []);
    } catch {}
    finally { setPresetLoading(false); }
  }, [dept.name, dept.category]);

  useEffect(() => {
    fetchMembers();
    fetchChecklists();
    fetchPresets();
  }, [fetchMembers, fetchChecklists, fetchPresets]);

  const openAddModal = async () => {
    setShowAddModal(true);
    setSearchTerm('');
    setAddRole('member');
    try {
      const res = await membersAPI.list({ limit: 200 });
      setAllMembers(res.data.data);
    } catch { toast.error('Failed to load members list'); }
  };

  const handleAdd = async (memberId) => {
    setAddingId(memberId);
    try {
      await departmentsAPI.addMember(dept.id, { memberId, role: addRole });
      toast.success('Member added to department');
      fetchMembers();
      onMemberChange();
    } catch { toast.error('Failed to add member'); }
    finally { setAddingId(null); }
  };

  const handleRemove = async (memberId) => {
    setRemovingId(memberId);
    try {
      await departmentsAPI.removeMember(dept.id, memberId);
      toast.success('Member removed from department');
      setMembers(prev => prev.filter(m => m.id !== memberId));
      onMemberChange();
    } catch { toast.error('Failed to remove member'); }
    finally { setRemovingId(null); }
  };

  // Checklist Actions
  const handleOpenChecklist = async (cl) => {
    setShowViewChecklistModal(true);
    setActiveChecklistLoading(true);
    try {
      const res = await departmentsAPI.checklistDetails(dept.id, cl.id);
      setActiveChecklist(res.data.data);
    } catch {
      toast.error('Failed to load checklist details');
    } finally {
      setActiveChecklistLoading(false);
    }
  };

  const handleCreateChecklist = async () => {
    if (!newChecklistForm.serviceTitle) return toast.error('Service title is required');
    if (!newChecklistForm.serviceDate) return toast.error('Service date is required');
    setSavingChecklist(true);
    try {
      const payload = {
        serviceTitle: newChecklistForm.serviceTitle,
        serviceDate: newChecklistForm.serviceDate,
        serviceTime: newChecklistForm.serviceTime,
        notes: newChecklistForm.customNotes,
        initialItems: newChecklistForm.usePresets ? presetItems : [],
      };
      const res = await departmentsAPI.createChecklist(dept.id, payload);
      toast.success('Pre-service operational checklist created!');
      setShowCreateChecklistModal(false);
      fetchChecklists();
      if (res.data?.data) {
        handleOpenChecklist(res.data.data);
      }
    } catch {
      toast.error('Failed to create checklist');
    } finally {
      setSavingChecklist(false);
    }
  };

  const handleToggleItem = async (itemId, currentCompleted) => {
    try {
      // Optimistic update
      setActiveChecklist(prev => {
        if (!prev) return prev;
        const updatedItems = prev.items.map(it => it.id === itemId ? {
          ...it,
          is_completed: !currentCompleted,
          completed_at: !currentCompleted ? new Date().toISOString() : null,
          completed_by_user_id: !currentCompleted ? user?.id : null,
        } : it);
        const completedCount = updatedItems.filter(i => i.is_completed).length;
        return {
          ...prev,
          completed_items: completedCount,
          progress_pct: updatedItems.length ? Math.round((completedCount / updatedItems.length) * 100) : 0,
          items: updatedItems,
        };
      });

      await departmentsAPI.updateItem(dept.id, activeChecklist.id, itemId, { isCompleted: !currentCompleted });
      fetchChecklists();
    } catch {
      toast.error('Failed to update task status');
    }
  };

  const handleAddItem = async () => {
    if (!newItemForm.title) return toast.error('Task title is required');
    setAddingItem(true);
    try {
      const res = await departmentsAPI.addItem(dept.id, activeChecklist.id, {
        title: newItemForm.title,
        category: newItemForm.category || 'General',
        assignedMemberId: newItemForm.assignedMemberId || null,
        sortOrder: (activeChecklist.items?.length || 0) + 1,
      });
      toast.success('Task added');
      setNewItemForm({ title: '', category: 'General', assignedMemberId: '' });
      setActiveChecklist(prev => {
        const updated = [...(prev.items || []), res.data.data];
        const completedCount = updated.filter(i => i.is_completed).length;
        return {
          ...prev,
          total_items: updated.length,
          completed_items: completedCount,
          progress_pct: Math.round((completedCount / updated.length) * 100),
          items: updated,
        };
      });
      fetchChecklists();
    } catch {
      toast.error('Failed to add task');
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await departmentsAPI.deleteItem(dept.id, activeChecklist.id, itemId);
      setActiveChecklist(prev => {
        const updated = prev.items.filter(it => it.id !== itemId);
        const completedCount = updated.filter(i => i.is_completed).length;
        return {
          ...prev,
          total_items: updated.length,
          completed_items: completedCount,
          progress_pct: updated.length ? Math.round((completedCount / updated.length) * 100) : 0,
          items: updated,
        };
      });
      fetchChecklists();
      toast.success('Task removed');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleAssignItem = async (itemId, memberId) => {
    try {
      await departmentsAPI.updateItem(dept.id, activeChecklist.id, itemId, { assignedMemberId: memberId || null });
      const assigned = members.find(m => m.id === memberId);
      setActiveChecklist(prev => ({
        ...prev,
        items: prev.items.map(it => it.id === itemId ? {
          ...it,
          assigned_member_id: memberId,
          assignee_name: assigned ? `${assigned.first_name} ${assigned.last_name}` : null,
          assignee_first_name: assigned?.first_name || null,
          assignee_last_name: assigned?.last_name || null,
        } : it)
      }));
      toast.success('Task assignee updated');
    } catch {
      toast.error('Failed to assign member');
    }
  };

  const openBroadcast = (cl) => {
    setBroadcastTarget(cl);
    setBroadcastChannels(['in_app']);
    setBroadcastCustomNote('');
    setShowBroadcastModal(true);
  };

  const handleBroadcast = async () => {
    if (!broadcastChannels.length) return toast.error('Select at least one broadcast channel');
    setBroadcasting(true);
    try {
      const res = await departmentsAPI.broadcastChecklist(dept.id, broadcastTarget.id, {
        channels: broadcastChannels,
        customMessage: broadcastCustomNote || undefined,
      });
      toast.success(res.data.message || 'Checklist broadcasted to team!');
      setShowBroadcastModal(false);
      fetchChecklists();
      if (activeChecklist && activeChecklist.id === broadcastTarget.id) {
        setActiveChecklist(prev => ({ ...prev, status: 'published', broadcast_sent_at: new Date().toISOString() }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to broadcast checklist');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleDeleteChecklist = async (clId) => {
    if (!window.confirm('Are you sure you want to delete this service checklist?')) return;
    try {
      await departmentsAPI.deleteChecklist(dept.id, clId);
      toast.success('Checklist deleted');
      setChecklists(prev => prev.filter(c => c.id !== clId));
      if (activeChecklist?.id === clId) setShowViewChecklistModal(false);
    } catch {
      toast.error('Failed to delete checklist');
    }
  };

  const existingIds = new Set(members.map(m => m.id));
  const filteredForAdd = allMembers.filter(m =>
    !existingIds.has(m.id) &&
    (`${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (m.email || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-brand-600 text-sm mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Departments
      </button>

      {/* Header Card */}
      <div className="card mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{dept.name}</h1>
              {dept.category && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${CATEGORY_COLORS[dept.category] || 'bg-gray-100 text-gray-600'}`}>
                  {dept.category}
                </span>
              )}
            </div>
            {dept.description && <p className="text-gray-500 mb-3">{dept.description}</p>}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><Users size={14} /> {members.length} members</span>
              {dept.meeting_schedule && <span className="flex items-center gap-1.5"><Calendar size={14} /> {dept.meeting_schedule}</span>}
              {dept.branch_name && <span className="flex items-center gap-1.5"><Building2 size={14} /> {dept.branch_name}</span>}
            </div>
            {dept.head_name && (
              <p className="text-sm text-gray-600 mt-2 flex items-center gap-1.5">
                <Crown size={14} className="text-amber-500" />
                <span className="font-medium">Unit Head / HOD:</span> {dept.head_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canManage(user?.role) && (
              <button
                onClick={() => {
                  setNewChecklistForm({
                    serviceTitle: 'Sunday Celebration Service',
                    serviceDate: getNextSunday(),
                    serviceTime: '08:30 AM',
                    usePresets: true,
                    customNotes: '',
                  });
                  setShowCreateChecklistModal(true);
                }}
                className="btn-secondary flex items-center gap-1.5 border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100"
              >
                <ClipboardCheck size={16} /> + Service Checklist
              </button>
            )}
            {canManage(user?.role) && (
              <button onClick={openAddModal} className="btn-primary">
                <UserPlus size={16} /> Add Member
              </button>
            )}
            {canDelete(user?.role) && (
              <button onClick={() => onDelete(dept)} className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200">
                <Trash2 size={16} /> Delete Unit
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 mt-6 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 -mb-px ${
              activeTab === 'members'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Users size={16} />
            Unit Members
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {members.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('checklists')}
            className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 -mb-px ${
              activeTab === 'checklists'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <ClipboardCheck size={16} />
            Pre-Service Readiness Checklists
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-bold">
              {checklists.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: MEMBERS */}
      {activeTab === 'members' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Department Members</h2>
            <span className="text-xs text-gray-500">{members.length} active servants</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
          ) : members.length === 0 ? (
            <div className="text-center py-10">
              <Users size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No members in this department yet</p>
              {canManage(user?.role) && (
                <button onClick={openAddModal} className="btn-primary inline-flex mt-3"><UserPlus size={15} /> Add First Member</button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between py-3 group">
                  <div className="flex items-center gap-3">
                    {m.profile_photo_url ? (
                      <img src={m.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-semibold text-sm">
                        {m.first_name?.[0]}{m.last_name?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{m.first_name} {m.last_name}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {m.email && <span className="flex items-center gap-1"><Mail size={11} /> {m.email}</span>}
                        {m.phone && <span className="flex items-center gap-1"><Phone size={11} /> {m.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ROLE_BADGES[m.dept_role] || ROLE_BADGES.member}`}>
                      {m.dept_role || 'member'}
                    </span>
                    {canManage(user?.role) && (
                      <button onClick={() => handleRemove(m.id)} disabled={removingId === m.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Remove from department">
                        {removingId === m.id ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRE-SERVICE READINESS CHECKLISTS */}
      {activeTab === 'checklists' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-100 p-4 rounded-2xl">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ClipboardCheck className="text-brand-600" size={20} />
                Operational Service Readiness
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Plan equipment checks, audio/video feeds, stage prep, and volunteer duties before every service.
              </p>
            </div>
            {canManage(user?.role) && (
              <button
                onClick={() => {
                  setNewChecklistForm({
                    serviceTitle: 'Sunday Celebration Service',
                    serviceDate: getNextSunday(),
                    serviceTime: '08:30 AM',
                    usePresets: true,
                    customNotes: '',
                  });
                  setShowCreateChecklistModal(true);
                }}
                className="btn-primary text-xs shrink-0 flex items-center gap-1.5"
              >
                <Plus size={14} /> New Service Checklist
              </button>
            )}
          </div>

          {checklistsLoading ? (
            <div className="card text-center py-12">
              <Loader2 size={24} className="animate-spin mx-auto text-brand-600 mb-2" />
              <p className="text-xs text-gray-500">Loading service readiness checklists…</p>
            </div>
          ) : checklists.length === 0 ? (
            <div className="card text-center py-12">
              <ClipboardCheck size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="font-semibold text-gray-800">No Pre-Service Checklists Yet</p>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
                Unit heads draw up checklists for upcoming Sunday or Midweek services so all members know what to prepare.
              </p>
              {canManage(user?.role) && (
                <button
                  onClick={() => setShowCreateChecklistModal(true)}
                  className="btn-primary inline-flex text-xs items-center gap-1.5"
                >
                  <Plus size={14} /> Create First Checklist
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {checklists.map(cl => (
                <div
                  key={cl.id}
                  className="card hover:shadow-card-hover transition-all border border-gray-100 p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-base">{cl.service_title}</h3>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          cl.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : cl.status === 'completed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {cl.status === 'published' ? 'Published to Team' : cl.status}
                        </span>
                        {cl.broadcast_sent_at && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Send size={10} /> Broadcasted {new Date(cl.broadcast_sent_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} />
                          {new Date(cl.service_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {cl.service_time && (
                          <span className="flex items-center gap-1">
                            <Clock size={13} /> {cl.service_time}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenChecklist(cl)}
                        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 hover:border-brand-300 hover:text-brand-700"
                      >
                        <CheckSquare size={14} /> Open Checklist
                      </button>
                      {canManage(user?.role) && (
                        <button
                          onClick={() => openBroadcast(cl)}
                          className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                          title="Broadcast to Unit Members"
                        >
                          <Send size={13} /> Broadcast
                        </button>
                      )}
                      {canDelete(user?.role) && (
                        <button
                          onClick={() => handleDeleteChecklist(cl.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Checklist"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Readiness Progress Bar */}
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span className="font-medium">
                        Readiness: {cl.completed_items || 0} of {cl.total_items || 0} tasks ready
                      </span>
                      <span className="font-bold text-gray-800">
                        {cl.progress_pct || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          (cl.progress_pct || 0) === 100
                            ? 'bg-emerald-500'
                            : (cl.progress_pct || 0) > 50
                            ? 'bg-brand-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${cl.progress_pct || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD MEMBER */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Member to Department"
        footer={<button onClick={() => setShowAddModal(false)} className="btn-secondary">Close</button>}>
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search members by name or email…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div>
            <label className="label">Role in Department</label>
            <select className="input" value={addRole} onChange={e => setAddRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="leader">Leader</option>
              <option value="assistant">Assistant</option>
              <option value="secretary">Secretary</option>
            </select>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {filteredForAdd.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">
                {searchTerm ? 'No matching members found' : 'All members are already in this department'}
              </p>
            ) : filteredForAdd.map(m => (
              <div key={m.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-semibold text-xs">
                    {m.first_name?.[0]}{m.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.first_name} {m.last_name}</p>
                    <p className="text-xs text-gray-400">{m.email || m.phone || ''}</p>
                  </div>
                </div>
                <button onClick={() => handleAdd(m.id)} disabled={addingId === m.id}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                  {addingId === m.id ? <Loader2 size={14} className="animate-spin" /> : '+ Add'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* MODAL 2: CREATE PRE-SERVICE CHECKLIST */}
      <Modal
        open={showCreateChecklistModal}
        onClose={() => setShowCreateChecklistModal(false)}
        title={`New Pre-Service Checklist: ${dept.name}`}
        footer={
          <>
            <button onClick={() => setShowCreateChecklistModal(false)} className="btn-secondary" disabled={savingChecklist}>
              Cancel
            </button>
            <button onClick={handleCreateChecklist} disabled={savingChecklist} className="btn-primary flex items-center gap-1.5">
              {savingChecklist ? <Loader2 size={15} className="animate-spin" /> : <ClipboardCheck size={15} />}
              Create Checklist
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Service Title *</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {[
                { title: 'Sunday Celebration Service', date: getNextSunday() },
                { title: 'Midweek Service (Thursday)', date: getNextThursday() },
                { title: 'Midweek Service (Wednesday)', date: getNextWednesday() },
                { title: 'Special Service / Night of Worship', date: getNextSunday() },
              ].map(opt => (
                <button
                  key={opt.title}
                  type="button"
                  onClick={() => setNewChecklistForm(f => ({ ...f, serviceTitle: opt.title, serviceDate: opt.date }))}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    newChecklistForm.serviceTitle === opt.title
                      ? 'bg-brand-50 border-brand-300 text-brand-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.title}
                </button>
              ))}
            </div>
            <input
              className="input"
              placeholder="e.g. Sunday Celebration Service"
              value={newChecklistForm.serviceTitle}
              onChange={e => setNewChecklistForm(f => ({ ...f, serviceTitle: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Service Date *</label>
              <input
                type="date"
                className="input"
                value={newChecklistForm.serviceDate}
                onChange={e => setNewChecklistForm(f => ({ ...f, serviceDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Expected Time</label>
              <input
                type="text"
                className="input"
                placeholder="08:30 AM"
                value={newChecklistForm.serviceTime}
                onChange={e => setNewChecklistForm(f => ({ ...f, serviceTime: e.target.value }))}
              />
            </div>
          </div>

          {/* Preset Tasks Toggle */}
          <div className="p-3 bg-brand-50/60 border border-brand-100 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-brand-900">
                <input
                  type="checkbox"
                  checked={newChecklistForm.usePresets}
                  onChange={e => setNewChecklistForm(f => ({ ...f, usePresets: e.target.checked }))}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <Sparkles size={16} className="text-brand-600" />
                Auto-populate recommended checklist for {dept.name}
              </label>
              <span className="text-xs text-brand-600 font-medium">
                {presetItems.length} tasks ready
              </span>
            </div>
            {newChecklistForm.usePresets && (
              <div className="text-xs text-gray-600 space-y-1 pt-1 max-h-36 overflow-y-auto pl-6">
                {presetLoading ? (
                  <p className="text-gray-400">Loading recommended unit presets…</p>
                ) : (
                  presetItems.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                      <Check size={12} className="text-brand-600 shrink-0" />
                      <span>{p.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-gray-500 border border-gray-200">
                        {p.category}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label className="label">HOD Notes / Special Instructions</label>
            <textarea
              className="input min-h-[60px]"
              placeholder="e.g. Please arrive 45 minutes before service for setup and briefing."
              value={newChecklistForm.customNotes}
              onChange={e => setNewChecklistForm(f => ({ ...f, customNotes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 3: CHECKLIST VIEWER & TASK RUNNER */}
      <Modal
        open={showViewChecklistModal}
        onClose={() => setShowViewChecklistModal(false)}
        title={activeChecklist ? `${activeChecklist.service_title} Readiness` : 'Checklist'}
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => {
                if (activeChecklist) openBroadcast(activeChecklist);
              }}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Send size={14} /> Broadcast to Unit Members
            </button>
            <button onClick={() => setShowViewChecklistModal(false)} className="btn-secondary text-xs">
              Close
            </button>
          </div>
        }
      >
        {activeChecklistLoading ? (
          <div className="py-12 text-center">
            <Loader2 size={24} className="animate-spin mx-auto text-brand-600 mb-2" />
            <p className="text-xs text-gray-500">Loading checklist tasks…</p>
          </div>
        ) : activeChecklist ? (
          <div className="space-y-4">
            {/* Header Status Gauge */}
            <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">
                  {new Date(activeChecklist.service_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  {activeChecklist.service_time ? ` • ${activeChecklist.service_time}` : ''}
                </p>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">
                  {activeChecklist.completed_items || 0} of {activeChecklist.total_items || 0} tasks ready ({activeChecklist.progress_pct || 0}%)
                </p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold capitalize ${
                activeChecklist.status === 'published'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-200 text-gray-800'
              }`}>
                {activeChecklist.status === 'published' ? 'Published' : activeChecklist.status}
              </span>
            </div>

            {/* Inline Add Task Form */}
            {canManage(user?.role) && (
              <div className="p-3 bg-brand-50/50 border border-brand-100 rounded-xl space-y-2">
                <p className="text-xs font-bold text-gray-700">Add New Unit Task</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="input text-xs flex-1"
                    placeholder="e.g. Check spare wireless mic batteries…"
                    value={newItemForm.title}
                    onChange={e => setNewItemForm(f => ({ ...f, title: e.target.value }))}
                  />
                  <select
                    className="input text-xs sm:w-32"
                    value={newItemForm.category}
                    onChange={e => setNewItemForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {['Equipment', 'Streaming', 'Audio', 'Sanctuary', 'Safety', 'Logistics', 'Hospitality', 'General'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    className="input text-xs sm:w-36"
                    value={newItemForm.assignedMemberId}
                    onChange={e => setNewItemForm(f => ({ ...f, assignedMemberId: e.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddItem}
                    disabled={addingItem}
                    className="btn-primary text-xs shrink-0 px-3 py-1.5"
                  >
                    {addingItem ? <Loader2 size={13} className="animate-spin" /> : '+ Add'}
                  </button>
                </div>
              </div>
            )}

            {/* Checklist Tasks List */}
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto pr-1">
              {(!activeChecklist.items || activeChecklist.items.length === 0) ? (
                <p className="text-center text-xs text-gray-400 py-6">
                  No tasks added to this checklist yet. Use the form above to add tasks.
                </p>
              ) : (
                activeChecklist.items.map(item => (
                  <div key={item.id} className="py-2.5 flex items-start justify-between gap-3 group">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        onChange={() => handleToggleItem(item.id, item.is_completed)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <p className={`text-sm ${item.is_completed ? 'line-through text-gray-400 font-normal' : 'text-gray-900 font-medium'}`}>
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-gray-100 text-gray-600 font-medium">
                            {item.category}
                          </span>
                          {item.is_completed && (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={11} /> Ready
                            </span>
                          )}
                          {item.assignee_name && (
                            <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.2 rounded-full">
                              Assigned: {item.assignee_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Assignee Dropdown */}
                      <select
                        className="text-[11px] py-1 px-2 border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        value={item.assigned_member_id || ''}
                        onChange={e => handleAssignItem(item.id, e.target.value)}
                      >
                        <option value="">Assign member…</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                        ))}
                      </select>
                      {canManage(user?.role) && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-opacity"
                          title="Delete task"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* MODAL 4: BROADCAST CHECKLIST TO TEAM */}
      <Modal
        open={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        title={`Broadcast Checklist: ${dept.name}`}
        footer={
          <>
            <button onClick={() => setShowBroadcastModal(false)} className="btn-secondary" disabled={broadcasting}>
              Cancel
            </button>
            <button onClick={handleBroadcast} disabled={broadcasting} className="btn-primary flex items-center gap-1.5">
              {broadcasting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Send Broadcast to {members.length} Members
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-xs text-brand-900">
            <p className="font-semibold">Dispatching pre-service tasks to all active unit members</p>
            <p className="mt-0.5 text-brand-700">
              Every member of <strong>{dept.name}</strong> will receive notification of their roles and checklist items for <strong>{broadcastTarget?.service_title}</strong>.
            </p>
          </div>

          <div>
            <label className="label">Delivery Channels</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { id: 'in_app', label: 'In-App & Push Notification' },
                { id: 'whatsapp', label: 'WhatsApp Message' },
                { id: 'sms', label: 'SMS Text Message' },
                { id: 'email', label: 'Email Broadcast' },
              ].map(ch => (
                <label key={ch.id} className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 text-xs">
                  <input
                    type="checkbox"
                    checked={broadcastChannels.includes(ch.id)}
                    onChange={e => {
                      if (e.target.checked) setBroadcastChannels(c => [...c, ch.id]);
                      else setBroadcastChannels(c => c.filter(x => x !== ch.id));
                    }}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="font-medium text-gray-700">{ch.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Additional Custom Note / Briefing (Optional)</label>
            <textarea
              className="input min-h-[80px] text-xs"
              placeholder="e.g. Team call time is 7:30 AM prompt for sound check and corporate prayer. Let's make it count!"
              value={broadcastCustomNote}
              onChange={e => setBroadcastCustomNote(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Main Departments Page ───────────────────────────────────
export default function Departments() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteDept, setDeleteDept] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [allMembers, setAllMembers] = useState([]);

  const fetchMembers = async () => {
    try { const res = await membersAPI.list({ limit: 500 }); setAllMembers(res.data.data || []); } catch {}
  };

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const res = await departmentsAPI.list();
      setDepartments(res.data.data);
    } catch { toast.error('Failed to load departments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDepts(); fetchMembers(); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name) return toast.error('Department name is required');
    setSaving(true);
    try {
      await departmentsAPI.create(form);
      toast.success('Department created!');
      setModal(null); fetchDepts();
    } catch { toast.error('Failed to create department'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteDept) return;
    setDeleting(true);
    try {
      await departmentsAPI.delete(deleteDept.id);
      toast.success(`Unit "${deleteDept.name}" deleted`);
      setDeleteDept(null);
      if (selectedDept?.id === deleteDept.id) setSelectedDept(null);
      fetchDepts();
    } catch {
      toast.error('Failed to delete department / unit');
    } finally {
      setDeleting(false);
    }
  };

  // If a department is selected, show its detail view
  if (selectedDept) {
    return (
      <DepartmentDetail
        dept={selectedDept}
        onBack={() => { setSelectedDept(null); fetchDepts(); }}
        onMemberChange={fetchDepts}
        onDelete={(dept) => setDeleteDept(dept)}
      />
    );
  }

  const grouped = departments.reduce((acc, d) => {
    const cat = d.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(d);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Departments & Units</h1>
          <p className="text-gray-500 text-sm mt-1">{departments.length} departments across the church</p>
        </div>
        <button onClick={() => { setForm({}); setModal('add'); }} className="btn-primary">
          <Plus size={16} /> New Department
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : departments.length === 0 ? (
        <div className="text-center py-20">
          <Building2 size={44} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No departments yet</p>
          <p className="text-gray-400 text-sm mb-4">Create departments like Choir, Ushering, Media, etc.</p>
          <button onClick={() => { setForm({}); setModal('add'); }} className="btn-primary inline-flex"><Plus size={15} /> New Department</button>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, depts]) => (
          <div key={cat} className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3 capitalize">{cat}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {depts.map(dept => (
                <div key={dept.id} onClick={() => setSelectedDept(dept)}
                  className="card hover:shadow-card-hover transition-shadow cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{dept.name}</h3>
                      {dept.category && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block capitalize ${CATEGORY_COLORS[dept.category] || 'bg-gray-100 text-gray-600'}`}>
                          {dept.category}
                        </span>
                      )}
                    </div>
                    {dept.head_name ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full shrink-0">
                        <Crown size={12} /> {dept.head_name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 italic">No HOD</span>
                    )}
                  </div>
                  {dept.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{dept.description}</p>}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                      <Users size={14} />
                      <span>{dept.member_count || 0} members</span>
                    </div>
                    {canDelete(user?.role) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteDept(dept); }}
                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Delete Unit"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {dept.branch_name && <p className="text-xs text-gray-400 mt-1">{dept.branch_name}</p>}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Create Department"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Create'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Department Name *</label><input className="input" placeholder="Choir, Ushering, Media Team…" value={form.name || ''} onChange={set('name')} /></div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category || ''} onChange={set('category')}>
              <option value="">Select category</option>
              {['ministry','unit','admin','media','music','welfare'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Head of Department (HOD)</label>
            <select className="input" value={form.headMemberId || ''} onChange={set('headMemberId')}>
              <option value="">Select HOD</option>
              {allMembers.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
            </select>
          </div>
          <div><label className="label">Meeting Schedule</label><input className="input" placeholder="Every Sunday, 8am" value={form.meetingSchedule || ''} onChange={set('meetingSchedule')} /></div>
          <div><label className="label">Description</label><textarea className="input min-h-[80px]" value={form.description || ''} onChange={set('description')} /></div>
        </div>
      </Modal>

      {/* Delete Unit Confirmation Modal */}
      <Modal
        open={Boolean(deleteDept)}
        onClose={() => setDeleteDept(null)}
        title="Delete Unit / Department"
        footer={
          <>
            <button onClick={() => setDeleteDept(null)} className="btn-secondary" disabled={deleting}>
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-2"
            >
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              Confirm Delete
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-red-900">
              <p className="font-semibold">Are you sure you want to delete this unit?</p>
              <p className="mt-1 text-red-700">
                You are about to delete <strong>{deleteDept?.name}</strong>. Members assigned to this unit will be unassigned.
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            This operation safely archives and deactivates the unit from the active roster.
          </p>
        </div>
      </Modal>
    </div>
  );
}
