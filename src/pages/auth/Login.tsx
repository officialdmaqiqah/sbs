import React, { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert, LogIn, Lock, Mail } from 'lucide-react';

import { environment } from '../../config/environment';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  const from = location.state?.from?.pathname || '/';

  if (session) {
    return <Navigate to={from} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (environment.dataProvider === 'local') {
        localStorage.removeItem('local_logged_out');
        window.location.href = from;
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      
      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-200">
          
          {/* Logo Section */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="h-28 w-28 bg-white rounded-full flex items-center justify-center shadow-md p-1 border-2 border-sbs-gold-500 mb-4 overflow-hidden">
              <img
                src="/logo.jpg"
                alt="SBS Logo"
                className="h-full w-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = 'https://ui-avatars.com/api/?name=SBS&background=1e293b&color=eab308&size=128';
                }}
              />
            </div>
            <h2 className="text-center text-2xl font-extrabold text-slate-900 tracking-tight">
              Sultan Berkah Sejahtera
            </h2>
            <p className="mt-2 text-center text-sm text-slate-500 font-medium">
              Sistem Manajemen Bisnis & Operasional
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <div className="flex items-center">
                  <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0" aria-hidden="true" />
                  <p className="ml-3 text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="email-address" className="block text-sm font-semibold text-slate-700">
                  Email Address
                </label>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  </div>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full pl-10 rounded-lg border-0 py-2.5 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sbs-gold-500 sm:text-sm sm:leading-6 transition-all"
                    placeholder="admin@sbs.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="block w-full pl-10 rounded-lg border-0 py-2.5 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sbs-gold-500 sm:text-sm sm:leading-6 transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-sbs-gold-600 focus:ring-sbs-gold-600"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600">
                  Ingat Saya
                </label>
              </div>

              <div className="text-sm leading-6">
                <a href="#" className="font-semibold text-brand-600 hover:text-brand-500 transition-colors">
                  Lupa password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-lg bg-navy-800 px-3 py-3 text-sm font-semibold text-white shadow-md hover:bg-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-5 w-5" />
                    Masuk ke Sistem
                  </span>
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
             <p className="text-center text-xs text-slate-400">
              © {new Date().getFullYear()} Sultan Berkah Sejahtera. All rights reserved.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
