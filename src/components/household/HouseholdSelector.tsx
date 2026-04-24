import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users } from 'lucide-react';
import { useHouseholds } from '@/hooks/useHouseholds';
import { useHouseholdCategories } from '@/hooks/useHouseholdCategories';
import { format } from 'date-fns';
import { useDateFormatPreference } from '@/hooks/useDateFormatPreference';
import CreateHouseholdDialog from './CreateHouseholdDialog';
import CategoryMappingDialog from './CategoryMappingDialog';
import { Category } from '@/interfaces';

interface HouseholdSelectorProps {
  userCategories: Category[];
  onHouseholdJoined?: () => void;
}

const HouseholdSelector = ({ userCategories, onHouseholdJoined }: HouseholdSelectorProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { dateFormat } = useDateFormatPreference();
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>('');
  
  const { households, loading, createHousehold, joinHousehold, mapUserCategories } = useHouseholds();
  const { categories: householdCategories, refreshCategories } = useHouseholdCategories();

  const handleCreateHousehold = async (name: string) => {
    const household = await createHousehold(name);
    if (household && onHouseholdJoined) {
      onHouseholdJoined();
    }
  };

  const handleJoinHousehold = async (householdId: string) => {
    setSelectedHouseholdId(householdId);
    
    if (userCategories.length > 0) {
      // Load household categories for mapping
      await refreshCategories();
      setShowMappingDialog(true);
    } else {
      // No categories to map, join directly
      const success = await joinHousehold(householdId, []);
      if (success && onHouseholdJoined) {
        onHouseholdJoined();
      }
    }
  };

  const handleSaveMappings = async (mappings: Array<{ userCategoryId: string; householdCategoryId: string }>) => {
    const success = await mapUserCategories(selectedHouseholdId, mappings);
    if (success) {
      const joinSuccess = await joinHousehold(selectedHouseholdId, userCategories);
      if (joinSuccess && onHouseholdJoined) {
        onHouseholdJoined();
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading households...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Household Management
          </CardTitle>
          <CardDescription>
            Join an existing household or create a new one to share expenses with family or roommates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="w-full flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Household
          </Button>

          {households.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Available Households</h3>
              {households.map((household) => (
                <div key={household.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{household.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Created {format(new Date(household.created_at), dateFormat)}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleJoinHousehold(household.id)}
                  >
                    Join
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateHouseholdDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateHousehold={handleCreateHousehold}
      />

      <CategoryMappingDialog
        open={showMappingDialog}
        onOpenChange={setShowMappingDialog}
        userCategories={userCategories}
        householdCategories={householdCategories}
        onSaveMappings={handleSaveMappings}
      />
    </>
  );
};

export default HouseholdSelector;