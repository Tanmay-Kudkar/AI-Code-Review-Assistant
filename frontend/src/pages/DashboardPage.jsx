import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reviewsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Code2, Plus, Search, Filter, Trash2, ChevronLeft, ChevronRight,
  Clock, CheckCircle, XCircle, Loader, FileCode, BarChart3, AlertTriangle
} from 'lucide-react';
import Select from 'react-select';
import Skeleton from '../components/ui/Skeleton';

const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'php', 'ruby', 'go', 'rust'];
const STATUSES = ['PENDING', 'PROCESSING', 'DONE', 'FAILED'];

const StatusBadge = ({ status }) => {
  const config = {
    DONE: { icon: CheckCircle, cls: 'badge-success', label: 'Done' },
    PROCESSING: { icon: Loader, cls: 'badge-info', label: 'Processing' },
    PENDING: { icon: Clock, cls: 'badge-warning', label: 'Pending' },
    FAILED: { icon: XCircle, cls: 'badge-error', label: 'Failed' },
  }[status] || { icon: Clock, cls: 'badge-info', label: status };

  return (
    <span className={config.cls}>
      <config.icon className={`w-3 h-3 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
};

const LangBadge = ({ lang }) => (
  <span className="px-2.5 py-1 bg-surface-800 text-slate-300 text-xs font-mono rounded-full border border-surface-700">
    {lang}
  </span>
);

import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  useLockBodyScroll(!!deleteId);
  const [filters, setFilters] = useState({ search: '', language: '', status: '', page: 1 });

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await reviewsApi.list({
        ...filters,
        limit: 6,
      });
      setReviews(data.reviews);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // Auto-refresh if any review is still processing
  useEffect(() => {
    const hasProcessing = reviews.some(r => r.status === 'PROCESSING' || r.status === 'PENDING');
    if (!hasProcessing) return;
    const interval = setInterval(fetchReviews, 5000);
    return () => clearInterval(interval);
  }, [reviews, fetchReviews]);

  const handleDelete = async (id) => {
    try {
      await reviewsApi.delete(id);
      toast.success('Review deleted');
      setDeleteId(null);
      fetchReviews();
    } catch {
      toast.error('Failed to delete review');
    }
  };

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));

  const statsCards = [
    { label: 'Total Reviews', value: pagination.total, icon: FileCode, color: 'text-brand-400' },
    { label: 'Completed', value: reviews.filter(r => r.status === 'DONE').length, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Processing', value: reviews.filter(r => r.status === 'PROCESSING' || r.status === 'PENDING').length, icon: Loader, color: 'text-amber-400' },
    { label: 'Failed', value: reviews.filter(r => r.status === 'FAILED').length, icon: AlertTriangle, color: 'text-red-400' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Welcome back, {user?.name}!</p>
        </div>
        <button onClick={() => navigate('/submit')} className="btn-primary" id="dashboard-new-review-btn">
          <Plus className="w-4 h-4" />
          New Review
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((s) => (
          <div key={s.label} className="card py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
            <input
              id="dashboard-search"
              className="input pl-9 py-2 text-sm w-full bg-surface-900/50 border border-surface-700/50 focus:border-brand-500 rounded-xl"
              placeholder="Search by title or language..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              inputId="dashboard-lang-filter"
              options={[
                { value: '', label: 'All Languages' },
                ...LANGUAGES.map(l => ({ value: l, label: l }))
              ]}
              value={{ value: filters.language, label: filters.language || 'All Languages' }}
              onChange={(opt) => setFilter('language', opt.value)}
              styles={{
                control: (base, state) => ({
                  ...base,
                  backgroundColor: 'rgba(11, 16, 32, 0.5)',
                  borderColor: state.isFocused ? '#7C5CFF' : 'rgba(255, 255, 255, 0.08)',
                  boxShadow: state.isFocused ? '0 0 0 1px rgba(124, 92, 255, 0.5)' : 'none',
                  '&:hover': { borderColor: state.isFocused ? '#7C5CFF' : 'rgba(255, 255, 255, 0.15)' },
                  borderRadius: '0.75rem',
                  minHeight: '38px',
                  cursor: 'pointer'
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: '#161D2F',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  zIndex: 50
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected ? 'rgba(124, 92, 255, 0.2)' : state.isFocused ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  color: state.isSelected ? '#7C5CFF' : '#e2e8f0',
                  cursor: 'pointer',
                  '&:active': { backgroundColor: 'rgba(124, 92, 255, 0.3)' }
                }),
                singleValue: (base) => ({ ...base, color: '#e2e8f0', fontSize: '0.875rem' }),
                input: (base) => ({ ...base, color: '#e2e8f0' }),
                indicatorSeparator: (base) => ({ ...base, backgroundColor: 'rgba(255, 255, 255, 0.08)' }),
                dropdownIndicator: (base) => ({
                  ...base, color: '#94a3b8', padding: '6px',
                  '&:hover': { color: '#cbd5e1' }
                })
              }}
              isSearchable={false}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              inputId="dashboard-status-filter"
              options={[
                { value: '', label: 'All Statuses' },
                ...STATUSES.map(s => ({ value: s, label: s }))
              ]}
              value={{ value: filters.status, label: filters.status || 'All Statuses' }}
              onChange={(opt) => setFilter('status', opt.value)}
              styles={{
                control: (base, state) => ({
                  ...base,
                  backgroundColor: 'rgba(11, 16, 32, 0.5)',
                  borderColor: state.isFocused ? '#7C5CFF' : 'rgba(255, 255, 255, 0.08)',
                  boxShadow: state.isFocused ? '0 0 0 1px rgba(124, 92, 255, 0.5)' : 'none',
                  '&:hover': { borderColor: state.isFocused ? '#7C5CFF' : 'rgba(255, 255, 255, 0.15)' },
                  borderRadius: '0.75rem',
                  minHeight: '38px',
                  cursor: 'pointer'
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: '#161D2F',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  zIndex: 50
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected ? 'rgba(124, 92, 255, 0.2)' : state.isFocused ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  color: state.isSelected ? '#7C5CFF' : '#e2e8f0',
                  cursor: 'pointer',
                  '&:active': { backgroundColor: 'rgba(124, 92, 255, 0.3)' }
                }),
                singleValue: (base) => ({ ...base, color: '#e2e8f0', fontSize: '0.875rem' }),
                input: (base) => ({ ...base, color: '#e2e8f0' }),
                indicatorSeparator: (base) => ({ ...base, backgroundColor: 'rgba(255, 255, 255, 0.08)' }),
                dropdownIndicator: (base) => ({
                  ...base, color: '#94a3b8', padding: '6px',
                  '&:hover': { color: '#cbd5e1' }
                })
              }}
              isSearchable={false}
            />
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="relative flex items-center justify-center w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-surface-800" />
              <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-r-transparent animate-spin" style={{ animationDuration: '1s' }} />
              <div className="absolute inset-1 rounded-full border-4 border-emerald-500 border-l-transparent animate-spin-reverse" style={{ animationDuration: '1.5s' }} />
              <Code2 className="w-5 h-5 text-brand-400 animate-pulse" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Loading Dashboard</h3>
            <p className="text-slate-500 text-sm animate-pulse">Syncing your code reviews...</p>
            <style>{`
              .animate-spin-reverse { animation: spin-reverse linear infinite; }
              @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
            `}</style>
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Code2 className="w-16 h-16 text-slate-700 mb-4" />
            <h3 className="text-white font-semibold text-lg mb-2">No reviews yet</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-xs">Submit your first code snippet or file to get AI-powered feedback instantly.</p>
            <button onClick={() => navigate('/submit')} className="btn-primary" id="dashboard-empty-cta">
              <Plus className="w-4 h-4" /> Start Your First Review
            </button>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-surface-800">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="p-4 hover:bg-surface-800/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/reviews/${r.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{r.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <LangBadge lang={r.language} />
                        <StatusBadge status={r.status} />
                        {r.staticResult?.summary && (
                          <span className="text-xs text-slate-500">
                            <span className="text-red-400 font-medium">{r.staticResult.summary.errors}E</span>
                            {' '}
                            <span className="text-amber-400 font-medium">{r.staticResult.summary.warnings}W</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{format(new Date(r.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                    <button
                      className="btn-danger p-2 flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Language</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Issues</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {reviews.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-surface-800/50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/reviews/${r.id}`)}
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-white group-hover:text-brand-300 transition-colors truncate max-w-xs">{r.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{r.sourceType}</p>
                      </td>
                      <td className="px-4 py-4"><LangBadge lang={r.language} /></td>
                      <td className="px-4 py-4"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-4">
                        {r.staticResult?.summary ? (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-red-400 font-medium">{r.staticResult.summary.errors}E</span>
                            <span className="text-amber-400 font-medium">{r.staticResult.summary.warnings}W</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-slate-500">{format(new Date(r.createdAt), 'MMM d, yyyy')}</span>
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-danger p-2"
                          onClick={() => setDeleteId(r.id)}
                          id={`delete-review-${r.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-surface-800">
                <p className="text-xs text-slate-500">
                  Showing {(pagination.page - 1) * 6 + 1}–{Math.min(pagination.page * 6, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary py-1.5 px-3 text-sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-secondary py-1.5 px-3 text-sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="card max-w-sm w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Delete Review</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-6">Are you sure you want to delete this review? All analysis results will be permanently removed.</p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="flex-1 btn-danger justify-center bg-red-600 hover:bg-red-700 text-white border-red-600" onClick={() => handleDelete(deleteId)} id="confirm-delete-btn">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
