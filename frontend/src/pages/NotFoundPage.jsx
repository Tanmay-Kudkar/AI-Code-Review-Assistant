import { Link } from 'react-router-dom';
import { Zap, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4 text-center">
      <div className="animate-fade-in">
        <div className="text-8xl font-extrabold gradient-text mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-slate-400 mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn-primary justify-center">
          <Home className="w-4 h-4" /> Go Home
        </Link>
      </div>
    </div>
  );
}
