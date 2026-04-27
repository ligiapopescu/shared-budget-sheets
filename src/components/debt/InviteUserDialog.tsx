import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Copy, Check } from 'lucide-react';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteUser: (householdPersonId: string, email: string) => Promise<{ joinUrl: string }>;
  householdPersonId: string;
  householdPersonName: string;
}

const InviteUserDialog = ({
  open,
  onOpenChange,
  onInviteUser,
  householdPersonId,
  householdPersonName,
}: InviteUserDialogProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const reset = () => {
    setEmail('');
    setJoinUrl(null);
    setCopied(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({ title: 'Error', description: 'Please enter an email address', variant: 'destructive' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: 'Error', description: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { joinUrl } = await onInviteUser(householdPersonId, email.trim());
      setJoinUrl(joinUrl);
      toast({
        title: 'Invitation ready',
        description: `${email} has been granted access. Send them the join link below.`,
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to create invitation. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: 'Copy failed', description: 'Select the link manually and copy it.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Invite User to Connect
          </DialogTitle>
        </DialogHeader>

        {joinUrl ? (
          <div className="space-y-4">
            <p className="text-sm">
              Send this link to <strong>{email}</strong>. After they sign in with the same Google account, they'll be connected to <strong>{householdPersonName}</strong> automatically.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={joinUrl} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label="Copy join link">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The link only works for the email above — Google will block sign-in from any other account.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Invite someone to connect with <strong>{householdPersonName}</strong>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                They'll be able to view and edit debts involving this person.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Preparing…' : 'Create Invitation'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;
