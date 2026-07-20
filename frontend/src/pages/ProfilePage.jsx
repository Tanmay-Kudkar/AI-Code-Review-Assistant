import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { User, Mail, Save, Loader } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function ProfilePage() {
  useDocumentTitle('Profile Settings');
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', avatar: user?.avatar || '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ name: form.name, ...(form.avatar ? { avatar: form.avatar } : {}) });
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account information</p>
      </div>

      {/* Avatar display */}
      <div className="card flex items-center gap-6">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 shadow-xl shadow-brand-900/30 overflow-hidden ${!form.avatar ? 'bg-gradient-to-br from-brand-400 to-violet-500' : 'bg-surface-800'}`}>
          {form.avatar ? (
            <img src={form.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            user?.name?.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <p className="text-xl font-bold text-white">{user?.name}</p>
          <p className="text-slate-400 text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSubmit} className="card">
        <h2 className="font-semibold text-white mb-5">Edit Profile</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div>
            <label className="label">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                id="profile-name"
                type="text"
                className="input pl-10"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                className="input pl-10 opacity-50 cursor-not-allowed"
                value={user?.email}
                disabled
                title="Email cannot be changed"
              />
            </div>
            <p className="text-xs text-slate-600 mt-1">Email address cannot be changed</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="label">Profile Picture <span className="text-slate-500 font-normal">(optional)</span></label>
          <input
            id="profile-avatar"
            type="file"
            accept="image/*"
            className="input cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-500/10 file:text-brand-400 hover:file:bg-brand-500/20 text-slate-400"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  setForm({ ...form, avatar: reader.result });
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        </div>

        <button id="profile-save-btn" type="submit" className="btn-primary" disabled={loading}>
          {loading
            ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</>
            : <><Save className="w-4 h-4" /> Save Changes</>
          }
        </button>
      </form>
    </div>
  );
}
