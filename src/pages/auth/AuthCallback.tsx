import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN') {
        navigate('/');
      }
    });
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-700">Verifying authentication...</h2>
        <p className="text-gray-500 mt-2">Please wait while we log you in.</p>
      </div>
    </div>
  );
}
