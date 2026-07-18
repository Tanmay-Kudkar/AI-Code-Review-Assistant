import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reviewsApi } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  ArrowLeft, Clock, CheckCircle, XCircle, Loader, Code2,
  AlertTriangle, Zap, BarChart3, FileText, Shield, TrendingUp,
  RefreshCw, Copy, Download, ChevronRight, Star, Activity,
  Bug, Lightbulb, Package, Lock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, AreaChart, Area
} from 'recharts';
import Editor from '@monaco-editor/react';
import Skeleton from '../components/ui/Skeleton';

// ─── Tab definitions ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview', icon: Code2 },
  { id: 'static', label: 'Static Analysis', icon: AlertTriangle },
  { id: 'ai', label: 'AI Review', icon: Zap },
  { id: 'complexity', label: 'Complexity', icon: BarChart3 },
  { id: 'docs', label: 'Documentation', icon: FileText },
];

// ─── Severity config ──────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  critical: { color: '#f02929ff', label: 'Critical' },
  high:     { color: '#f73636ff', label: 'High' },
  error:    { color: '#f73636ff', label: 'Error' },
  medium:   { color: '#f7b524ff', label: 'Medium' },
  warning:  { color: '#f7b524ff', label: 'Warning' },
  low:      { color: '#60A5FA', label: 'Low' },
  info:     { color: '#60A5FA', label: 'Info' },
};
const getSev = (key) => SEVERITY_CONFIG[key?.toLowerCase()] || SEVERITY_CONFIG.info;

// ─── Severity Badge ───────────────────────────────────────────────────────────
const SeverityBadge = ({ sev }) => {
  const c = getSev(sev);
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border" 
          style={{ color: c.color, backgroundColor: `${c.color}15`, borderColor: `${c.color}40` }}>
      {c.label}
    </span>
  );
};

// ─── AI Score Hero ────────────────────────────────────────────────────────────
const ScoreHero = ({ review }) => {
  const bugs = review.aiResult?.bugs?.length ?? 0;
  const security = review.aiResult?.security?.length ?? 0;
  const smells = review.aiResult?.smells?.length ?? 0;
  const errors = review.staticResult?.summary?.errors ?? 0;
  const warnings = review.staticResult?.summary?.warnings ?? 0;
  const complexity = review.complexity?.difficulty;

  // Calculate a score based on issues found
  let score = 100;
  score -= bugs * 8;
  score -= security * 10;
  score -= smells * 3;
  score -= errors * 5;
  score -= warnings * 2;
  if (complexity === 'High') score -= 10;
  if (complexity === 'Medium') score -= 5;
  score = Math.max(0, Math.min(100, score));

  const grade = score >= 90 ? 'A' : score >= 80 ? 'B+' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D';
  const gradeColor = score >= 90 ? 'text-emerald-400' : score >= 80 ? 'text-brand-400' : score >= 70 ? 'text-amber-400' : 'text-red-400';
  const label = score >= 90 ? 'Excellent' : score >= 80 ? 'Good' : score >= 70 ? 'Average' : 'Needs Work';
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const ringColor = score >= 90 ? '#10b981' : score >= 80 ? '#7C5CFF' : score >= 70 ? '#f59e0b' : '#ef4444';

  const metrics = [
    { label: 'Maintainability', value: Math.max(0, 100 - smells * 8 - errors * 5), color: 'bg-brand-500' },
    { label: 'Security', value: Math.max(0, 100 - security * 15 - bugs * 5), color: 'bg-emerald-500' },
    { label: 'Performance', value: Math.max(0, 100 - (complexity === 'High' ? 30 : complexity === 'Medium' ? 15 : 0) - smells * 4), color: 'bg-amber-500' },
    { label: 'Readability', value: Math.max(0, 100 - warnings * 4 - smells * 5), color: 'bg-blue-500' },
  ];

  return (
    <div className="card mb-6">
      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* Circular Score */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className="relative w-36 h-36">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle
                cx="64" cy="64" r="54" fill="none"
                stroke={ringColor} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-extrabold ${gradeColor}`}>{score}</span>
              <span className="text-xs text-slate-400 mt-0.5">/ 100</span>
            </div>
          </div>
          <div className="text-center">
            <span className={`text-2xl font-bold ${gradeColor}`}>{grade}</span>
            <p className="text-sm text-slate-400">{label}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px h-32 bg-surface-700" />

        {/* Metric bars */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          {metrics.map(m => (
            <div key={m.label}>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-slate-300 font-medium">{m.label}</span>
                <span className="text-sm font-bold text-white">{m.value}</span>
              </div>
              <div className="h-2 bg-surface-900 rounded-full overflow-hidden">
                <div
                  className={`h-full ${m.color} rounded-full transition-all duration-700`}
                  style={{ width: `${m.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Static Analysis Tab ─────────────────────────────────────────────────────
const StaticTab = ({ staticResult }) => {
  if (!staticResult) return <p className="text-slate-500 text-sm">No static analysis results yet.</p>;
  const { issues = [], summary = {} } = staticResult;

  const cards = [
    { label: 'Errors', value: summary.errors ?? 0, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', sub: summary.errors > 0 ? 'Needs fixing' : 'No issues' },
    { label: 'Warnings', value: summary.warnings ?? 0, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', sub: summary.warnings > 0 ? 'Needs attention' : 'All clear' },
    { label: 'Info', value: summary.info ?? 0, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', sub: 'Informational' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl border p-5 ${c.bg} ${c.border}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-semibold uppercase tracking-wider ${c.color}`}>{c.label}</span>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className={`text-4xl font-extrabold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-slate-500 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {issues.length === 0 ? (
        <div className="text-center py-14 bg-emerald-500/5 rounded-2xl border border-emerald-500/15">
          <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg">No issues found!</p>
          <p className="text-slate-500 text-sm mt-1">Your code passed static analysis.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue, i) => {
            const c = getSev(issue.severity);
            return (
              <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border-l-4 ${c.cls} border border-r-transparent border-t-transparent border-b-transparent`}
                style={{ borderLeftWidth: '3px', background: 'rgba(20,27,45,0.8)', borderColor: 'transparent', borderLeft: `3px solid ${c.dot === 'bg-red-500' ? '#ef4444' : c.dot === 'bg-amber-500' ? '#f59e0b' : '#3b82f6'}` }}>
                <SeverityBadge sev={issue.severity} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{issue.message}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                    {issue.line > 0 && <span className="flex items-center gap-1"><Code2 className="w-3 h-3" /> Line {issue.line}</span>}
                    {issue.rule && <span className="font-mono bg-surface-900 px-1.5 py-0.5 rounded border border-surface-700">{issue.rule}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Formatting Helpers ───────────────────────────────────────────────────────
const formatCodeKeywords = (text) => {
  if (!text) return null;
  // If no backticks exist, try to detect camelCase or method calls ()
  let processed = text;
  if (!processed.includes('`')) {
    processed = processed.replace(/\b([a-zA-Z]+\([^\)]*\)|[a-z]+[A-Z][a-zA-Z0-9]*)\b/g, '`$1`');
  }
  const parts = processed.split(/`([^`]+)`/);
  return parts.map((part, i) => {
    if (i % 2 === 1) return <span key={i} className="font-mono text-[13px] bg-surface-900 px-1.5 py-0.5 rounded text-brand-300 border border-surface-700/50">{part}</span>;
    return part;
  });
};

// ─── Generating Skeleton (shown while AI section is processing) ───────────────
const GeneratingSection = ({ section }) => {
  const messages = {
    aiReview: { icon: '🤖', title: 'Analyzing your code…', sub: 'Our AI is scanning for bugs, security issues, code smells, and performance problems. This usually takes 15–30 seconds.' },
    documentation: { icon: '📚', title: 'Writing documentation…', sub: 'Our AI is crafting comprehensive JSDoc / docstring comments for every function and class in your code.' },
    bigO: { icon: '🔢', title: 'Calculating complexity…', sub: 'Our AI is analyzing time and space complexity for each function using Big-O notation.' },
    refactoring: { icon: '🏗️', title: 'Generating refactoring advice…', sub: 'Our principal engineer AI is writing a detailed architectural review and improvement roadmap for your code.' },
  };
  const m = messages[section] || messages.aiReview;

  return (
    <div className="space-y-6">
      {/* Pulsing hero banner */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-500/20 p-8" style={{ background: 'linear-gradient(135deg, #141B2D 0%, #1B2338 100%)' }}>
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(124,92,255,0.25) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(124,92,255,0.15) 0%, transparent 60%)' }} />
        <div className="relative flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-3xl flex-shrink-0" style={{ animation: 'pulse 2s ease-in-out infinite' }}>
            {m.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">{m.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xl">{m.sub}</p>
          </div>
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <Loader className="w-8 h-8 text-brand-400 animate-spin" />
            <span className="text-xs text-slate-500">Processing</span>
          </div>
        </div>
        {/* Animated progress bar */}
        <div className="mt-6 h-1 rounded-full bg-brand-500/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400" style={{ width: '60%', animation: 'progressPulse 2s ease-in-out infinite' }} />
        </div>
      </div>
      {/* Skeleton preview cards */}
      <div className="space-y-3">
        {[80, 65, 90, 55].map((w, i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: '#1B2338' }}>
            <div className="w-16 h-5 rounded-full skeleton flex-shrink-0" style={{ width: `${Math.random() * 20 + 40}px` }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 rounded skeleton" style={{ width: `${w}%` }} />
              <div className="h-3 rounded skeleton" style={{ width: `${w - 20}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Section Failed Banner ────────────────────────────────────────────────────
const SectionFailed = ({ onRetry }) => (
  <div className="text-center py-14 rounded-2xl border border-red-500/20 bg-red-500/5">
    <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
    <p className="text-white font-semibold">This section failed to generate</p>
    <p className="text-sm text-slate-500 mt-1 mb-5">The AI encountered an issue processing this section.</p>
    {onRetry && <button onClick={onRetry} className="btn-primary text-sm px-4 py-2">Retry Analysis</button>}
  </div>
);

// ─── AI Review Tab ────────────────────────────────────────────────────────────
const AiTab = ({ aiResult, sectionStatus, onNavigateToLine }) => {
  const status = sectionStatus?.aiReview || 'pending';
  if (status === 'processing' || status === 'pending') return <GeneratingSection section="aiReview" />;
  if (status === 'failed') return <SectionFailed />;
  if (!aiResult) return <GeneratingSection section="aiReview" />;

  const bugsCount = (aiResult.bugs?.length || 0) + (aiResult.security?.length || 0);
  const smellsCount = aiResult.smells?.length || 0;
  const suggsCount = aiResult.suggestions?.length || 0;
  const fixTime = Math.max(2, bugsCount * 5 + smellsCount * 2 + suggsCount);
  const confidence = 96;
  const overallQuality = bugsCount > 3 ? 'Needs Work' : bugsCount > 0 ? 'Average' : 'Good';
  const stars = bugsCount > 3 ? '★★☆☆☆' : bugsCount > 0 ? '★★★☆☆' : '★★★★☆';
  const starsColor = bugsCount > 3 ? 'text-red-400' : bugsCount > 0 ? 'text-amber-400' : 'text-emerald-400';

  const sections = [
    { key: 'bugs', label: 'Bugs Detected', icon: Bug, color: '#F87171', items: aiResult.bugs },
    { key: 'security', label: 'Security Issues', icon: Lock, color: '#F87171', items: aiResult.security },
    { key: 'smells', label: 'Code Smells', icon: Zap, color: '#FBBF24', items: aiResult.smells },
    { key: 'performance', label: 'Performance Tips', icon: TrendingUp, color: '#60A5FA', items: aiResult.performance },
  ];

  return (
    <div className="space-y-10">
      {/* 13 & 17. AI Summary & Confidence */}
      <div className="card bg-gradient-to-br from-surface-800 to-surface-900 border-surface-700 p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Zap className="w-5 h-5 text-brand-400" /> AI Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Overall Quality</p>
            <p className={`text-2xl font-bold ${starsColor}`}>{stars}</p>
            <p className="text-sm text-slate-300 mt-1 font-medium">{overallQuality}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Issues Found</p>
            <div className="flex flex-col gap-0.5 mt-1">
              {bugsCount > 0 && <span className="text-[13px] text-red-400 font-bold">{bugsCount} Bugs/Security</span>}
              {smellsCount > 0 && <span className="text-[13px] text-amber-400 font-bold">{smellsCount} Code Smells</span>}
              {suggsCount > 0 && <span className="text-[13px] text-brand-400 font-bold">{suggsCount} Suggestions</span>}
              {bugsCount === 0 && smellsCount === 0 && <span className="text-[13px] text-emerald-400 font-bold">None!</span>}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Est. Fix Time</p>
            <p className="text-2xl font-bold text-white">~{fixTime} mins</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">AI Confidence</p>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xl font-bold text-brand-400">{confidence}%</span>
            </div>
            <div className="h-1.5 bg-surface-950 rounded-full overflow-hidden border border-surface-700/50">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${confidence}%` }} />
            </div>
          </div>
        </div>
      </div>

      {sections.map(({ key, label, icon: Icon, color, items }) =>
        items?.length > 0 && (
          <div key={key} className="space-y-4">
            {/* 7. Section Headers */}
            <div className="border-b border-surface-700/50 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <h2 className="text-[19px] font-bold text-white">{label}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: `${color}20`, color }}>
                {items.length}
              </span>
            </div>

            <div className="space-y-3">
              {items.map((item, i) => {
                const sev = item.severity || item.risk || 'medium';
                // 3. Fallback Titles
                const title = item.title || (item.issue ? (item.issue.length > 50 ? 'Possible Issue' : item.issue) : 'Identified Finding');
                const desc = item.description || (item.issue && item.issue.length > 50 ? item.issue : item.title) || '';
                
                return (
                  /* 1, 8, 9. Issue Cards */
                  <div key={i} className="group rounded-xl border border-surface-700/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:border-surface-600 bg-surface-850 overflow-hidden"
                    style={{ borderLeft: `5px solid ${color}` }}>
                    <div className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* 2. Severity Badge Position */}
                          <SeverityBadge sev={sev} />
                          <h4 className="text-[16px] font-bold text-white">{title}</h4>
                        </div>
                        {/* 12. Fix Button (Mock) */}
                        <button className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-300 hover:bg-brand-500/20 text-xs font-bold border border-brand-500/20 shadow-sm cursor-pointer hover:shadow">
                          <Zap className="w-3.5 h-3.5" /> Generate Fix
                        </button>
                      </div>
                      
                      {/* 14. Long text formatting */}
                      <p className="text-[15px] leading-relaxed text-slate-300 mb-3.5">
                        {formatCodeKeywords(desc)}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* 18. Code References */}
                        {item.line && (
                          <div 
                            onClick={() => onNavigateToLine(item.line)}
                            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-400 bg-surface-900 px-3 py-1.5 rounded-md border border-surface-700/50 hover:text-white hover:border-brand-500 cursor-pointer transition-colors shadow-inner">
                            <span className="text-brand-400 text-sm">📍</span> Line {item.line}
                          </div>
                        )}
                        <button className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-300 text-xs font-bold border border-brand-500/20 cursor-pointer">
                          <Zap className="w-3 h-3" /> Fix
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* 4. Suggestions */}
      {aiResult.suggestions?.length > 0 && (
        <div className="space-y-4">
          <div className="border-b border-surface-700/50 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/15">
              <Lightbulb className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-[19px] font-bold text-white">Suggestions</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
              {aiResult.suggestions.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiResult.suggestions.map((sugg, i) => (
              <div key={i} className="group rounded-xl border border-surface-700/50 bg-surface-850 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:border-emerald-500/30">
                <div className="flex items-start gap-3 mb-3">
                  <Lightbulb className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <h4 className="text-[16px] font-bold text-white leading-snug">{sugg.title || 'Improvement Idea'}</h4>
                </div>
                <p className="text-[15px] leading-relaxed text-slate-300 mb-5">{formatCodeKeywords(sugg.description || sugg.issue || sugg.title)}</p>
                <div className="bg-surface-900 rounded-lg p-3 border border-surface-700/50 shadow-inner">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estimated Improvement</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-[13.5px] font-medium text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500" /> Enhanced Readability
                    </li>
                    <li className="flex items-center gap-2 text-[13.5px] font-medium text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500" /> Cleaner Code Structure
                    </li>
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 & 11. Refactoring Advice */}
      {aiResult.refactoring && (
        <div className="space-y-4">
          <div className="border-b border-surface-700/50 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-500/15">
              <RefreshCw className="w-5 h-5 text-brand-400" />
            </div>
            <h2 className="text-[19px] font-bold text-white">Refactoring Advice</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiResult.refactoring.split(/\n\d+\.\s+/).filter(Boolean).map((chunk, i) => {
              const lines = chunk.split('\n').filter(Boolean);
              let title = lines[0]?.replace(/\*\*/g, '') || `Suggestion ${i + 1}`;
              if (title.includes(':')) title = title.split(':')[0];
              const body = lines.join(' ').replace(/\*\*/g, '').replace(title, '').replace(/^:/, '').trim();
              
              const icons = [Package, Shield, Zap, RefreshCw];
              const RIcon = icons[i % icons.length];

              return (
                <div key={i} className="group rounded-xl border border-surface-700/50 bg-surface-850 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:border-brand-500/30">
                  <div className="p-5 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-brand-500/15 text-brand-400 flex items-center justify-center flex-shrink-0 shadow-inner">
                        <RIcon className="w-5 h-5" />
                      </div>
                      <h4 className="text-[16px] font-bold text-white">{title}</h4>
                    </div>
                    
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reason</p>
                        <p className="text-[14.5px] leading-relaxed text-slate-300">{formatCodeKeywords(body)}</p>
                      </div>
                      <div className="pt-3 border-t border-surface-700/50 mt-auto">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Benefit</p>
                        <p className="text-[13px] font-bold text-brand-300">Improved maintainability</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {!aiResult.refactoring.match(/\n\d+\.\s+/) && (
              <div className="col-span-full rounded-xl border border-surface-700/50 p-5 bg-surface-850">
                <p className="text-[15px] leading-relaxed text-slate-300 whitespace-pre-wrap">{formatCodeKeywords(aiResult.refactoring)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Complexity Tab ───────────────────────────────────────────────────────────
const ComplexityTab = ({ complexity, aiResult, sectionStatus }) => {
  if (!complexity) return <p className="text-slate-500 text-sm">No complexity data yet.</p>;
  const bigOStatus = sectionStatus?.bigO || 'pending';
  const showBigOSkeleton = bigOStatus === 'processing' || bigOStatus === 'pending';
  const showBigOFailed = bigOStatus === 'failed';

  const difficultyConfig = {
    Low: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', bar: '#10b981' },
    Medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', bar: '#f59e0b' },
    High: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', bar: '#ef4444' },
  };
  const dc = difficultyConfig[complexity.difficulty] || difficultyConfig.Low;

  const numToBigO = { 1: 'O(1)', 2: 'O(log n)', 3: 'O(n)', 4: 'O(n log n)', 5: 'O(n²)', 6: 'O(n³)', 7: 'O(2ⁿ)', 8: 'O(n!)' };
  const aiComplexities = aiResult?.complexities || [];

  const parseBigO = (str) => {
    if (!str) return 1;
    const s = str.replace(/\s+/g, '').toLowerCase();
    if (s.includes('1')) return 1;
    if (s.includes('logn')) return 2;
    if (s.includes('nlogn')) return 4;
    if (s.includes('n^2') || s.includes('n²')) return 5;
    if (s.includes('n^3') || s.includes('n³')) return 6;
    if (s.includes('2^n') || s.includes('2ⁿ')) return 7;
    if (s.includes('n!')) return 8;
    if (s.includes('n')) return 3;
    return 1;
  };

  const formatComplexity = (val) => {
    if (val <= 1) return 'O(1)';
    if (val <= 3) return 'O(n)';
    if (val <= 6) return 'O(n log n)';
    if (val <= 10) return 'O(n²)';
    return 'O(2^n)';
  };

  let overallTime = formatComplexity(complexity.cyclomaticAvg || 1);
  let overallSpace = '—';

  if (aiComplexities.length > 0) {
    const maxTimeNum = Math.max(...aiComplexities.map(c => parseBigO(c.timeComplexity)), 1);
    const maxSpaceNum = Math.max(...aiComplexities.map(c => parseBigO(c.spaceComplexity)), 1);
    overallTime = numToBigO[maxTimeNum] || 'O(1)';
    overallSpace = numToBigO[maxSpaceNum] || 'O(1)';
  }

  const metrics = [
    { label: 'Lines of Code', value: complexity.linesOfCode, sub: 'non-blank', icon: '📄' },
    { label: 'Functions', value: complexity.numFunctions, sub: 'defined', icon: '⚡' },
    { label: 'Classes', value: complexity.numClasses, sub: 'defined', icon: '📦' },
    { label: 'Time', value: overallTime, sub: 'overall O()', icon: '⏱️' },
    { label: 'Space', value: overallSpace, sub: 'overall O()', icon: '💾' },
  ];

  const maintainability = Math.max(0, Math.min(100, 100 - (complexity.cyclomaticAvg || 1) * 10));
  const estimatedTime = Math.max(5, Math.round((complexity.linesOfCode || 10) * 0.5 + (complexity.numFunctions || 1) * 2));



  const chartData = aiComplexities.length > 0
    ? aiComplexities
        .slice(0, 15)
        .map(c => {
          const num = parseBigO(c.timeComplexity);
          return {
            name: c.functionName.length > 12 ? c.functionName.slice(0, 12) + '…' : c.functionName,
            complexity: num,
            display: c.timeComplexity,
            space: c.spaceComplexity,
            rating: num >= 5 ? 'High' : num >= 3 ? 'Medium' : 'Low'
          };
        })
    : (complexity.complexity || [])
        .slice(0, 15)
        .map(fn => ({
          name: fn.name.length > 12 ? fn.name.slice(0, 12) + '…' : fn.name,
          complexity: fn.complexity,
          display: formatComplexity(fn.complexity),
          space: '—',
          rating: fn.rating,
        }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-3 shadow-xl text-sm min-w-[150px]">
          <p className="text-white font-semibold mb-2">{label}</p>
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400">Time:</span>
            <span className="text-brand-300 font-bold ml-2">{payload[0].payload.display}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Space:</span>
            <span className="text-emerald-400 font-bold ml-2">{payload[0].payload.space}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Overall difficulty - spans 1 cell */}
        <div className={`rounded-xl border p-5 ${dc.bg} ${dc.border} flex flex-col justify-between`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall Difficulty</p>
          <div className="mt-3">
            <p className={`text-4xl font-extrabold ${dc.color}`}>{complexity.difficulty}</p>
            <div className="mt-2 h-1.5 bg-black/20 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: complexity.difficulty === 'Low' ? '30%' : complexity.difficulty === 'Medium' ? '60%' : '90%', backgroundColor: dc.bar }} />
            </div>
          </div>
        </div>

        {/* Maintainability */}
        <div className="rounded-xl border border-surface-700/50 p-5" style={{ background: '#1E2A45' }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Maintainability</p>
          <p className="text-4xl font-extrabold text-white mt-3">{maintainability}%</p>
          <p className="text-xs text-slate-400 mt-1">Score estimate</p>
        </div>

        {/* Est. review time */}
        <div className="rounded-xl border border-surface-700/50 p-5" style={{ background: '#1E2A45' }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Est. Review Time</p>
          <p className="text-4xl font-extrabold text-white mt-3">{estimatedTime}s</p>
          <p className="text-xs text-slate-400 mt-1">Estimated analysis</p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-surface-700/50 p-4 text-center" style={{ background: '#1E2A45' }}>
            <span className="text-2xl mb-2 block">{m.icon}</span>
            <p className="text-2xl font-bold text-white">{m.value ?? '—'}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{m.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Per-function chart */}
      {showBigOSkeleton ? (
        <GeneratingSection section="bigO" />
      ) : showBigOFailed ? (
        <SectionFailed />
      ) : chartData.length > 0 ? (
        <div className="card">
          <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-400" /> Function Complexity Timeline
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 30, right: 20, bottom: 60, left: 10 }}>
              <defs>
                <linearGradient id="colorComplexity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fill: '#8B94A7', fontSize: 11 }} angle={-35} textAnchor="end" interval={0} tickMargin={10} />
              <YAxis tick={{ fill: '#8B94A7', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(124,92,255,0.3)', strokeWidth: 2, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="complexity" stroke="#7C5CFF" strokeWidth={4} fillOpacity={1} fill="url(#colorComplexity)" activeDot={{ r: 6, fill: '#7C5CFF', stroke: '#fff', strokeWidth: 2 }}>
                <LabelList dataKey="display" position="top" fill="#ffffff" fontSize={13} fontWeight="bold" offset={10} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
};

// ─── Documentation Tab ────────────────────────────────────────────────────────
const DocsTab = ({ aiResult, language, sectionStatus }) => {
  const status = sectionStatus?.documentation || 'pending';
  if (status === 'processing' || status === 'pending') return <GeneratingSection section="documentation" />;
  if (status === 'failed') return <SectionFailed />;
  const docs = aiResult?.documentation || '';
  if (!docs) return <GeneratingSection section="documentation" />;
  const [view, setView] = useState('preview');

  const copy = () => { navigator.clipboard.writeText(docs); toast.success('Copied to clipboard!'); };
  const download = () => {
    const blob = new Blob([docs], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'documentation.md'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Sticky toolbar */}
      <div className="flex items-center justify-between sticky top-0 z-10 py-2">
        <div className="flex items-center bg-surface-900 rounded-lg p-1 gap-1 border border-surface-700/50">
          {['preview', 'markdown'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${view === v ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary py-1.5 px-3 text-xs" onClick={copy} id="copy-docs-btn">
            <Copy className="w-3.5 h-3.5" /> Copy
          </button>
          <button className="btn-secondary py-1.5 px-3 text-xs" onClick={download} id="download-docs-btn">
            <Download className="w-3.5 h-3.5" /> Download .md
          </button>
        </div>
      </div>

      {view === 'preview' ? (
        <div className="rounded-xl border border-surface-700/50 p-6" style={{ background: '#1E2A45' }}>
          <article className="prose prose-invert prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed font-sans">{docs}</pre>
          </article>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-surface-700/50">
          <Editor
            height="450px"
            language="markdown"
            value={docs}
            theme="vs-dark"
            options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', scrollBeyondLastLine: false, fontFamily: 'JetBrains Mono, monospace', wordWrap: 'on', scrollbar: { alwaysConsumeMouseWheel: false } }}
          />
        </div>
      )}
    </div>
  );
};

// ─── Source Code Viewer ───────────────────────────────────────────────────────
const CodeViewer = ({ code, language, highlightEvent }) => {
  const [expanded, setExpanded] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const timeoutRef = useRef(null);

  const applyHighlight = (line, delayScroll = false) => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    
    const doScroll = () => {
      const startTop = editor.getScrollTop();
      const layout = editor.getLayoutInfo();
      const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
      
      let targetTop = editor.getTopForLineNumber(line) - (layout.height / 2) + (lineHeight / 2);
      targetTop = Math.max(0, targetTop);
      
      const distance = targetTop - startTop;
      const duration = 1500; // 1.5s very slow smooth scroll
      const startTime = performance.now();
      
      const animateScroll = (time) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // easeInOutCubic for very smooth acceleration and deceleration
        const ease = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          
        editor.setScrollTop(startTop + distance * ease);
        
        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          editor.revealLineInCenter(line); // Ensure perfect precision at the end
          
          // Apply glow after arriving!
          decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
            {
              range: new monaco.Range(line, 1, line, 1),
              options: { isWholeLine: true, className: 'line-glow' }
            }
          ]);

          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            if (editorRef.current) {
              decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
            }
          }, 4500);
        }
      };
      
      requestAnimationFrame(animateScroll);
    };

    if (delayScroll) {
      setTimeout(doScroll, 150); // Slight delay for editor to mount
    } else {
      doScroll();
    }
  };

  useEffect(() => {
    if (highlightEvent?.line) {
      applyHighlight(parseInt(highlightEvent.line, 10));
    }
  }, [highlightEvent]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const copy = () => { navigator.clipboard.writeText(code); toast.success('Copied!'); };
  const download = () => {
    const ext = { javascript: 'js', typescript: 'ts', python: 'py', java: 'java', cpp: 'cpp', c: 'c', csharp: 'cs', go: 'go', rust: 'rs', php: 'php', ruby: 'rb' }[language] || 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `code.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Code2 className="w-4 h-4 text-brand-400" /> Source Code
        </h3>
        <div className="flex items-center gap-2">
          <button className="btn-secondary py-1.5 px-3 text-xs" onClick={copy}><Copy className="w-3 h-3" /> Copy</button>
          <button className="btn-secondary py-1.5 px-3 text-xs" onClick={download}><Download className="w-3 h-3" /> Download</button>
          <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>
      <div className="rounded-xl overflow-hidden border border-surface-700/50">
        <Editor
          height={expanded ? '600px' : '360px'}
          language={language}
          value={code}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
            if (highlightEvent?.line) {
              applyHighlight(parseInt(highlightEvent.line, 10), true);
            }
          }}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme('app-dark', {
              base: 'vs-dark', inherit: true,
              rules: [],
              colors: { 'editor.background': '#141B2D', 'editor.lineHighlightBackground': '#1B2338' }
            });
          }}
          theme="app-dark"
          options={{ readOnly: true, minimap: { enabled: false }, mouseWheelZoom: true, fontSize: 13, lineNumbers: 'on', scrollBeyondLastLine: false, fontFamily: 'JetBrains Mono, monospace', bracketPairColorization: { enabled: true }, wordWrap: 'off', padding: { top: 12, bottom: 12 }, scrollbar: { alwaysConsumeMouseWheel: false } }}
        />
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReviewDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [highlightEvent, setHighlightEvent] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [sectionsStatus, setSectionsStatus] = useState({
    aiReview: 'pending', documentation: 'pending', bigO: 'pending', refactoring: 'pending'
  });

  const handleNavigateToLine = (line) => {
    setActiveTab('overview');
    
    // Slight delay ensures the CodeViewer is rendered in the DOM before scrolling/highlighting
    setTimeout(() => {
      setHighlightEvent({ line, timestamp: Date.now() });
      const viewer = document.getElementById('code-viewer-container');
      if (viewer) {
        viewer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 200);
  };

  const fetchReview = useCallback(async () => {
    try {
      const { data } = await reviewsApi.get(id);
      setReview(data.review);
    } catch {
      toast.error('Review not found');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await reviewsApi.retry(id);
      fetchReview();
      toast.success('Restarting analysis...');
    } catch (err) {
      console.error(err);
      toast.error('Failed to restart analysis. Please try again.');
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => { fetchReview(); }, [fetchReview]);

  // Poll the full review while it's still processing
  useEffect(() => {
    if (!review || review.status === 'DONE' || review.status === 'FAILED') return;
    const interval = setInterval(fetchReview, 5000);
    return () => clearInterval(interval);
  }, [review, fetchReview]);

  // Poll AI section statuses independently so tabs unlock progressively
  useEffect(() => {
    if (!review || !id) return;
    // If all sections are done/failed, stop polling
    const allSettled = Object.values(sectionsStatus).every(s => s === 'done' || s === 'failed');
    if (allSettled && review.status === 'DONE') return;

    const pollSections = async () => {
      try {
        const { data } = await reviewsApi.getAiStatus(id);
        setSectionsStatus(data.sectionsStatus);
      } catch { /* ignore */ }
    };

    pollSections(); // Immediate poll
    const interval = setInterval(pollSections, 3000); // Then every 3s
    return () => clearInterval(interval);
  }, [review?.status, id]);

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="flex items-start justify-between">
          <div><Skeleton className="h-8 w-64 mb-2" /><Skeleton className="h-4 w-40" /></div>
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="flex gap-3"><Skeleton className="h-10 w-28" /><Skeleton className="h-10 w-36" /><Skeleton className="h-10 w-28" /></div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );

  if (!review) return null;

  const statusConfig = {
    PROCESSING: { icon: Loader, label: 'Processing', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', spin: true },
    PENDING: { icon: Clock, label: 'Pending', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', spin: false },
    DONE: { icon: CheckCircle, label: 'Complete', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', spin: false },
    FAILED: { icon: XCircle, label: 'Failed', color: 'text-red-400 bg-red-500/10 border-red-500/20', spin: false },
  }[review.status] || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + header */}
      <div>
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-5 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{review.title}</h1>
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <span className="font-mono text-xs px-2.5 py-1 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-300">{review.language}</span>
              <span className="text-xs text-slate-500 uppercase tracking-wider">{review.sourceType}</span>
              <span className="text-xs text-slate-500">{format(new Date(review.createdAt), 'MMM d, yyyy · h:mm a')}</span>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold flex-shrink-0 ${statusConfig.color}`}>
            <statusConfig.icon className={`w-4 h-4 ${statusConfig.spin ? 'animate-spin' : ''}`} />
            {statusConfig.label}
          </div>
        </div>
      </div>

      {/* Processing banner */}
      {(review.status === 'PROCESSING' || review.status === 'PENDING') && (
        <div className="card border-amber-500/20 bg-amber-500/5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Loader className="w-5 h-5 text-amber-400 animate-spin" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-300">Analysis in progress</p>
            <p className="text-xs text-slate-400 mt-0.5">Running static analysis and AI review. This page updates automatically every 5 seconds.</p>
          </div>
        </div>
      )}

      {review.status === 'FAILED' && (() => {
        let errorMsg = review.errorMessage || 'An unexpected error occurred.';
        if (errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('high demand')) {
          errorMsg = "Our AI provider's servers are currently experiencing unusually high demand. This is temporary. Please wait a moment and try again.";
        } else if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
          errorMsg = "We have temporarily hit the rate limit for our AI provider's API. Please wait a minute and try again.";
        }
        
        return (
          <div className="card border-red-500/20 bg-red-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Analysis Failed
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-3xl">
                  {errorMsg}
                </p>
              </div>
              <button 
                onClick={handleRetry} 
                disabled={retrying}
                className="btn flex-shrink-0 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                {retrying ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {retrying ? 'Retrying...' : 'Retry Analysis'}
              </button>
            </div>
          </div>
        );
      })()}

      {review.status === 'DONE' && (
        <>
          {/* AI Score Hero */}
          <ScoreHero review={review} />

          {/* Tabs */}
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 pt-2 px-1">
            {TABS.map(({ id: tabId, label, icon: Icon }) => (
              <button
                key={tabId}
                id={`tab-${tabId}`}
                className={`tab-btn flex items-center gap-2 flex-shrink-0 shadow-sm ${activeTab === tabId ? 'active' : ''}`}
                onClick={() => setActiveTab(tabId)}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div key={activeTab} className="card animate-fade-in">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Quick stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Static Errors', value: review.staticResult?.summary?.errors ?? 0, color: 'text-red-400', sub: 'No issues detected', icon: XCircle },
                    { label: 'Warnings', value: review.staticResult?.summary?.warnings ?? 0, color: 'text-amber-400', sub: 'Needs attention', icon: AlertTriangle },
                    { label: 'AI Issues', value: (review.aiResult?.bugs?.length ?? 0) + (review.aiResult?.security?.length ?? 0), color: 'text-brand-400', sub: 'Bugs + security', icon: Zap },
                    { label: 'Complexity', value: review.complexity?.difficulty ?? '—', color: review.complexity?.difficulty === 'High' ? 'text-red-400' : review.complexity?.difficulty === 'Medium' ? 'text-amber-400' : 'text-emerald-400', sub: 'Overall difficulty', icon: BarChart3 },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl border border-surface-700/50 p-5" style={{ background: '#1E2A45' }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{s.label}</span>
                        <s.icon className={`w-4 h-4 ${s.color}`} />
                      </div>
                      <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Code viewer */}
                <div id="code-viewer-container">
                  <CodeViewer code={review.rawCode} language={review.language} highlightEvent={highlightEvent} />
                </div>
              </div>
            )}
            {activeTab === 'static' && <StaticTab staticResult={review.staticResult} />}
            {activeTab === 'ai' && <AiTab aiResult={review.aiResult} sectionStatus={sectionsStatus} onNavigateToLine={handleNavigateToLine} />}
            {activeTab === 'complexity' && <ComplexityTab complexity={review.complexity} aiResult={review.aiResult} sectionStatus={sectionsStatus} />}
            {activeTab === 'docs' && <DocsTab aiResult={review.aiResult} language={review.language} sectionStatus={sectionsStatus} />}
          </div>
        </>
      )}
    </div>
  );
}
