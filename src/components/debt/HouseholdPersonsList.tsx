import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, UserPlus, CheckCircle, Mail, Link, Unlink } from 'lucide-react';
import { HouseholdPerson } from '@/interfaces/debt';
import { format } from 'date-fns';
import { useDateFormatPreference } from '@/hooks/useDateFormatPreference';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import InviteUserDialog from './InviteUserDialog';

interface HouseholdPersonsListProps {
  householdPersons: HouseholdPerson[];
  onUpdatePerson: (id: string, personData: Partial<HouseholdPerson>) => void;
  onDeletePerson: (id: string) => void;
  onAddPerson: () => void;
  onInviteUser?: (householdPersonId: string, email: string) => Promise<void>;
  onUnlinkUser?: (householdPersonId: string) => Promise<void>;
}

const HouseholdPersonsList = ({ 
  householdPersons, 
  onUpdatePerson, 
  onDeletePerson, 
  onAddPerson,
  onInviteUser,
  onUnlinkUser
}: HouseholdPersonsListProps) => {
  const { dateFormat } = useDateFormatPreference();
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<HouseholdPerson>>({});
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedPersonForInvite, setSelectedPersonForInvite] = useState<{ id: string; name: string } | null>(null);
  const [showNameChangeConfirm, setShowNameChangeConfirm] = useState(false);
  const [pendingNameChange, setPendingNameChange] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<string | null>(null);

  const handleStartCellEdit = (itemId: string, columnId: string) => {
    const person = householdPersons.find(p => p.id === itemId);
    if (person) {
      // Don't allow email editing
      if (columnId === 'email') return;
      
      setEditingCell(`${itemId}-${columnId}`);
      setEditData(person);
    }
  };

  const handleSaveCellEdit = () => {
    if (editingCell && editData.id) {
      // Check if it's a name change
      if (editingCell.includes('-name')) {
        const person = householdPersons.find(p => p.id === editData.id);
        if (person && person.name !== editData.name) {
          // Show confirmation dialog
          setPendingNameChange({ id: editData.id, name: editData.name || '' });
          setShowNameChangeConfirm(true);
          return;
        }
      }
      
      onUpdatePerson(editData.id, editData);
    }
    setEditingCell(null);
    setEditData({});
  };

  const handleConfirmNameChange = () => {
    if (pendingNameChange) {
      onUpdatePerson(pendingNameChange.id, { name: pendingNameChange.name });
    }
    setShowNameChangeConfirm(false);
    setPendingNameChange(null);
    setEditingCell(null);
    setEditData({});
  };

  const handleCancelNameChange = () => {
    setShowNameChangeConfirm(false);
    setPendingNameChange(null);
    setEditingCell(null);
    setEditData({});
  };

  const handleInviteUser = (person: HouseholdPerson) => {
    setSelectedPersonForInvite({ id: person.id, name: person.name });
    setShowInviteDialog(true);
  };

  const handleInviteSubmit = async (householdPersonId: string, email: string) => {
    if (onInviteUser) {
      await onInviteUser(householdPersonId, email);
    }
  };

  const handleUnlinkUser = async (householdPersonId: string) => {
    if (onUnlinkUser && confirm('Are you sure you want to unlink this user?')) {
      await onUnlinkUser(householdPersonId);
    }
  };

  const handleDeletePerson = (personId: string) => {
    setPersonToDelete(personId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (personToDelete) {
      onDeletePerson(personToDelete);
    }
    setShowDeleteConfirm(false);
    setPersonToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setPersonToDelete(null);
  };

  const handleCancelCellEdit = () => {
    setEditingCell(null);
    setEditData({});
  };

  const columns: ColumnDef<HouseholdPerson>[] = [
    {
      id: 'name',
      header: 'Name',
      filterable: true,
      filterType: 'text',
      cell: (person, isEditing, editData, onEditDataChange, onStartEdit) => (
        isEditing ? (
          <Input
            value={editData.name || ''}
            onChange={(e) => onEditDataChange({ ...editData, name: e.target.value })}
            onBlur={handleSaveCellEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCellEdit();
              if (e.key === 'Escape') handleCancelCellEdit();
            }}
            className="w-full"
            autoFocus
          />
        ) : (
          <span 
            onClick={onStartEdit}
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block"
          >
            {person.name}
          </span>
        )
      ),
    },
    {
      id: 'email',
      header: 'Email',
      filterable: true,
      filterType: 'text',
      cell: (person) => (
        <span className="px-2 py-1 block">
          {person.email || '—'}
        </span>
      ),
    },
    {
      id: 'created_at',
      header: 'Added',
      filterable: true,
      filterType: 'date',
      cell: (person) => (
        <span>{format(new Date(person.created_at), dateFormat)}</span>
      ),
    },
    {
      id: 'connection_status',
      header: 'Connection',
      cell: (person) => (
        <div className="flex items-center gap-2">
          {person.connected_user_id ? (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Not Connected
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'include_in_household_view',
      header: 'Include in Household',
      cell: (person) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={person.include_in_household_view ?? true}
            onCheckedChange={(checked) => {
              onUpdatePerson(person.id, { include_in_household_view: checked as boolean });
            }}
          />
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      width: 'text-right',
      cell: (person) => (
        <div className="flex justify-end gap-2">
          {person.connected_user_id && onUnlinkUser && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUnlinkUser(person.id)}
              title="Unlink connected user"
            >
              <Unlink className="w-4 h-4" />
            </Button>
          )}
          {!person.connected_user_id && onInviteUser && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleInviteUser(person)}
              title="Invite user to connect"
            >
              <Link className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDeletePerson(person.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
      title="Household Members"
      description="Manage people in your household for debt tracking"
      data={householdPersons}
      columns={columns}
      keyField="id"
      editingCell={editingCell}
      editData={editData}
      onEditDataChange={setEditData}
      onStartCellEdit={handleStartCellEdit}
      onSaveCellEdit={handleSaveCellEdit}
      onCancelCellEdit={handleCancelCellEdit}
      onAddNew={onAddPerson}
      addNewLabel="Add Member"
      filters={{}}
      onFiltersChange={() => {}}
      emptyState={
        <div className="p-8 text-center text-gray-500">
          <p>No household members added yet. Click "Add Member" to get started.</p>
          <div className="flex justify-center gap-2 mt-4">
            <Button onClick={onAddPerson}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>
      }
    />

    <AlertDialog open={showNameChangeConfirm} onOpenChange={setShowNameChangeConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Name Change</AlertDialogTitle>
          <AlertDialogDescription>
            This name change will be visible to all members in the household. Are you sure you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelNameChange}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmNameChange}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Household Member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this household member? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {showInviteDialog && selectedPersonForInvite && (
      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInviteUser={handleInviteSubmit}
        householdPersonId={selectedPersonForInvite.id}
        householdPersonName={selectedPersonForInvite.name}
      />
    )}
    </>
  );
};

export default HouseholdPersonsList;