import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen } from 'lucide-react';
import { useHouseholdData } from '@/hooks/useHouseholdData';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import HouseholdPersonsList from './debt/HouseholdPersonsList';
import DebtEntriesList from './debt/DebtEntriesList';
import AddHouseholdPersonDialog from './debt/AddHouseholdPersonDialog';
import AddDebtEntryDialog from './debt/AddDebtEntryDialog';
import DebtSummary from './debt/DebtSummary';
import InvitationsList from './debt/InvitationsList';
import HouseholdCategoryManager from './HouseholdCategoryManager';
interface DebtTrackerProps {
  displayCurrency: string;
}
const DebtTracker = ({
  displayCurrency
}: DebtTrackerProps) => {
  const [showAddPersonDialog, setShowAddPersonDialog] = useState(false);
  const [showAddDebtDialog, setShowAddDebtDialog] = useState(false);
  const [editingDebtEntry, setEditingDebtEntry] = useState<any>(null);
  const {
    convertAmount
  } = useCurrencyConverter();
  const {
    householdPersons,
    debtEntries,
    invitations,
    loading,
    addHouseholdPerson,
    updateHouseholdPerson,
    deleteHouseholdPerson,
    addDebtEntry,
    updateDebtEntry,
    deleteDebtEntry,
    inviteUser,
    acceptInvitation,
    declineInvitation
  } = useHouseholdData();
  if (loading) {
    return <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading debt tracking data...</div>
      </div>;
  }
  const handleEditDebtEntry = (entry: any) => {
    setEditingDebtEntry(entry);
    setShowAddDebtDialog(true);
  };
  const handleCloseDebtDialog = (open: boolean) => {
    setShowAddDebtDialog(open);
    if (!open) {
      setEditingDebtEntry(null);
    }
  };
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Household Management</h2>
      </div>

      

      <Tabs defaultValue="debts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="debts">Shared Expenses</TabsTrigger>
          <TabsTrigger value="persons">Household Members</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations
            {invitations.filter(inv => inv.status === 'pending').length > 0 && <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                {invitations.filter(inv => inv.status === 'pending').length}
              </span>}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="debts" className="space-y-4">
          <DebtEntriesList debtEntries={debtEntries} householdPersons={householdPersons} onUpdateDebtEntry={updateDebtEntry} onDeleteDebtEntry={deleteDebtEntry} onAddDebtEntry={() => setShowAddDebtDialog(true)} onEditDebtEntry={handleEditDebtEntry} displayCurrency={displayCurrency} convertAmount={convertAmount} />
        </TabsContent>
        
        <TabsContent value="persons" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            
          </div>
          <HouseholdPersonsList householdPersons={householdPersons} onUpdatePerson={updateHouseholdPerson} onDeletePerson={deleteHouseholdPerson} onAddPerson={() => setShowAddPersonDialog(true)} onInviteUser={inviteUser} onUnlinkUser={async householdPersonId => {
          // Unlink by setting connected_user_id to null
          await updateHouseholdPerson(householdPersonId, {
            connected_user_id: null
          });
        }} />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <HouseholdCategoryManager />
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <InvitationsList invitations={invitations} onAcceptInvitation={acceptInvitation} onDeclineInvitation={declineInvitation} loading={loading} />
        </TabsContent>
      </Tabs>

      <AddHouseholdPersonDialog open={showAddPersonDialog} onOpenChange={setShowAddPersonDialog} onAddPerson={addHouseholdPerson} />

      <AddDebtEntryDialog open={showAddDebtDialog} onOpenChange={handleCloseDebtDialog} onAddDebtEntry={addDebtEntry} onUpdateDebtEntry={updateDebtEntry} householdPersons={householdPersons} editEntry={editingDebtEntry} />
    </div>;
};
export default DebtTracker;