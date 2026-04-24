import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const Auth = () => {
  const { user, loading, initiateLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Shared Budget Sheets
          </h1>
          <p className="text-gray-500 text-sm">
            Your family finances — always in sync, always in Google Sheets.
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Sign in to continue</CardTitle>
            <CardDescription>
              We'll create a Google Spreadsheet in your Drive on first sign-in.
              Family members can be added as editors to share the same sheet.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Button
              onClick={initiateLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 h-11 text-sm font-medium"
              variant="outline"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              {loading ? 'Connecting…' : 'Sign in with Google'}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400">
          Your data lives in a spreadsheet you own.
          <br />No separate account or password needed.
        </p>
      </div>
    </div>
  );
};

export default Auth;
