import { useState } from 'react';
import { FileSpreadsheet, Link2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const SpreadsheetSetup = () => {
  const { user, createNewSpreadsheet, connectToSpreadsheet } = useAuth();
  const { toast } = useToast();
  const [joinInput, setJoinInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createNewSpreadsheet();
      toast({ title: 'Spreadsheet created', description: 'Your budget spreadsheet is ready.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create spreadsheet';
      toast({ variant: 'destructive', title: 'Error', description: message });
    } finally {
      setCreating(false);
    }
  };

  const handleConnect = async () => {
    if (!joinInput.trim()) return;
    setConnecting(true);
    try {
      await connectToSpreadsheet(joinInput.trim());
      toast({ title: 'Connected', description: 'Spreadsheet linked successfully.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to spreadsheet';
      toast({ variant: 'destructive', title: 'Error', description: message });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center mb-8">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-teal-600" />
          <h1 className="text-2xl font-semibold">Set up your budget spreadsheet</h1>
          <p className="text-muted-foreground mt-1">
            Signed in as <span className="font-medium">{user?.email}</span>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create a new spreadsheet
            </CardTitle>
            <CardDescription>
              A new Google Spreadsheet will be created in your Drive with all the required budget tabs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={handleCreate} disabled={creating || connecting}>
              {creating ? 'Creating…' : 'Create spreadsheet'}
            </Button>
          </CardContent>
        </Card>

        <div className="relative flex items-center">
          <div className="flex-1 border-t" />
          <span className="mx-4 text-xs text-muted-foreground uppercase tracking-wide">or</span>
          <div className="flex-1 border-t" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Join an existing spreadsheet
            </CardTitle>
            <CardDescription>
              Paste the Google Sheets URL or spreadsheet ID shared with you by a household member.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Paste spreadsheet URL or ID"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              disabled={creating || connecting}
            />
            <Button
              className="w-full"
              variant="outline"
              onClick={handleConnect}
              disabled={!joinInput.trim() || creating || connecting}
            >
              {connecting ? 'Connecting…' : 'Connect to spreadsheet'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SpreadsheetSetup;
