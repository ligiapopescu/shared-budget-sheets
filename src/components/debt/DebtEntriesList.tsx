import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, ArrowUp, ArrowDown, User, ChevronDown, ChevronRight, Plus, Check, Undo2, Edit, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { DebtEntry, HouseholdPerson } from '@/interfaces/debt';
import { useDateFormatPreference } from '@/hooks/useDateFormatPreference';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface MonthGroup {
  monthKey: string;
  monthLabel: string;
  sharedExpenses: DebtEntry[];
  individualEntries: DebtEntry[];
  totalOwed: number;
  totalOwe: number;
}

interface PersonGroup {
  person: HouseholdPerson;
  months: MonthGroup[];
  totalOwed: number;
  totalOwe: number;
}

interface DebtEntriesListProps {
  debtEntries: DebtEntry[];
  householdPersons: HouseholdPerson[];
  onUpdateDebtEntry: (id: string, debtData: Partial<DebtEntry>) => void;
  onDeleteDebtEntry: (id: string) => void;
  onAddDebtEntry: () => void;
  onEditDebtEntry?: (entry: DebtEntry) => void;
  displayCurrency: string;
  convertAmount: (amount: number, fromCurrency: string, toCurrency: string) => number;
}

const DebtEntriesList = ({ 
  debtEntries, 
  householdPersons, 
  onUpdateDebtEntry, 
  onDeleteDebtEntry, 
  onAddDebtEntry,
  onEditDebtEntry,
  displayCurrency, 
  convertAmount 
}: DebtEntriesListProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dateFormat } = useDateFormatPreference();
  const [expandedPersons, setExpandedPersons] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewText, setPreviewText] = useState('');

  // Helper to get the display name for a household person (the OTHER person in the relationship)
  const getDisplayPerson = (householdPerson: HouseholdPerson) => {
    // If I'm the connected user AND I'm not the creator, show the creator
    if (householdPerson.connected_user_id === user?.id && householdPerson.user_id !== user?.id) {
      return {
        name: householdPerson.creator?.full_name || householdPerson.creator?.email?.split('@')[0] || householdPerson.creator?.email || 'User',
        email: householdPerson.creator?.email,
      };
    }
    // If I'm the creator AND there's a different connected user, show them
    if (householdPerson.user_id === user?.id && householdPerson.connected_user_id && householdPerson.connected_user_id !== user?.id) {
      // The household person name is the other person
      return {
        name: householdPerson.name,
        email: householdPerson.email,
      };
    }
    // If both user_id and connected_user_id are me, it's my own entry - show the household person name
    return {
      name: householdPerson.name,
      email: householdPerson.email,
    };
  };

  const formatCurrency = (amount: number, currency: string) => {
    const convertedAmount = convertAmount(amount, currency, displayCurrency);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
    }).format(convertedAmount);
  };

  const generateMonthSummaryText = (personName: string, monthGroup: MonthGroup) => {
    let text = `${personName}\n`;
    text += `${monthGroup.monthLabel}\n`;
    text += `${'='.repeat(50)}\n\n`;

    // Combine all entries and sort by date
    const allEntries = [...monthGroup.sharedExpenses, ...monthGroup.individualEntries];
    allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    allEntries.forEach(entry => {
      const effectiveType = entry.user_id !== user?.id 
        ? (entry.type === 'owe_me' ? 'i_owe' : 'owe_me')
        : entry.type;
      const sign = effectiveType === 'owe_me' ? '+' : '-';
      const resolvedLabel = entry.resolved ? ' [RESOLVED]' : '';
      const currencySymbol = entry.currency === 'RON' ? 'RON' : entry.currency;
      text += `  • ${format(new Date(entry.date), dateFormat)} ${entry.description || '—'} ${sign}${currencySymbol} ${entry.amount}${resolvedLabel}\n`;
    });

    // Month Total
    const monthNetAmount = monthGroup.totalOwed - monthGroup.totalOwe;
    text += `\n${'-'.repeat(50)}\n`;
    text += `Month total: `;
    if (monthNetAmount !== 0) {
      const sign = monthNetAmount > 0 ? '+' : '-';
      text += `${sign}${displayCurrency} ${Math.abs(monthNetAmount).toFixed(2)}\n`;
    } else {
      text += `${displayCurrency} 0.00\n`;
    }

    return text;
  };

  const generatePersonSummaryText = (personGroup: PersonGroup) => {
    let text = `${personGroup.person.name}\n`;
    text += `${'='.repeat(50)}\n\n`;

    personGroup.months.forEach((monthGroup, index) => {
      text += `${monthGroup.monthLabel}\n`;
      text += `${'-'.repeat(50)}\n`;

      // Combine all entries and sort by date
      const allEntries = [...monthGroup.sharedExpenses, ...monthGroup.individualEntries];
      allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      allEntries.forEach(entry => {
        const effectiveType = entry.user_id !== user?.id 
          ? (entry.type === 'owe_me' ? 'i_owe' : 'owe_me')
          : entry.type;
        const sign = effectiveType === 'owe_me' ? '+' : '-';
        const resolvedLabel = entry.resolved ? ' [RESOLVED]' : '';
        const currencySymbol = entry.currency === 'RON' ? 'RON' : entry.currency;
        text += `  • ${format(new Date(entry.date), dateFormat)} ${entry.description || '—'} ${sign}${currencySymbol} ${entry.amount}${resolvedLabel}\n`;
      });

      // Month subtotal
      const monthNetAmount = monthGroup.totalOwed - monthGroup.totalOwe;
      text += `  Month total: `;
      if (monthNetAmount !== 0) {
        const sign = monthNetAmount > 0 ? '+' : '-';
        text += `${sign}${displayCurrency} ${Math.abs(monthNetAmount).toFixed(2)}\n`;
      } else {
        text += `${displayCurrency} 0.00\n`;
      }

      if (index < personGroup.months.length - 1) {
        text += `\n`;
      }
    });

    // Overall Total
    const netAmount = personGroup.totalOwed - personGroup.totalOwe;
    text += `\n${'='.repeat(50)}\n`;
    text += `OVERALL TOTAL: `;
    if (netAmount !== 0) {
      const sign = netAmount > 0 ? '+' : '-';
      text += `${sign}${displayCurrency} ${Math.abs(netAmount).toFixed(2)}\n`;
    } else {
      text += `${displayCurrency} 0.00\n`;
    }

    return text;
  };

  const showPreview = (text: string) => {
    setPreviewText(text);
    setPreviewDialogOpen(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      toast.success('Summary copied to clipboard');
      setPreviewDialogOpen(false);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Group debt entries by the "other person" (not me)
  const groupedData = useMemo((): PersonGroup[] => {
    const groups = new Map<string, any>();

    // Filter entries to only show those involving the current user
    const relevantEntries = debtEntries.filter(entry => {
      // Entry created by current user
      if (entry.user_id === user?.id) return true;
      
      // Entry is about a household_person connected to current user
      const householdPerson = householdPersons.find(p => p.id === entry.household_person_id);
      if (householdPerson?.connected_user_id === user?.id) return true;
      
      return false;
    });

    // Include all relevant debt entries, including resolved ones
    relevantEntries.forEach(entry => {
      // Use the pre-calculated otherPersonHouseholdId as the group key
      const groupKey = entry.otherPersonHouseholdId;
      
      if (!groupKey) {
        console.warn('Entry missing otherPersonHouseholdId:', entry);
        return;
      }
      
      // Find the household person for this group
      const otherPerson = householdPersons.find(p => p.id === groupKey);
      
      if (!otherPerson) {
        console.warn(`Household person not found for ID: ${groupKey}`);
        return;
      }
      
      // Get display name using the existing helper
      const displayPerson = getDisplayPerson(otherPerson);
      
      // Initialize group if it doesn't exist
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          person: {
            id: groupKey,
            name: displayPerson.name,
            email: displayPerson.email,
            user_id: otherPerson.user_id,
          } as HouseholdPerson,
          months: new Map<string, MonthGroup>(),
          totalOwed: 0,
          totalOwe: 0,
        });
      }

      const personGroup = groups.get(groupKey)!;
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

      if (!personGroup.months.has(monthKey)) {
        personGroup.months.set(monthKey, {
          monthKey,
          monthLabel,
          sharedExpenses: [] as DebtEntry[],
          individualEntries: [] as DebtEntry[],
          totalOwed: 0,
          totalOwe: 0,
        });
      }

      const monthGroup = personGroup.months.get(monthKey)!;
      const convertedAmount = convertAmount(entry.amount, entry.currency, displayCurrency);

      if (entry.expense_id) {
        monthGroup.sharedExpenses.push(entry);
      } else {
        monthGroup.individualEntries.push(entry);
      }

      // Determine effective type from current user's perspective
      let effectiveType = entry.type;
      if (entry.user_id !== user?.id) {
        // Invert the type when viewing someone else's entry
        effectiveType = entry.type === 'owe_me' ? 'i_owe' : 'owe_me';
      }

      // Only count unresolved entries in totals
      if (!entry.resolved) {
        if (effectiveType === 'owe_me') {
          monthGroup.totalOwed += convertedAmount;
          personGroup.totalOwed += convertedAmount;
        } else {
          monthGroup.totalOwe += convertedAmount;
          personGroup.totalOwe += convertedAmount;
        }
      }
    });

    // Convert maps to arrays and sort
    return Array.from(groups.values()).map(personGroup => ({
      ...personGroup,
      months: Array.from(personGroup.months.values()).sort((a: MonthGroup, b: MonthGroup) => b.monthKey.localeCompare(a.monthKey)),
    })).sort((a, b) => a.person.name.localeCompare(b.person.name));
  }, [debtEntries, householdPersons, convertAmount, displayCurrency, user]);

  const togglePersonExpanded = (personId: string) => {
    setExpandedPersons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(personId)) {
        newSet.delete(personId);
      } else {
        newSet.add(personId);
      }
      return newSet;
    });
  };

  const toggleMonthExpanded = (monthKey: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };

  if (debtEntries.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Debt Entries</h2>
            <p className="text-muted-foreground">Track money owed between household members</p>
          </div>
          <Button onClick={onAddDebtEntry}>
            <Plus className="w-4 h-4 mr-2" />
            Add Debt Entry
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No debt entries yet. Click "Add Debt Entry" to get started.</p>
            <Button onClick={onAddDebtEntry}>
              <Plus className="w-4 h-4 mr-2" />
              Add Debt Entry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Debt Entries</h2>
          <p className="text-muted-foreground">Track money owed between household members</p>
        </div>
        <Button onClick={onAddDebtEntry}>
          <Plus className="w-4 h-4 mr-2" />
          Add Debt Entry
        </Button>
      </div>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Debt Summary Preview</DialogTitle>
            <DialogDescription>
              Review the summary before copying
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-md">
              {previewText}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={copyToClipboard}>
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {groupedData.map((personGroup) => {
          const isPersonExpanded = expandedPersons.has(personGroup.person.id);
          const netAmount = personGroup.totalOwed - personGroup.totalOwe;
          
          return (
            <Card key={personGroup.person.id} className="overflow-hidden">
              <Collapsible
                open={isPersonExpanded}
                onOpenChange={() => togglePersonExpanded(personGroup.person.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isPersonExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle className="text-lg">{personGroup.person.name}</CardTitle>
                          {personGroup.person.email && (
                            <p className="text-sm text-muted-foreground">{personGroup.person.email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`font-medium ${netAmount > 0 ? 'text-green-600' : netAmount < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            Net: {formatCurrency(Math.abs(netAmount), displayCurrency)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {netAmount > 0 ? 'They owe you' : netAmount < 0 ? 'You owe them' : 'Even'}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            showPreview(generatePersonSummaryText(personGroup));
                          }}
                          title="Preview summary"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/debt/${personGroup.person.id}`);
                          }}
                        >
                          <User className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {personGroup.months.map((monthGroup: MonthGroup) => {
                        const monthKey = `${personGroup.person.id}-${monthGroup.monthKey}`;
                        const isMonthExpanded = expandedMonths.has(monthKey);
                        const monthNetAmount = monthGroup.totalOwed - monthGroup.totalOwe;

                        return (
                          <Card key={monthGroup.monthKey} className="border-l-4 border-l-primary/20">
                            <Collapsible
                              open={isMonthExpanded}
                              onOpenChange={() => toggleMonthExpanded(monthKey)}
                            >
                              <CollapsibleTrigger asChild>
                                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {isMonthExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                      )}
                                      <h4 className="font-medium">{monthGroup.monthLabel}</h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className={`font-medium text-sm ${monthNetAmount > 0 ? 'text-green-600' : monthNetAmount < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                        {formatCurrency(Math.abs(monthNetAmount), displayCurrency)}
                                      </div>
                                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            showPreview(generateMonthSummaryText(personGroup.person.name, monthGroup));
                                          }}
                                          title="Preview month summary"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                        {monthGroup.sharedExpenses.some(e => !e.resolved) || monthGroup.individualEntries.some(e => !e.resolved) ? (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const allEntries = [...monthGroup.sharedExpenses, ...monthGroup.individualEntries];
                                              allEntries.filter(entry => !entry.resolved).forEach(entry => {
                                                onUpdateDebtEntry(entry.id, { resolved: true });
                                              });
                                            }}
                                            title="Resolve all debts in this month"
                                          >
                                            <Check className="w-3 h-3 mr-1" />
                                            Resolve All
                                          </Button>
                                        ) : null}
                                        {monthGroup.sharedExpenses.some(e => e.resolved) || monthGroup.individualEntries.some(e => e.resolved) ? (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const allEntries = [...monthGroup.sharedExpenses, ...monthGroup.individualEntries];
                                              allEntries.filter(entry => entry.resolved).forEach(entry => {
                                                onUpdateDebtEntry(entry.id, { resolved: false });
                                              });
                                            }}
                                            title="Undo all resolved debts in this month"
                                          >
                                            <Undo2 className="w-3 h-3 mr-1" />
                                            Undo All
                                          </Button>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                </CardHeader>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <CardContent className="pt-0 pb-3">
                                  <div className="space-y-3">
                                    {/* Shared Expenses */}
                                    {monthGroup.sharedExpenses.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-medium text-muted-foreground mb-2">Shared Expenses</h5>
                                        <div className="space-y-2">
                                           {monthGroup.sharedExpenses.map((entry: DebtEntry) => {
                                              // Determine effective type from current user's perspective
                                              let effectiveType = entry.type;
                                              if (entry.user_id !== user?.id) {
                                                effectiveType = entry.type === 'owe_me' ? 'i_owe' : 'owe_me';
                                              }
                                              
                                              return (
                                             <div key={entry.id} className={`flex items-center justify-between p-3 bg-muted/30 rounded-md ${entry.resolved ? 'opacity-50' : ''}`}>
                                              <div className="flex-1">
                                                <div className={`font-medium ${entry.resolved ? 'line-through text-muted-foreground' : ''}`}>
                                                  {entry.description || '—'}
                                                </div>
                                                <div className={`text-sm text-muted-foreground ${entry.resolved ? 'line-through' : ''}`}>
                                                  {format(new Date(entry.date), dateFormat)}
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Badge variant={effectiveType === 'owe_me' ? 'default' : 'secondary'} className="flex items-center gap-1">
                                                  {effectiveType === 'owe_me' ? (
                                                    <>
                                                      <ArrowUp className="w-3 h-3" />
                                                      They owe me
                                                    </>
                                                  ) : (
                                                    <>
                                                      <ArrowDown className="w-3 h-3" />
                                                      I owe them
                                                    </>
                                                  )}
                                                </Badge>
                                                 <span className={`font-medium ${entry.resolved ? 'line-through text-muted-foreground' : effectiveType === 'owe_me' ? 'text-green-600' : 'text-red-600'}`}>
                                                   {formatCurrency(entry.amount, entry.currency)}
                                                 </span>
                                                 {entry.resolved ? (
                                                   <Button
                                                     size="sm"
                                                     variant="outline"
                                                     onClick={() => onUpdateDebtEntry(entry.id, { resolved: false })}
                                                     title="Undo resolution"
                                                   >
                                                     <Undo2 className="w-4 h-4" />
                                                   </Button>
                                                 ) : (
                                                   <Button
                                                     size="sm"
                                                     variant="outline"
                                                     onClick={() => onUpdateDebtEntry(entry.id, { resolved: true })}
                                                     title="Mark as resolved"
                                                   >
                                                     <Check className="w-4 h-4 text-green-600" />
                                                   </Button>
                                                 )}
                                                 {entry.user_id === user?.id && onEditDebtEntry && (
                                                   <Button
                                                     size="sm"
                                                     variant="outline"
                                                     onClick={() => onEditDebtEntry(entry)}
                                                     title="Edit entry"
                                                   >
                                                     <Edit className="w-4 h-4" />
                                                   </Button>
                                                 )}
                                                 {entry.user_id === user?.id && (
                                                    <AlertDialog>
                                                      <AlertDialogTrigger asChild>
                                                        <Button
                                                          size="sm"
                                                          variant="destructive"
                                                        >
                                                          <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                      </AlertDialogTrigger>
                                                      <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                          <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                                                          <AlertDialogDescription>
                                                            Are you sure you want to delete this debt entry? This action cannot be undone.
                                                          </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                          <AlertDialogAction
                                                            onClick={() => onDeleteDebtEntry(entry.id)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                          >
                                                            Delete
                                                          </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                      </AlertDialogContent>
                                                    </AlertDialog>
                                                  )}
                                              </div>
                                            </div>
                                          );
                                            })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Individual Entries */}
                                    {monthGroup.individualEntries.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-medium text-muted-foreground mb-2">Individual Entries</h5>
                                        <div className="space-y-2">
                                          {monthGroup.individualEntries.map((entry: DebtEntry) => {
                                              // Determine effective type from current user's perspective
                                              let effectiveType = entry.type;
                                              if (entry.user_id !== user?.id) {
                                                effectiveType = entry.type === 'owe_me' ? 'i_owe' : 'owe_me';
                                              }
                                              
                                              return (
                                             <div key={entry.id} className={`flex items-center justify-between p-3 bg-background border rounded-md ${entry.resolved ? 'opacity-50' : ''}`}>
                                              <div className="flex-1">
                                                <div className={`font-medium ${entry.resolved ? 'line-through text-muted-foreground' : ''}`}>
                                                  {entry.description || '—'}
                                                </div>
                                                <div className={`text-sm text-muted-foreground ${entry.resolved ? 'line-through' : ''}`}>
                                                  {format(new Date(entry.date), dateFormat)}
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Badge variant={effectiveType === 'owe_me' ? 'default' : 'secondary'} className="flex items-center gap-1">
                                                  {effectiveType === 'owe_me' ? (
                                                    <>
                                                      <ArrowUp className="w-3 h-3" />
                                                      They owe me
                                                    </>
                                                  ) : (
                                                    <>
                                                      <ArrowDown className="w-3 h-3" />
                                                      I owe them
                                                    </>
                                                  )}
                                                </Badge>
                                                 <span className={`font-medium ${entry.resolved ? 'line-through text-muted-foreground' : effectiveType === 'owe_me' ? 'text-green-600' : 'text-red-600'}`}>
                                                   {formatCurrency(entry.amount, entry.currency)}
                                                 </span>
                                                 {entry.resolved ? (
                                                   <Button
                                                     size="sm"
                                                     variant="outline"
                                                     onClick={() => onUpdateDebtEntry(entry.id, { resolved: false })}
                                                     title="Undo resolution"
                                                   >
                                                     <Undo2 className="w-4 h-4" />
                                                   </Button>
                                                 ) : (
                                                   <Button
                                                     size="sm"
                                                     variant="outline"
                                                     onClick={() => onUpdateDebtEntry(entry.id, { resolved: true })}
                                                     title="Mark as resolved"
                                                   >
                                                     <Check className="w-4 h-4 text-green-600" />
                                                   </Button>
                                                 )}
                                                 {entry.user_id === user?.id && onEditDebtEntry && (
                                                   <Button
                                                     size="sm"
                                                     variant="outline"
                                                     onClick={() => onEditDebtEntry(entry)}
                                                     title="Edit entry"
                                                   >
                                                     <Edit className="w-4 h-4" />
                                                   </Button>
                                                 )}
                                                 {entry.user_id === user?.id && (
                                                    <AlertDialog>
                                                      <AlertDialogTrigger asChild>
                                                        <Button
                                                          size="sm"
                                                          variant="destructive"
                                                        >
                                                          <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                      </AlertDialogTrigger>
                                                      <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                          <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                                                          <AlertDialogDescription>
                                                            Are you sure you want to delete this debt entry? This action cannot be undone.
                                                          </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                          <AlertDialogAction
                                                            onClick={() => onDeleteDebtEntry(entry.id)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                          >
                                                            Delete
                                                          </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                      </AlertDialogContent>
                                                    </AlertDialog>
                                                  )}
                                              </div>
                                            </div>
                                          );
                                            })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </CollapsibleContent>
                            </Collapsible>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DebtEntriesList;