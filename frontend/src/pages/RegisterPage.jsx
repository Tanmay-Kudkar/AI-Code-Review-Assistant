import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Zap, User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    // Client-side validation
    const newErrors = {};
    if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (form.password !== form.confirm) {
      newErrors.confirm = 'Passwords do not match';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created! Welcome aboard 🎉');
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data?.details) {
        const fieldErrors = {};
        data.details.forEach(d => { fieldErrors[d.field] = d.message; });
        setErrors(fieldErrors);
      } else {
        toast.error(data?.error || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-violet-600/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 mb-4 shadow-xl shadow-brand-900/40">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create your account</h1>
          <p className="text-slate-400 mt-2">Start reviewing code with AI today</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.name ? 'text-red-400' : 'text-slate-500'}`} />
                <input id="register-name" type="text" className={`input pl-10 ${errors.name ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20 bg-red-500/5' : ''}`} placeholder="John Doe"
                  value={form.name} onChange={handleChange('name')} required autoComplete="name" />
              </div>
              {errors.name && (
                <div className="flex items-center gap-1.5 mt-1.5 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.email ? 'text-red-400' : 'text-slate-500'}`} />
                <input id="register-email" type="email" className={`input pl-10 ${errors.email ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20 bg-red-500/5' : ''}`} placeholder="you@example.com"
                  value={form.email} onChange={handleChange('email')} required autoComplete="email" />
              </div>
              {errors.email && (
                <div className="flex items-center gap-1.5 mt-1.5 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.password ? 'text-red-400' : 'text-slate-500'}`} />
                <input id="register-password" type={showPw ? 'text' : 'password'} className={`input pl-10 pr-10 ${errors.password ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20 bg-red-500/5' : ''}`}
                  placeholder="Min 8 characters" value={form.password} onChange={handleChange('password')} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <div className="flex items-center gap-1.5 mt-1.5 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.password}</span>
                </div>
              )}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.confirm ? 'text-red-400' : 'text-slate-500'}`} />
                <input id="register-confirm" type={showPw ? 'text' : 'password'} className={`input pl-10 ${errors.confirm ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20 bg-red-500/5' : ''}`}
                  placeholder="Repeat password" value={form.confirm} onChange={handleChange('confirm')} required />
              </div>
              {errors.confirm && (
                <div className="flex items-center gap-1.5 mt-1.5 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.confirm}</span>
                </div>
              )}
            </div>

            <button id="register-submit-btn" type="submit" className="btn-primary w-full justify-center py-3 mt-2" disabled={loading}>
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <> Create Account <ArrowRight className="w-4 h-4" /> </>
              }
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
