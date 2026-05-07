import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI, usersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COLORS = ['#6c63ff','#ff6584','#43e97b','#38b2f4','#f7971e','#a78bfa','#fb7185','#34d399'];
const STATUSES = ['planning','active','on_hold','completed','cancelled'];
const PRIORITIES = ['low','medium','high','critical'];

function ProjectModal({ onClose, onSave, users, existing }) {
  const [form, setForm] = useState({
    name: existing?.name || '',
    description: existing?.description || '',
    status: existing?.status || 'planning',
    priority: existing?.priority || 'medium',
    start_date: existing?.start_date || '',
    end_date: existing?.end_date || '',
    color: existing?.color || COLORS[0],
    members: existing?.members?.map(m => ({ user_id: m.id, role: m.project_role || "member" })) || [],
  });
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const toggleMember = id => {
    setForm(f => ({
      ...f,
      members: f.members.some(m => m.user_id === id) ? f.members.filter(m => m.user_id !== id) : [...f.members, { user_id: id, role: 'member' }]
    }));
  };

  const submit = async e => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Project name is required');
    setLoading(true);
    try {
      if (existing) {
        await projectsAPI.update(existing.id, form);
        toast.success('Project updated!');
      } else {
        await projectsAPI.create(form);
        toast.success('Project created! 🚀');
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error('Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title">{existing ? 'Edit Project' : 'New Project'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input name="name" value={form.name} onChange={handle} className="form-input" placeholder="e.g. Website Redesign" required />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea name="description" value={form.description} onChange={handle} className="form-textarea" placeholder="What's this project about?" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" value={form.status} onChange={handle} className="form-select">
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select name="priority" value={form.priority} onChange={handle} className="form-select">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input name="start_date" type="date" value={form.start_date} onChange={handle} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input name="end_date" type="date" value={form.end_date} onChange={handle} className="form-input" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Project Color</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: form.color === c ? `3px solid white` : '3px solid transparent',
                      boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none',
                      transition: 'all 0.15s'
                    }}
                  />
                ))}
              </div>
            </div>

            {users.length > 0 && (
              <div className="form-group">
                <label className="form-label">Assign Members</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto' }}>
                  {users.map(u => (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 10px', borderRadius: 8, background: form.members.some(m => m.user_id === u.id) ? 'rgba(108,99,255,0.1)' : 'transparent', transition: 'all 0.15s' }}>
                      <input type="checkbox" checked={form.members.some(m => m.user_id === u.id)} onChange={() => toggleMember(u.id)} style={{ accentColor: 'var(--accent)' }} />
                      <div className="user-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                        {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {u.first_name ? `${u.first_name} ${u.last_name}` : u.username}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{u.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : null}
              {existing ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const navigate = useNavigate();

  const load = useCallback(() => {
    Promise.all([projectsAPI.list(), usersAPI.list()]).then(([p, u]) => {
      setProjects(p.data);
      setUsers(u.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try {
      await projectsAPI.delete(id);
      toast.success('Project deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} total projects · {projects.filter(p => p.status === 'active').length} active</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditProject(null); setShowModal(true); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          New Project
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-input"
          placeholder="🔍 Search projects..."
          style={{ flex: 1, minWidth: 200, maxWidth: 320 }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-select" style={{ width: 160 }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, borderTopColor: 'var(--accent)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z"/>
          </svg>
          <h3>{search || filterStatus ? 'No matching projects' : 'No projects yet'}</h3>
          <p>{search || filterStatus ? 'Try adjusting your filters' : 'Create your first project to get started'}</p>
          {!search && !filterStatus && (
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowModal(true)}>Create Project</button>
          )}
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(p => (
            <div
              key={p.id}
              className="project-card"
              style={{ '--project-color': p.color }}
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{p.name}</h3>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className={`badge badge-${p.status}`}>{p.status.replace('_', ' ')}</span>
                    <span className={`badge badge-${p.priority}`}>{p.priority}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginLeft: 8 }} onClick={e => e.stopPropagation()}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '4px 8px' }}
                    onClick={() => { setEditProject(p); setShowModal(true); }}
                  >✎</button>
                  <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={e => handleDelete(e, p.id)}>✕</button>
                </div>
              </div>

              {p.description && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.description}
                </p>
              )}

              {/* Progress */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                  <span>{p.completed_task_count}/{p.task_count} tasks complete</span>
                  <span style={{ fontWeight: 600, color: p.color }}>{p.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${p.progress}%`, background: `linear-gradient(90deg, ${p.color}, ${p.color}aa)` }} />
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Members */}
                <div className="avatar-stack">
                  {p.members?.slice(0, 4).map((m, i) => (
                    <div key={m.id || i} className="user-avatar" title={m.username || m.user?.username}>
                      {(m.first_name?.[0] || m.username?.[0] || m.user?.username?.[0] || '?').toUpperCase()}
                    </div>
                  ))}
                  {p.members?.length > 4 && (
                    <div className="user-avatar" style={{ background: 'var(--bg-card-hover)', color: 'var(--text-muted)', fontSize: 10 }}>
                      +{p.members.length - 4}
                    </div>
                  )}
                </div>
                {p.end_date && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Due {format(new Date(p.end_date), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ProjectModal
          onClose={() => { setShowModal(false); setEditProject(null); }}
          onSave={load}
          users={users}
          existing={editProject}
        />
      )}
    </div>
  );
}