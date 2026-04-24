import { Button } from '@/components/ui/button';
import { Home, DollarSign, Upload, CreditCard, Users, PiggyBank } from 'lucide-react';

interface AppNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AppNavigation = ({
  activeTab,
  onTabChange
}: AppNavigationProps) => {
  const tabs = [{
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home
  }, {
    id: 'expenses',
    label: 'Expenses',
    icon: CreditCard
  }, {
    id: 'income',
    label: 'Income',
    icon: DollarSign
  }, {
    id: 'savings',
    label: 'Savings',
    icon: PiggyBank
  }, {
    id: 'debt',
    label: 'Household',
    icon: Users
  }];

  return (
    <div className="flex gap-3 flex-wrap p-2 bg-card rounded-2xl shadow-soft border border-border">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <Button
            key={tab.id}
            variant={isActive ? "default" : "ghost"}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 transition-all duration-200 ${
              isActive 
                ? "shadow-pink" 
                : "hover:bg-pink-light"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default AppNavigation;
