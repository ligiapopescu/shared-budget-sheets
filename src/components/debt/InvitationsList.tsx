import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HouseholdInvitation } from '@/interfaces/debt';
import { Check, X, Mail, Clock, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface InvitationsListProps {
  invitations: HouseholdInvitation[];
  onAcceptInvitation: (invitationId: string) => Promise<void>;
  onDeclineInvitation: (invitationId: string) => Promise<void>;
  loading?: boolean;
}

const InvitationsList = ({
  invitations,
  onAcceptInvitation,
  onDeclineInvitation,
  loading = false,
}: InvitationsListProps) => {
  const { user } = useAuth();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      await onAcceptInvitation(invitationId);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      await onDeclineInvitation(invitationId);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Loading invitations...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No invitations at this time
          </div>
        </CardContent>
      </Card>
    );
  }

  // Separate received and sent invitations
  const receivedInvitations = invitations.filter(inv => {
    // Match by invited_user_id if it's set
    if (inv.invited_user_id && inv.invited_user_id === user?.id) {
      return true;
    }
    // Match by email if invited_user_id is null (invitation not yet accepted)
    if (!inv.invited_user_id && inv.invited_email && user?.email) {
      return inv.invited_email.toLowerCase() === user.email.toLowerCase();
    }
    return false;
  });
  
  const sentInvitations = invitations.filter(inv => inv.inviter_user_id === user?.id);
  
  const pendingReceivedInvitations = receivedInvitations.filter(inv => inv.status === 'pending');
  const otherReceivedInvitations = receivedInvitations.filter(inv => inv.status !== 'pending');
  const pendingSentInvitations = sentInvitations.filter(inv => inv.status === 'pending');
  const otherSentInvitations = sentInvitations.filter(inv => inv.status !== 'pending');

  return (
    <div className="space-y-4">
      {pendingReceivedInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Pending Invitations (Received)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingReceivedInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">
                    {invitation.inviter?.full_name || invitation.inviter?.email || 'Someone'} invited you to join their household
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You'll be connected as: {invitation.household_person?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sent to: {invitation.invited_email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invitation.id)}
                    disabled={processingId === invitation.id}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecline(invitation.id)}
                    disabled={processingId === invitation.id}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {pendingSentInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Pending Invitations (Sent)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingSentInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">
                    Invitation to {invitation.household_person?.name || 'household member'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sent to: {invitation.invited_email}
                  </p>
                </div>
                <Badge variant="secondary">Pending</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {otherReceivedInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Invitations (Received)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {otherReceivedInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">
                    Invitation accepted from {invitation.inviter?.full_name || invitation.inviter?.email || 'Unknown'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You're connected as: {invitation.household_person?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(invitation.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={invitation.status === 'accepted' ? 'default' : 'secondary'}>
                  {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {otherSentInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Invitations (Sent)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {otherSentInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">
                    Invitation to {invitation.household_person?.name || invitation.invited_email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(invitation.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={invitation.status === 'accepted' ? 'default' : 'secondary'}>
                  {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InvitationsList;