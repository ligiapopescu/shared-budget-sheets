
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Users } from 'lucide-react';
import { DebtEntry, HouseholdPerson } from '@/interfaces/debt';

interface DebtSummaryProps {
  debtEntries: DebtEntry[];
  householdPersons: HouseholdPerson[];
  displayCurrency: string;
  convertAmount: (amount: number, fromCurrency: string, toCurrency: string) => number;
  currentUserId: string;
}

const DebtSummary = ({ debtEntries, householdPersons, displayCurrency, convertAmount, currentUserId }: DebtSummaryProps) => {
  // Filter and map entries from current user's perspective
  const relevantActiveEntries = debtEntries
    .filter(entry => !entry.resolved)
    .filter(entry => {
      // Only include entries involving current user
      if (entry.user_id === currentUserId) return true;
      
      // Check if household person is connected to current user
      const householdPerson = householdPersons.find(p => p.id === entry.household_person_id);
      return householdPerson?.connected_user_id === currentUserId;
    })
    .map(entry => {
      // Invert type if not created by current user
      if (entry.user_id !== currentUserId) {
        return {
          ...entry,
          type: entry.type === 'owe_me' ? 'i_owe' : 'owe_me'
        };
      }
      return entry;
    });

  const totalOwedToMe = relevantActiveEntries
    .filter(entry => entry.type === 'owe_me')
    .reduce((sum, entry) => sum + convertAmount(entry.amount, entry.currency, displayCurrency), 0);

  const totalIOweThem = relevantActiveEntries
    .filter(entry => entry.type === 'i_owe')
    .reduce((sum, entry) => sum + convertAmount(entry.amount, entry.currency, displayCurrency), 0);

  const netBalance = totalOwedToMe - totalIOweThem;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Owed to Me</CardTitle>
          <ArrowUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totalOwedToMe)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">I Owe Them</CardTitle>
          <ArrowDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(totalIOweThem)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
          <div className={`h-4 w-4 ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {netBalance >= 0 ? <ArrowUp /> : <ArrowDown />}
          </div>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(netBalance))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Household Members</CardTitle>
          <Users className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {householdPersons.length}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebtSummary;
