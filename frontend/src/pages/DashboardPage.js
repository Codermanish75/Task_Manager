import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, projectsAPI, tasksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format, isAfter, parseISO } from 'date-fns';

const SVGIcon = ({ d, size = 20, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const StatusDot = ({ status }) => {
  const colors = { todo: '#8888bb', in_progress: '#38b2f4', review: '#f7971e', done: '#43e97b' };
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[status] || '#8888bb', display: 'inline-block', flexShrink: 0 }} />;
};

const PriorityBadge = ({ priority }) => (
  <span className={`badge badge-${priority}`} style={{ fontSize: 10 }}>{priority}</span>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardAPI.stats(),
      projectsAPI.list(),
      tasksAPI.list({ assigned_to_me: 'true' }),
    ]).then(([s, p, t]) => {
      setStats(s.data);
      setRecentProjects(p.data.slice(0, 4));
      setMyTasks(t.data.filter(task => task.status !== 'done').slice(0, 6));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.first_name || user?.username || 'there';

  const statCards = stats ? [
    { label: 'Total Projects', value: stats.total_projects, icon: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z", color: '#6c63ff', bg: 'rgba(108,99,255,0.12)' },
    { label: 'Active Projects', value: stats.active_projects, icon: "M22 12h-4l-3 9L9 3l-3 9H2", color: '#43e97b', bg: 'rgba(67,233,123,0.12)' },
    { label: 'My Tasks', value: stats.my_tasks, icon: "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11", color: '#38b2f4', bg: 'rgba(56,178,244,0.12)' },
    { label: 'Completed', value: stats.completed_tasks, icon: "M20 6L9 17l-5-5", color: '#f7971e', bg: 'rgba(247,151,30,0.12)' },
  ] : [];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, borderTopColor: 'var(--accent)' }} />
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
          <div className="user-avatar" style={{ width: 48, height: 48, fontSize: 18 }}>
            {((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '') || user?.username?.[0] || '?').toUpperCase()}
          </div>
          <div>
            <h1 className="page-title">{greeting()}, {firstName}</h1>
            <p className="page-subtitle">Here's what's happening with your projects today.</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {statCards.map((s, i) => (
          <div key={i} className="stat-card" style={{ '--accent-gradient': `linear-gradient(90deg, ${s.color}, ${s.color}88)` }}>
            <div className="stat-icon" style={{ background: s.bg }}>
              <SVGIcon d={s.icon} size={22} color={s.color} />
            </div>
            <div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Recent Projects */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Projects</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>View all</button>
          </div>
          {recentProjects.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No projects yet. <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ padding: '2px 8px' }}>Create one →</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentProjects.map(p => (
                <div
                  key={p.id}
                  className="card"
                  style={{ padding: '16px 20px', cursor: 'pointer', borderLeft: `3px solid ${p.color}` }}
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{p.name}</div>
                      <span className={`badge badge-${p.status}`}>{p.status.replace('_', ' ')}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.progress}%</div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>{p.completed_task_count}/{p.task_count} tasks</span>
                    <span>{p.members?.length || 0} members</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Tasks */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>My Pending Tasks</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View all</button>
          </div>
          {myTasks.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No pending tasks! Great work.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myTasks.map(task => (
                <div key={task.id} className="card" style={{ padding: '14px 16px' }} onClick={() => navigate(`/projects/${task.project}`)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <StatusDot status={task.status} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 6, lineHeight: 1.3 }}>{task.title}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <PriorityBadge priority={task.priority} />
                        {task.due_date && (
                          <span style={{
                            fontSize: 11,
                            color: isAfter(new Date(), parseISO(task.due_date)) ? 'var(--danger)' : 'var(--text-muted)'
                          }}>
                            Due {format(parseISO(task.due_date), 'MMM d')}
                          </span>
                        )}
                        <span className={`badge badge-${task.status}`} style={{ fontSize: 10 }}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@media(max-width:900px){.grid-4{grid-template-columns:1fr 1fr!important} div[style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
