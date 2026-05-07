import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksAPI, projectsAPI } from '../services/api';
import { format, parseISO, isAfter } from 'date-fns';

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'In Review', done: 'Done' };
const STATUS_COLORS = { todo: '#8888bb', in_progress: '#38b2f4', review: '#f7971e', done: '#43e97b' };
const PRIORITIES = ['low','medium','high','critical'];
const STATUSES = ['todo','in_progress','review','done'];

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [search, setSearch] = useState('');
  const [showMine, setShowMine] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(() => {
    Promise.all([
      tasksAPI.list(showMine ? { assigned_to_me: 'true' } : {}),
      projectsAPI.list(),
    ]).then(([t, p]) => {
      setTasks(t.data);
      setProjects(p.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [showMine]);

  useEffect(() => { load(); }, [load]);

  const filtered = tasks.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterProject && String(t.project) !== String(filterProject)) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getProject = id => projects.find(p => p.id === id);

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...filtered].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Group by status
  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = sorted.filter(t => t.status === s);
    return acc;
  }, {});

  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.due_date && t.status !== 'done' && isAfter(new Date(), parseISO(t.due_date))).length,
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{tasks.length} tasks · {stats.done} completed · {stats.in_progress} in progress</p>
        </div>
        {stats.overdue > 0 && (
          <div style={{ background: 'rgba(255,101,132,0.1)', border: '1px solid rgba(255,101,132,0.25)', borderRadius: 10, padding: '8px 16px', fontSize: 13, color: 'var(--danger)' }}>
            ⚠️ {stats.overdue} overdue task{stats.overdue > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Tasks', value: stats.total, color: '#6c63ff' },
          { label: 'In Progress', value: stats.in_progress, color: '#38b2f4' },
          { label: 'Completed', value: stats.done, color: '#43e97b' },
          { label: 'Overdue', value: stats.overdue, color: '#ff6584' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-input"
          placeholder="🔍 Search tasks..."
          style={{ flex: 1, minWidth: 180, maxWidth: 280 }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-select" style={{ width: 140 }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="form-select" style={{ width: 130 }}>
          <option value="">All Priority</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="form-select" style={{ width: 160 }}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button
          className={`btn btn-sm ${showMine ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setShowMine(m => !m)}
        >
          {showMine ? '✓ Assigned to Me' : 'Assigned to Me'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, borderTopColor: 'var(--accent)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <h3>No tasks found</h3>
          <p>Try adjusting your filters, or add tasks from a project</p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/projects')}>Go to Projects</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {STATUSES.map(status => {
            const statusTasks = grouped[status];
            if (statusTasks.length === 0 && (filterStatus || search)) return null;
            return (
              <div key={status}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[status], display: 'inline-block' }} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: STATUS_COLORS[status], textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    {STATUS_LABELS[status]}
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 100, padding: '1px 8px' }}>
                    {statusTasks.length}
                  </span>
                </div>

                {statusTasks.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>No tasks in this column</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {statusTasks.map(task => {
                      const proj = getProject(task.project);
                      const isOverdue = task.due_date && task.status !== 'done' && isAfter(new Date(), parseISO(task.due_date));
                      return (
                        <div
                          key={task.id}
                          className="card"
                          style={{ padding: '16px 20px', cursor: 'pointer', borderLeft: proj ? `3px solid ${proj.color}` : undefined }}
                          onClick={() => navigate(`/projects/${task.project}`)}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, lineHeight: 1.4 }}>{task.title}</div>
                              {task.description && (
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {task.description}
                                </p>
                              )}
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                                {proj && (
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 4 }}>
                                    📁 {proj.name}
                                  </span>
                                )}
                                {task.tags_list?.slice(0, 2).map(tag => (
                                  <span key={tag} className="tag" style={{ fontSize: 10 }}>#{tag}</span>
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                              {task.assigned_to && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div className="user-avatar" style={{ width: 24, height: 24, fontSize: 10 }}>
                                    {(task.assigned_to.first_name?.[0] || task.assigned_to.username[0]).toUpperCase()}
                                  </div>
                                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {task.assigned_to.first_name || task.assigned_to.username}
                                  </span>
                                </div>
                              )}
                              {task.due_date && (
                                <span style={{ fontSize: 11, color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: isOverdue ? 600 : 400 }}>
                                  {isOverdue ? '⚠️ ' : '📅 '}
                                  {format(parseISO(task.due_date), 'MMM d, yyyy')}
                                </span>
                              )}
                              {task.estimated_hours && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>⏱ {task.estimated_hours}h</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
