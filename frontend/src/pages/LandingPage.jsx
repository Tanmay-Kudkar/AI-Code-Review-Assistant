import { Link, useNavigate } from 'react-router-dom';
import {
  Zap, Code2, Shield, BarChart3, FileText, ArrowRight,
  CheckCircle, Star, GraduationCap, Briefcase, Users, BookOpen, Laptop, Building2
} from 'lucide-react';

const FEATURES = [
  { icon: Code2, title: 'Static Analysis', desc: 'ESLint & Pylint detect syntax errors, unused vars, and style violations instantly.', color: 'from-blue-500 to-cyan-500' },
  { icon: Zap, title: 'AI Code Review', desc: 'GPT-powered analysis finds bugs, code smells, and optimization opportunities.', color: 'from-brand-500 to-violet-500' },
  { icon: BarChart3, title: 'Complexity Metrics', desc: 'Cyclomatic complexity, LOC, function count, and difficulty ratings visualized.', color: 'from-emerald-500 to-teal-500' },
  { icon: Shield, title: 'Security Scan', desc: 'Detect common security vulnerabilities and get remediation advice.', color: 'from-rose-500 to-orange-500' },
  { icon: FileText, title: 'Auto Documentation', desc: 'Generate JSDoc and docstrings for all your functions and classes automatically.', color: 'from-amber-500 to-yellow-500' },
  { icon: CheckCircle, title: 'Review History', desc: 'Search, filter, and revisit all your past code reviews with full details.', color: 'from-purple-500 to-pink-500' },
];

const USE_CASES = [
  { icon: GraduationCap, title: 'Students', desc: 'Upload your assignment before submission to identify bugs and improve code quality.', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { icon: Briefcase, title: 'Internship Prep', desc: 'Review your personal projects before adding them to your resume.', color: 'text-brand-400', bg: 'bg-brand-500/10 border-brand-500/20' },
  { icon: Laptop, title: 'Developers', desc: 'Analyze pull requests before sending them for peer review.', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { icon: BookOpen, title: 'Coding Bootcamps', desc: 'Instructors can require AI review before assignment submission.', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { icon: Users, title: 'Freelancers', desc: 'Improve the quality of client projects with automated reviews.', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  { icon: Building2, title: 'Small Teams', desc: 'Quick code reviews without a senior developer for every small change.', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
];
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function LandingPage() {
  useDocumentTitle('Home');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-950 text-slate-100 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">AI Code Review</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="btn-secondary py-1.5 sm:py-2 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap shrink-0">Sign In</Link>
            <Link to="/register" className="btn-primary py-1.5 sm:py-2 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap shrink-0">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium mb-8">
            <Star className="w-4 h-4" />
            AI-Powered Code Analysis
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6">
            Review Code
            <span className="block gradient-text">Smarter, Not Harder</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Get instant, AI-powered feedback on your code. Detect bugs, security issues, and performance problems before they reach production.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="btn-primary px-8 py-3.5 text-base"
              id="hero-cta-btn"
            >
              Start Reviewing Free
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn-secondary px-8 py-3.5 text-base"
            >
              Sign In
            </button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-16">
            {[
              { value: '6+', label: 'Languages' },
              { value: '2-Stage', label: 'Analysis' },
              { value: 'Real-time', label: 'Results' },
              { value: 'AI + Static', label: 'Combined' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold gradient-text">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-surface-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Everything You Need</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              A complete code review toolkit powered by industry-standard tools and cutting-edge AI.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="card group hover:border-brand-600/40 transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} p-0.5 mb-5`}>
                  <div className="w-full h-full rounded-[10px] bg-surface-900 flex items-center justify-center">
                    <f.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Who Is It For?</h2>
            <p className="text-slate-400 text-lg">Built for every developer at every stage.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {USE_CASES.map((uc) => (
              <div key={uc.title} className={`card border ${uc.bg} transition-all duration-300 hover:-translate-y-1`}>
                <div className={`w-10 h-10 rounded-xl ${uc.bg} border flex items-center justify-center mb-4`}>
                  <uc.icon className={`w-5 h-5 ${uc.color}`} />
                </div>
                <h3 className={`font-bold text-lg mb-2 ${uc.color}`}>{uc.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="card bg-gradient-to-br from-brand-900/50 to-violet-900/30 border-brand-600/30">
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Write Better Code?</h2>
            <p className="text-slate-400 mb-8">Join developers who use AI-powered reviews to ship better code faster.</p>
            <button
              onClick={() => navigate('/register')}
              className="btn-primary px-10 py-4 text-base"
              id="landing-bottom-cta"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-800 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-500" />
            <span>AI Code Review Assistant</span>
          </div>
          <p>Built with React, Express & OpenRouter AI</p>
        </div>
      </footer>
    </div>
  );
}
