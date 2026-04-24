
import { Button } from '@/components/ui/button';
import { Settings, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import CurrencySelector from '@/components/CurrencySelector';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface AppHeaderProps {
  displayCurrency: string;
  onCurrencyChange: (currency: string) => void;
  includeHouseholdData: boolean;
  onToggleHouseholdData: (value: boolean) => void;
  showHouseholdToggle?: boolean;
}

const AppHeader = ({ displayCurrency, onCurrencyChange, includeHouseholdData, onToggleHouseholdData, showHouseholdToggle = true }: AppHeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  return (
    <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-mint">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Budget Tracker
          </h1>
          <p className="text-muted-foreground">Welcome back, {user?.email?.split('@')[0]}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        {showHouseholdToggle && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-full border-2 border-border bg-card shadow-soft">
            <Switch
              id="household-toggle"
              checked={includeHouseholdData}
              onCheckedChange={onToggleHouseholdData}
              className="data-[state=checked]:bg-primary"
            />
            <Label htmlFor="household-toggle" className="cursor-pointer text-sm font-medium">
              Include household
            </Label>
          </div>
        )}
        <CurrencySelector 
          selectedCurrency={displayCurrency} 
          onCurrencyChange={onCurrencyChange}
        />
        <Button variant="outline" onClick={handleSettingsClick} className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </div>
    </div>
  );
};

export default AppHeader;
