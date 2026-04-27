
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import SpreadsheetSetup from '@/pages/SpreadsheetSetup';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, spreadsheetId } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!spreadsheetId) {
    return <SpreadsheetSetup />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
