import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useHouseholdData } from "@/hooks/useHouseholdData";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";
import { useCurrencyPreference } from "@/hooks/useCurrencyPreference";
import AddDebtEntryDialog from "@/components/debt/AddDebtEntryDialog";
import { DebtEntry } from "@/interfaces/debt";
import { format } from "date-fns";
import { useDateFormatPreference } from '@/hooks/useDateFormatPreference';
import DatePickerInput from '@/components/DatePickerInput';

const DebtManagement = () => {
  const { personId } = useParams();
  const navigate = useNavigate();
  const { householdPersons, debtEntries, loading, deleteDebtEntry, addDebtEntry, updateDebtEntry } = useHouseholdData();
  const { convertAmount } = useCurrencyConverter();
  const { displayCurrency, setDisplayCurrency } = useCurrencyPreference();
  const { dateFormat } = useDateFormatPreference();
  const [showAddDebtDialog, setShowAddDebtDialog] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<DebtEntry>>({});

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const person = householdPersons.find(p => p.id === personId);
  if (!person) {
    return <div className="flex items-center justify-center min-h-screen">Person not found</div>;
  }

  const personDebtEntries = debtEntries.filter(entry => entry.household_person_id === personId);
  
  console.log('=== DEBT MANAGEMENT COMPONENT DEBUG ===');
  console.log('personId:', personId);
  console.log('Total debt entries:', debtEntries.length);
  console.log('Person debt entries:', personDebtEntries.length);
  console.log('Person debt entries data:', personDebtEntries);

  // Calculate totals
  const totals = personDebtEntries.reduce(
    (acc, entry) => {
      const convertedAmount = convertAmount(entry.amount, entry.currency, displayCurrency);
      if (entry.type === 'owe_me') {
        acc.owesMe += convertedAmount;
      } else {
        acc.iOwe += convertedAmount;
      }
      return acc;
    },
    { owesMe: 0, iOwe: 0 }
  );

  const netAmount = totals.owesMe - totals.iOwe;

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm('Are you sure you want to delete this debt entry?')) {
      await deleteDebtEntry(entryId);
    }
  };

  const handleStartCellEdit = (itemId: string, columnId: string) => {
    const entry = personDebtEntries.find(e => e.id === itemId);
    if (entry) {
      setEditingCell(`${itemId}-${columnId}`);
      setEditData(entry);
    }
  };

  const handleSaveCellEdit = async () => {
    console.log('=== SAVE CELL EDIT DEBUG ===');
    console.log('editingCell:', editingCell);
    console.log('editData:', editData);
    
    if (editingCell && editData.id) {
      // Determine what field is being edited from the editingCell string
      const [entryId, fieldName] = editingCell.split('-');
      console.log('Entry ID:', entryId, 'Field being edited:', fieldName);
      
      // Only send the specific field that's being updated
      let updatePayload: Partial<DebtEntry> = {};
      if (fieldName === 'date' && editData.date) {
        updatePayload = { date: editData.date };
      } else if (fieldName === 'amount' && editData.amount !== undefined) {
        updatePayload = { amount: editData.amount };
      } else if (fieldName === 'currency' && editData.currency) {
        updatePayload = { currency: editData.currency };
      } else if (fieldName === 'description') {
        updatePayload = { description: editData.description || null };
      } else if (fieldName === 'type' && editData.type) {
        updatePayload = { type: editData.type };
      } else {
        // Fallback to original behavior for other fields
        updatePayload = editData;
      }
      
      console.log('Calling updateDebtEntry with payload:', updatePayload);
      await updateDebtEntry(editData.id, updatePayload);
      console.log('updateDebtEntry completed');
    }
    
    console.log('Clearing edit state...');
    setEditingCell(null);
    setEditData({});
  };

  const handleCancelCellEdit = () => {
    setEditingCell(null);
    setEditData({});
  };

  const columns: ColumnDef<DebtEntry>[] = [
    {
      id: 'date',
      header: 'Date',
      sortable: true,
      cell: (entry, isEditing, editData, onEditDataChange, onStartEdit) => {
        console.log('=== DATE CELL RENDER DEBUG ===');
        console.log('Entry ID:', entry.id);
        console.log('Entry date:', entry.date);
        console.log('Is editing:', isEditing);
        console.log('Edit data date:', editData?.date);
        
        return isEditing ? (
<DatePickerInput
          value={editData.date || ''}
          onChange={(val) => {
            console.log('DatePickerInput onChange called with:', val);
            onEditDataChange({ ...editData, date: val });
          }}
          onCommit={handleSaveCellEdit}
        />
        ) : (
          <span 
            onClick={onStartEdit}
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block"
          >
            {format(new Date(entry.date), dateFormat)}
          </span>
        );
      },
    },
    {
      id: 'type',
      header: 'Type',
      sortable: true,
      cell: (entry, isEditing, editData, onEditDataChange, onStartEdit) => (
        isEditing ? (
          <Select
            value={editData.type || ''}
            onValueChange={(value) => onEditDataChange({ ...editData, type: value as 'owe_me' | 'i_owe' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owe_me">They owe me</SelectItem>
              <SelectItem value="i_owe">I owe them</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span onClick={onStartEdit} className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block">
            <Badge variant={entry.type === 'owe_me' ? 'default' : 'destructive'}>
              {entry.type === 'owe_me' ? 'They owe me' : 'I owe them'}
            </Badge>
          </span>
        )
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      sortable: true,
      cell: (entry, isEditing, editData, onEditDataChange, onStartEdit) => (
        isEditing ? (
          <Input
            type="number"
            step="0.01"
            value={editData.amount || ''}
            onChange={(e) => onEditDataChange({ ...editData, amount: parseFloat(e.target.value) || 0 })}
            onBlur={handleSaveCellEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCellEdit();
              if (e.key === 'Escape') handleCancelCellEdit();
            }}
            autoFocus
          />
        ) : (
          <span 
            onClick={onStartEdit}
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block font-medium"
          >
            {entry.currency} {entry.amount}
            <span className="text-sm text-muted-foreground ml-2">
              ({displayCurrency} {convertAmount(entry.amount, entry.currency, displayCurrency).toFixed(2)})
            </span>
          </span>
        )
      ),
    },
    {
      id: 'currency',
      header: 'Currency',
      sortable: true,
      cell: (entry, isEditing, editData, onEditDataChange, onStartEdit) => (
        isEditing ? (
          <Select
            value={editData.currency || ''}
            onValueChange={(value) => onEditDataChange({ ...editData, currency: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="JPY">JPY</SelectItem>
              <SelectItem value="CAD">CAD</SelectItem>
              <SelectItem value="AUD">AUD</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span 
            onClick={onStartEdit}
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block"
          >
            {entry.currency}
          </span>
        )
      ),
    },
    {
      id: 'description',
      header: 'Description',
      cell: (entry, isEditing, editData, onEditDataChange, onStartEdit) => (
        isEditing ? (
          <Textarea
            value={editData.description || ''}
            onChange={(e) => onEditDataChange({ ...editData, description: e.target.value })}
            onBlur={handleSaveCellEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) handleSaveCellEdit();
              if (e.key === 'Escape') handleCancelCellEdit();
            }}
            autoFocus
            rows={2}
          />
        ) : (
          <span 
            onClick={onStartEdit}
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block"
          >
            {entry.description || 'No description'}
          </span>
        )
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      width: 'text-right',
      cell: (entry) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDeleteEntry(entry.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Household Debt Management
            </h1>
            <p className="text-gray-600 mt-2">Managing debt with {person.name}</p>
          </div>
          
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Household
            </Button>
            
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency-select" className="text-sm font-medium">
                Display Currency
              </Label>
              <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
                <SelectTrigger id="currency-select" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">They Owe Me</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {displayCurrency} {totals.owesMe.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">I Owe Them</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {displayCurrency} {totals.iOwe.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {displayCurrency} {Math.abs(netAmount).toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">
                {netAmount >= 0 ? 'They owe you' : 'You owe them'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {personDebtEntries.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Debt Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Debt Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              title="Debt Entries"
              description={`Track debt with ${person.name}`}
              data={personDebtEntries}
              columns={columns}
              keyField="id"
              editingCell={editingCell}
              editData={editData}
              onEditDataChange={setEditData}
              onStartCellEdit={handleStartCellEdit}
              onSaveCellEdit={handleSaveCellEdit}
              onCancelCellEdit={handleCancelCellEdit}
              onAddNew={() => setShowAddDebtDialog(true)}
              addNewLabel="Add Debt Entry"
              emptyState={
                <div className="text-center py-8 text-muted-foreground">
                  No debt entries found for {person.name}
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>

      <AddDebtEntryDialog
        open={showAddDebtDialog}
        onOpenChange={setShowAddDebtDialog}
        onAddDebtEntry={addDebtEntry}
        householdPersons={[person]}
      />
    </div>
  );
};

export default DebtManagement;