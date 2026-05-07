import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, tasksAPI, usersAPI, commentsAPI } from '../services/api';
import { useAuth, useProjectRole, canManageTasks, canManageMembers, canChangeRoles, canDeleteProject } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format, parseISO, isAfter } from 'date-fns';

const PRIORITIES = ['low','medium','high','critical'];
const STATUSES = ['todo','in_progress','review','done'];
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'In Review', done: 'Done' };
const STATUS_COLORS = { todo: '#8888bb', in_progress: '#38b2f4', review: '#f7971e', done: '#43e97b' };

const RoleBadge = ({ role }) => {
  const colors = {
    owner: { bg: 'rgba(108,99,255,0.2)', color: '#a78bfa', label: 'Owner' },
    admin: { bg: 'rgba(247,151,30,0.2)', color: '#f7971e', label: 'Admin' },
    member: { bg: 'rgba(136,136,187,0.15)', color: '#8888bb', label: 'Member' },
  };
  const c = colors[role] || colors.member;
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: 10, fontWeight: 700, padding: '2px 7px',
      borderRadius: 20, letterSpacing: '0.5px', textTransform: 'uppercase',
    }}>{c.label}</span>
  );
};

function TaskModal({ onClose, onSave, project, users, existing, isAdmin }) {
  const [form, setForm] = useState({
    title: existing?.title || '',
    description: existing?.description || '',
    status: existing?.status || 'todo',
    priority: existing?.priority || 'medium',
    due_date: existing?.due_date ? existing.due_date.split('T')[0] : '',
    assigned_to_id: existing?.assigned_to?.id || '',
    tags: existing?.tags || '',
    estimated_hours: existing?.estimated_hours || '',
    project: project.id,
  });
  const [loading, setLoading] = useState(false);
  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Task title is required');
    setLoading(true);
    const payload = { ...form };
    if (!payload.assigned_to_id) delete payload.assigned_to_id;
    if (!payload.due_date) delete payload.due_date;
    if (!payload.estimated_hours) delete payload.estimated_hours;
    try {
      if (existing?.id) {
        await tasksAPI.update(existing.id, payload);
        toast.success('Task updated!');
      } else {
        await tasksAPI.create(payload);
        toast.success('Task created!');
      }
      onSave(); onClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save task';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const allUsers = [{ id: '', username: 'Unassigned', first_name: '', last_name: '' }, ...users];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title">{existing?.id ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Task Title *</label>
              <input name="title" value={form.title} onChange={handle} className="form-input" placeholder="What needs to be done?" required
                readOnly={!isAdmin && !!existing?.id} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea name="description" value={form.description} onChange={handle} className="form-textarea" placeholder="Add more details..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" value={form.status} onChange={handle} className="form-select">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select name="priority" value={form.priority} onChange={handle} className="form-select" disabled={!isAdmin && !!existing?.id}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            {isAdmin && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input name="due_date" type="date" value={form.due_date} onChange={handle} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Est. Hours</label>
                    <input name="estimated_hours" type="number" min="0" step="0.5" value={form.estimated_hours} onChange={handle} className="form-input" placeholder="0" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Assign To</label>
                  <select name="assigned_to_id" value={form.assigned_to_id} onChange={handle} className="form-select">
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name ? `${u.first_name} ${u.last_name}` : u.username}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">Tags (comma separated)</label>
              <input name="tags" value={form.tags} onChange={handle} className="form-input" placeholder="design, urgent, backend" />
            </div>
            {!isAdmin && existing?.id && (
              <div style={{ background: 'rgba(247,151,30,0.1)', border: '1px solid rgba(247,151,30,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#f7971e' }}>
                ⚠️ As a member, you can update status, description, and tags. Only project admins can change title, priority, assignee, or due date.
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : null}
              {existing?.id ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MembersPanel({ project, onUpdate, callerRole }) {
  const [allUsers, setAllUsers] = useState([]);
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const canManage = canManageMembers(callerRole);
  const canChangeRole = canChangeRoles(callerRole);

  useEffect(() => { usersAPI.list().then(r => setAllUsers(r.data)); }, []);

  const ownerAndMembers = [
    { ...project.owner, project_role: 'owner' },
    ...(project.members || []),
  ].filter((u, i, a) => a.findIndex(x => x.id === u.id) === i);

  const addMember = async () => {
    if (!addUserId) return;
    setLoading(true);
    try {
      await projectsAPI.addMember(project.id, addUserId, addRole);
      toast.success('Member added!');
      onUpdate();
      setAddUserId('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally { setLoading(false); }
  };

  const removeMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await projectsAPI.removeMember(project.id, userId);
      toast.success('Member removed');
      onUpdate();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to remove'); }
  };

  const changeRole = async (userId, role) => {
    try {
      await projectsAPI.changeMemberRole(project.id, userId, role);
      toast.success(`Role updated to ${role}`);
      onUpdate();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update role'); }
  };

  const existingIds = new Set(ownerAndMembers.map(m => m.id));
  const available = allUsers.filter(u => !existingIds.has(u.id));

  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Team Members</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: canManage ? 20 : 0 }}>
        {ownerAndMembers.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
              {(m.first_name?.[0] || m.username[0]).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {m.first_name ? `${m.first_name} ${m.last_name}` : m.username}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.email}</div>
            </div>
            <RoleBadge role={m.project_role} />
            {canChangeRole && m.project_role !== 'owner' && (
              <select
                value={m.project_role}
                onChange={e => changeRole(m.id, e.target.value)}
                className="form-select"
                style={{ width: 90, padding: '4px 8px', fontSize: 11 }}
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
            )}
            {canManage && m.project_role !== 'owner' && (
              <button
                onClick={() => removeMember(m.id)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '4px 8px', color: 'var(--danger)', fontSize: 11 }}
              >Remove</button>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add Member</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={addUserId} onChange={e => setAddUserId(e.target.value)} className="form-select" style={{ flex: 1 }}>
              <option value="">Select user...</option>
              {available.map(u => (
                <option key={u.id} value={u.id}>
                  {u.first_name ? `${u.first_name} ${u.last_name}` : u.username}
                </option>
              ))}
            </select>
            <select value={addRole} onChange={e => setAddRole(e.target.value)} className="form-select" style={{ width: 100 }}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={addMember} disabled={!addUserId || loading} className="btn btn-primary btn-sm">
              {loading ? <span className="spinner" style={{ borderTopColor: 'white', width: 14, height: 14 }} /> : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskDetailModal({ task, onClose, onSave, onStatusChange, isAdmin }) {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localTask, setLocalTask] = useState(task);
  const canEdit = isAdmin ||
    localTask.assigned_to?.id === user?.id ||
    localTask.created_by?.id === user?.id;

  const addComment = async e => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await commentsAPI.create({ task: task.id, content: comment });
      const updated = await tasksAPI.get(task.id);
      setLocalTask(updated.data);
      setComment('');
      onSave();
    } catch { toast.error('Failed to add comment'); }
    finally { setSubmitting(false); }
  };

  const changeStatus = async (newStatus) => {
    if (!canEdit) return toast.error('You do not have permission to change this task status');
    try {
      await tasksAPI.update(task.id, { status: newStatus, project: task.project });
      setLocalTask(t => ({ ...t, status: newStatus }));
      onStatusChange();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update status'); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slide-up" style={{ maxWidth: 640 }}>
        <div className="modal-header" style={{ paddingBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span className={`badge badge-${localTask.status}`}>{STATUS_LABELS[localTask.status]}</span>
              <span className={`badge badge-${localTask.priority}`}>{localTask.priority}</span>
            </div>
            <h2 className="modal-title" style={{ fontSize: 18 }}>{localTask.title}</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>
        <div className="modal-body" style={{ paddingTop: 0 }}>
          {localTask.description && (
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>{localTask.description}</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {localTask.assigned_to && (
              <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Assigned To</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {localTask.assigned_to.first_name ? `${localTask.assigned_to.first_name} ${localTask.assigned_to.last_name}` : localTask.assigned_to.username}
                </div>
              </div>
            )}
            {localTask.due_date && (
              <div style={{ background: isAfter(new Date(), parseISO(localTask.due_date)) && localTask.status !== 'done' ? 'rgba(255,101,132,0.1)' : 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Due Date</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: isAfter(new Date(), parseISO(localTask.due_date)) && localTask.status !== 'done' ? 'var(--danger)' : undefined }}>
                  {format(parseISO(localTask.due_date), 'MMM d, yyyy')}
                  {isAfter(new Date(), parseISO(localTask.due_date)) && localTask.status !== 'done' && ' ⚠️ Overdue'}
                </div>
              </div>
            )}
            {localTask.estimated_hours && (
              <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Est. Hours</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{localTask.estimated_hours}h</div>
              </div>
            )}
            <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Created</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{format(parseISO(localTask.created_at), 'MMM d, yyyy')}</div>
            </div>
          </div>

          {localTask.tags_list?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              {localTask.tags_list.map(tag => <span key={tag} className="tag">#{tag}</span>)}
            </div>
          )}

          {canEdit && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Move to</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {STATUSES.filter(s => s !== localTask.status).map(s => (
                  <button key={s} onClick={() => changeStatus(s)} className="btn btn-secondary btn-sm">{STATUS_LABELS[s]}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
              Comments ({localTask.comments?.length || 0})
            </div>
            {localTask.comments?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {localTask.comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                    <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>
                      {(c.author.first_name?.[0] || c.author.username[0]).toUpperCase()}
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '10px 14px', flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                        {c.author.first_name ? `${c.author.first_name} ${c.author.last_name}` : c.author.username}
                        <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                          {format(parseISO(c.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{c.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={addComment} style={{ display: 'flex', gap: 10 }}>
              <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>
                {((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '') || user?.username?.[0] || '?').toUpperCase()}
              </div>
              <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                <input value={comment} onChange={e => setComment(e.target.value)} className="form-input" placeholder="Add a comment..." style={{ flex: 1 }} />
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !comment.trim()}>
                  {submitting ? <span className="spinner" style={{ borderTopColor: 'white', width: 14, height: 14 }} /> : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [viewTask, setViewTask] = useState(null);
  const [defaultStatus, setDefaultStatus] = useState('todo');
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [activeTab, setActiveTab] = useState('board');

  const callerRole = useProjectRole(project);
  const isAdmin = canManageTasks(callerRole);
  const canDelete = canDeleteProject(callerRole);

  const load = useCallback(() => {
    Promise.all([projectsAPI.get(id), usersAPI.list()]).then(([p, u]) => {
      setProject(p.data);
      setUsers(u.data);
    }).catch(() => navigate('/projects')).finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteProject = async () => {
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    try {
      await projectsAPI.delete(id);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete'); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasksAPI.delete(taskId);
      toast.success('Task deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete task'); }
  };

  const handleDragStart = (e, task) => {
    setDragging(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, status) => {
    e.preventDefault();
    if (!dragging || dragging.status === status) { setDragOver(null); setDragging(null); return; }
    if (!isAdmin && dragging.assigned_to?.id !== user?.id && dragging.created_by?.id !== user?.id) {
      toast.error('Only admins or the task creator/assignee can move tasks');
      setDragOver(null); setDragging(null); return;
    }
    try {
      await tasksAPI.update(dragging.id, { status, project: id });
      toast.success(`Moved to ${STATUS_LABELS[status]}`);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to move task'); }
    setDragOver(null); setDragging(null);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, borderTopColor: 'var(--accent)' }} />
    </div>
  );

  if (!project) return null;

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = project.tasks?.filter(t => t.status === s) || [];
    return acc;
  }, {});

  const projectMembers = [
    project.owner,
    ...(project.members || []),
  ].filter((u, i, a) => u && a.findIndex(x => x?.id === u?.id) === i);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ marginBottom: 16, padding: '4px 0', color: 'var(--text-muted)' }}>
          ← All Projects
        </button>
        <div className="page-header" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: project.color, boxShadow: `0 0 12px ${project.color}`, flexShrink: 0 }} />
            <div>
              <h1 className="page-title" style={{ fontSize: 22 }}>{project.name}</h1>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`badge badge-${project.status}`}>{project.status.replace('_', ' ')}</span>
                <span className={`badge badge-${project.priority}`}>{project.priority} priority</span>
                <RoleBadge role={callerRole} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  by {project.owner?.first_name ? `${project.owner.first_name} ${project.owner.last_name}` : project.owner?.username}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowMembers(s => !s)}>
              👥 Team ({(project.members?.length || 0) + 1})
            </button>
            {isAdmin && (
              <button className="btn btn-primary" onClick={() => { setEditTask(null); setDefaultStatus('todo'); setShowTaskModal(true); }}>
                + Add Task
              </button>
            )}
            {canDelete && (
              <button className="btn btn-danger btn-sm" onClick={handleDeleteProject} title="Delete project">🗑</button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {project.completed_task_count} of {project.task_count} tasks completed
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: project.color }}>{project.progress}%</span>
          </div>
          <div className="progress-bar" style={{ height: 7 }}>
            <div className="progress-fill" style={{ width: `${project.progress}%`, background: `linear-gradient(90deg, ${project.color}, ${project.color}99)` }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s], display: 'inline-block' }} />
                <span style={{ color: 'var(--text-muted)' }}>{STATUS_LABELS[s]}</span>
                <span style={{ fontWeight: 700 }}>{tasksByStatus[s].length}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Members Panel */}
      {showMembers && (
        <div style={{ marginBottom: 24 }}>
          <MembersPanel project={project} onUpdate={load} callerRole={callerRole} />
        </div>
      )}

      {/* Access info for members */}
      {callerRole === 'member' && (
        <div style={{ background: 'rgba(56,178,244,0.08)', border: '1px solid rgba(56,178,244,0.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 12, color: '#38b2f4', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>ℹ️</span>
          <span>You're a <strong>Member</strong> of this project. You can view and update status of tasks assigned to you or created by you. Project admins manage task creation and assignments.</span>
        </div>
      )}

      {/* Kanban Board */}
      <div className="kanban-board">
        {STATUSES.map(status => (
          <div
            key={status}
            className="kanban-col"
            style={{ borderTop: `3px solid ${STATUS_COLORS[status]}`, background: dragOver === status ? 'rgba(108,99,255,0.05)' : undefined }}
            onDragOver={e => { e.preventDefault(); setDragOver(status); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => handleDrop(e, status)}
          >
            <div className="kanban-col-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status], display: 'inline-block' }} />
                <span className="kanban-col-title" style={{ color: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="kanban-count">{tasksByStatus[status].length}</span>
                {isAdmin && (
                  <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 16, lineHeight: 1 }}
                    onClick={() => { setEditTask(null); setDefaultStatus(status); setShowTaskModal(true); }} title="Add task">+</button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 60 }}>
              {tasksByStatus[status].map(task => {
                const canEditTask = isAdmin || task.assigned_to?.id === user?.id || task.created_by?.id === user?.id;
                return (
                  <div
                    key={task.id}
                    className="task-card"
                    draggable={canEditTask}
                    onDragStart={e => canEditTask && handleDragStart(e, task)}
                    style={{ opacity: dragging?.id === task.id ? 0.5 : 1, cursor: canEditTask ? 'grab' : 'default' }}
                    onClick={() => setViewTask(task)}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, lineHeight: 1.4 }}>{task.title}</div>

                    {task.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {task.description}
                      </p>
                    )}

                    {task.tags_list?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                        {task.tags_list.slice(0, 2).map(tag => <span key={tag} className="tag" style={{ fontSize: 10 }}>#{tag}</span>)}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span className={`badge badge-${task.priority}`} style={{ fontSize: 10 }}>{task.priority}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {task.due_date && (
                          <span style={{ fontSize: 10, color: isAfter(new Date(), parseISO(task.due_date)) && status !== 'done' ? 'var(--danger)' : 'var(--text-muted)' }}>
                            {format(parseISO(task.due_date), 'MMM d')}
                          </span>
                        )}
                        {task.comment_count > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>💬{task.comment_count}</span>}
                        {task.assigned_to && (
                          <div className="user-avatar" style={{ width: 22, height: 22, fontSize: 9 }} title={task.assigned_to.username}>
                            {(task.assigned_to.first_name?.[0] || task.assigned_to.username[0]).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    {canEditTask && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '4px 0' }}
                          onClick={e => { e.stopPropagation(); setEditTask(task); setShowTaskModal(true); }}>Edit</button>
                        {(isAdmin || task.created_by?.id === user?.id) && (
                          <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={e => { e.stopPropagation(); handleDeleteTask(task.id); }}>✕</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {tasksByStatus[status].length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                  {isAdmin ? 'Drop tasks here' : 'No tasks'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showTaskModal && (
        <TaskModal
          onClose={() => { setShowTaskModal(false); setEditTask(null); }}
          onSave={load}
          project={project}
          users={projectMembers}
          existing={editTask ? editTask : { status: defaultStatus }}
          isAdmin={isAdmin}
        />
      )}

      {viewTask && (
        <TaskDetailModal
          task={viewTask}
          onClose={() => setViewTask(null)}
          onSave={load}
          onStatusChange={load}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
