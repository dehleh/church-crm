import { useState, useEffect } from 'react';
import { Users2, Plus, Users, ChevronRight, Loader2, X, UserPlus, Trash2 } from 'lucide-react';
import { groupsAPI, membersAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const GROUP_COLORS = [
  'bg-brand-50 text-brand-700 border-brand-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-pink-50 text-pink-700 border-pink-200',
  'bg-sky-50 text-sky-700 border-sky-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-teal-50 text-teal-700 border-teal-200',
];

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [allMembers, setAllMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await groupsAPI.list();
      setGroups(res.data.data);
    } catch { toast.error('Failed to load groups'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGroups(); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name) return toast.error('Group name is required');
    setSaving(true);
    try {
      if (modal === 'edit') {
        await groupsAPI.update(selectedGroup.id, form);
        toast.success('Group updated!');
      } else {
        await groupsAPI.create(form);
        toast.success('Group created!');
      }
      setModal(null); fetchGroups();
    } catch { toast.error('Failed to save group'); }
    finally { setSaving(false); }
  };

  const openGroupDetail = async (group) => {
    setSelectedGroup(group);
    setModal('detail');
    setMembersLoading(true);
    try {
      const [membersRes, allRes] = await Promise.all([
        groupsAPI.members(group.id),
        membersAPI.list({ limit: 500 }),
      ]);
      setGroupMembers(membersRes.data.data);
      setAllMembers(allRes.data.data);
    } catch { toast.error('Failed to load group members'); }
    finally { setMembersLoading(false); }
  };

  const openEdit = (group) => {
    setSelectedGroup(group);
    setForm({ name: group.name, description: group.description || '', purpose: group.purpose || '', meetingSchedule: group.meeting_schedule || '' });
    setModal('edit');
  };

  const handleAddMember = async (memberId) => {
    setAddingMember(true);
    try {
      await groupsAPI.addMember(selectedGroup.id, { memberId });
      toast.success('Member added!');
      const res = await groupsAPI.members(selectedGroup.id);
      setGroupMembers(res.data.data);
      fetchGroups();
    } catch { toast.error('Failed to add member'); }
    finally { setAddingMember(false); setMemberSearch(''); }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await groupsAPI.removeMember(selectedGroup.id, memberId);
      toast.success('Member removed');
      setGroupMembers(prev => prev.filter(m => m.id !== memberId));
      fetchGroups();
    } catch { toast.error('Failed to remove member'); }
  };

  const groupMemberIds = new Set(groupMembers.map(m => m.id));
  const filteredMembers = allMembers.filter(m =>
    !groupMemberIds.has(m.id) &&
    (`${m.first_name} ${m.last_name}`).toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Groups & Tribes</h1>
          <p className="text-gray-500 text-sm mt-1">{groups.length} extra-curricular groups bringing members together</p>
        </div>
        <button onClick={() => { setForm({}); setModal('add'); }} className="btn-primary">
          <Plus size={16} /> New Group
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20">
          <Users2 size={44} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No groups yet</p>
          <p className="text-gray-400 text-sm mb-4">Create interest-based groups like tribes, networks, collectives…</p>
          <button onClick={() => { setForm({}); setModal('add'); }} className="btn-primary inline-flex"><Plus size={15} /> New Group</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group, i) => (
            <div key={group.id} onClick={() => openGroupDetail(group)}
              className="card hover:shadow-card-hover transition-shadow cursor-pointer group border">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors truncate">{group.name}</h3>
                  {group.purpose && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${GROUP_COLORS[i % GROUP_COLORS.length]}`}>
                      {group.purpose.length > 40 ? group.purpose.slice(0, 40) + '…' : group.purpose}
                    </span>
                  )}
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-brand-600 transition-colors mt-1 flex-shrink-0" />
              </div>
              {group.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{group.description}</p>}
              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                  <Users size={14} />
                  <span>{group.member_count || 0} members</span>
                </div>
                {group.leader_name && <p className="text-xs text-gray-400">Lead: {group.leader_name}</p>}
              </div>
              {group.meeting_schedule && <p className="text-xs text-gray-400 mt-1">{group.meeting_schedule}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit Group' : 'Create Group'}
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : modal === 'edit' ? 'Save' : 'Create'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Group Name *</label><input className="input" placeholder="e.g. Thrive Network, Conclave Tribe…" value={form.name || ''} onChange={set('name')} /></div>
          <div><label className="label">Purpose / Tagline</label><input className="input" placeholder="What this group is about" value={form.purpose || ''} onChange={set('purpose')} /></div>
          <div><label className="label">Meeting Schedule</label><input className="input" placeholder="e.g. Every 2nd Saturday, 10am" value={form.meetingSchedule || ''} onChange={set('meetingSchedule')} /></div>
          <div><label className="label">Description</label><textarea className="input min-h-[80px]" placeholder="Detailed description of the group's mission" value={form.description || ''} onChange={set('description')} /></div>
        </div>
      </Modal>

      {/* Group Detail / Members Modal */}
      <Modal open={modal === 'detail'} onClose={() => { setModal(null); setSelectedGroup(null); setGroupMembers([]); setMemberSearch(''); }}
        title={selectedGroup?.name || 'Group Details'}>
        {selectedGroup && (
          <div className="space-y-4">
            {selectedGroup.purpose && (
              <p className="text-sm text-brand-600 font-medium bg-brand-50 px-3 py-2 rounded-lg">{selectedGroup.purpose}</p>
            )}
            {selectedGroup.description && <p className="text-sm text-gray-500">{selectedGroup.description}</p>}
            {selectedGroup.meeting_schedule && (
              <p className="text-xs text-gray-400">Schedule: {selectedGroup.meeting_schedule}</p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <h4 className="font-semibold text-sm text-gray-700">Members ({groupMembers.length})</h4>
              <button onClick={() => openEdit(selectedGroup)} className="text-xs text-brand-600 hover:underline">Edit Group</button>
            </div>

            {/* Add member search */}
            <div className="relative">
              <input className="input text-sm" placeholder="Search members to add…" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
              {memberSearch && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredMembers.length === 0 ? (
                    <p className="text-xs text-gray-400 p-3">No members found</p>
                  ) : (
                    filteredMembers.slice(0, 8).map(m => (
                      <button key={m.id} onClick={() => handleAddMember(m.id)} disabled={addingMember}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-brand-50 text-left transition-colors text-sm">
                        <UserPlus size={14} className="text-brand-500 flex-shrink-0" />
                        <span>{m.first_name} {m.last_name}</span>
                        <span className="text-xs text-gray-400 ml-auto">{m.phone}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Member list */}
            {membersLoading ? (
              <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-brand-500" /></div>
            ) : groupMembers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No members yet. Search above to add members.</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {groupMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                        {(m.first_name?.[0] || '') + (m.last_name?.[0] || '')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.first_name} {m.last_name}</p>
                        {m.group_role && m.group_role !== 'member' && (
                          <span className="text-xs text-brand-600 capitalize">{m.group_role}</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleRemoveMember(m.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Remove">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
