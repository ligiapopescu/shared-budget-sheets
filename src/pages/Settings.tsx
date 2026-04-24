
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, LogOut, User, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import CategoryManager from '@/components/CategoryManager';
import CurrencySelector from '@/components/CurrencySelector';
import AutomationRulesManager from '@/components/settings/AutomationRulesManager';
import { useExpenseData } from '@/hooks/useExpenseData';
import { useCurrencyPreference } from '@/hooks/useCurrencyPreference';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDateFormatPreference } from '@/hooks/useDateFormatPreference';
import { useNumberFormatPreference } from '@/hooks/useNumberFormatPreference';
import { format } from 'date-fns';

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { displayCurrency, setDisplayCurrency } = useCurrencyPreference();
  const { dateFormat, setDateFormat } = useDateFormatPreference();
  const { numberFormat, setNumberFormat, formatNumber, formatOptions } = useNumberFormatPreference();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const { categories, setCategories } = useExpenseData();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-gray-600">Manage your preferences and account</p>
          </div>
          <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="space-y-6">
          {/* Profile & Authentication Section */}
          <Card className="backdrop-blur-sm bg-white/80 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile & Authentication
              </CardTitle>
              <CardDescription>
                Manage your account information and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Account Actions</h3>
                  <p className="text-sm text-gray-600">Sign out of your account</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleSignOut} 
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Currency Preferences Section */}
          <Card className="backdrop-blur-sm bg-white/80 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Currency Preferences
              </CardTitle>
              <CardDescription>
                Set your preferred currency for displaying amounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label htmlFor="currency-setting">Default Display Currency:</Label>
                <CurrencySelector 
                  selectedCurrency={displayCurrency} 
                  onCurrencyChange={setDisplayCurrency}
                />
              </div>
            </CardContent>
          </Card>

          {/* Date Format Section */}
          <Card className="backdrop-blur-sm bg-white/80 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Date Format
              </CardTitle>
              <CardDescription>
                Choose your preferred date display format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label htmlFor="date-format-setting">Default Date Format:</Label>
                <Select value={dateFormat} onValueChange={setDateFormat}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background">
                    <SelectItem value="M/dd/yyyy">{format(new Date(), 'M/dd/yyyy')}</SelectItem>
                    <SelectItem value="MM/dd/yyyy">{format(new Date(), 'MM/dd/yyyy')}</SelectItem>
                    <SelectItem value="dd.MM.yyyy">{format(new Date(), 'dd.MM.yyyy')}</SelectItem>
                    <SelectItem value="dd/MM/yyyy">{format(new Date(), 'dd/MM/yyyy')}</SelectItem>
                    <SelectItem value="yyyy-MM-dd">{format(new Date(), 'yyyy-MM-dd')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Number Format Section */}
          <Card className="backdrop-blur-sm bg-white/80 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Number Format
              </CardTitle>
              <CardDescription>
                Choose how numbers should be displayed throughout the app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label htmlFor="number-format-setting">Number Format:</Label>
                  <Select value={numberFormat} onValueChange={setNumberFormat}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-background">
                      {formatOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} - {option.example}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  Preview: {formatNumber(1234.56)} | {formatNumber(1234567.89)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categories Management Section */}
          <Card className="backdrop-blur-sm bg-white/80 shadow-xl">
            <CardHeader>
              <CardTitle>Categories Management</CardTitle>
              <CardDescription>
                Create, edit, and organize your expense categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryManager 
                categories={categories}
                onUpdateCategories={setCategories}
              />
            </CardContent>
          </Card>

          {/* Automation Rules Section */}
          <div id="automation-rules">
            <AutomationRulesManager />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
