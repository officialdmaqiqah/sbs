import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { environment } from '../config/environment';

export const ProtectedRoute: React.FC<{ children: React.ReactNode, requiredPermission?: string }> = ({ 
  children, 
  requiredPermission: _requiredPermission 
}) => {
  const { session, loading, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading session...</div>;
  }

  if (environment.dataProvider === 'supabase' && !session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasPermission = (permission: string) => {
    if (!profile) return false;
    // Minimal guard: INVESTOR cannot access PURCHASE
    if (permission === 'PURCHASE' && profile.role === 'INVESTOR') return false;
    return true; // allow others for now
  };

  if (environment.dataProvider === 'supabase' && _requiredPermission && !hasPermission(_requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
