import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Trash2, Edit, Bot } from 'lucide-react';
import { useAutomationRules } from '@/hooks/useAutomationRules';
import { AddAutomationRuleDialog } from './AddAutomationRuleDialog';
import { EditAutomationRuleDialog } from './EditAutomationRuleDialog';
import { ExpenseAutomationRule } from '@/interfaces';
import { useExpenseData } from '@/hooks/useExpenseData';
import { useHouseholdData } from '@/hooks/useHouseholdData';

const AutomationRulesManager = () => {
  const { rules, loading, deleteRule, toggleRule, refetch } = useAutomationRules();
  const { categories, categoryGroups } = useExpenseData();
  const { householdPersons } = useHouseholdData();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ExpenseAutomationRule | null>(null);

  const handleEdit = (rule: ExpenseAutomationRule) => {
    setEditingRule(rule);
    setEditDialogOpen(true);
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return '';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getCategoryGroupName = (groupId?: string) => {
    if (!groupId) return '';
    const group = categoryGroups.find(g => g.id === groupId);
    return group?.name || 'Unknown Group';
  };

  const getHouseholdPersonName = (personId?: string) => {
    if (!personId) return '';
    const person = householdPersons.find(p => p.id === personId);
    return person?.name || 'Unknown Person';
  };

  const getRuleDescription = (rule: ExpenseAutomationRule) => {
    if (rule.rule_type === 'delete') {
      const patterns = [];
      if (rule.merchant_pattern) patterns.push(`Merchant: ${rule.merchant_pattern}`);
      if (rule.description_pattern) patterns.push(`Description: ${rule.description_pattern}`);
      return `Delete expenses matching: ${patterns.join(' OR ')}`;
    } else {
      const parts = [];
      if (rule.merchant_pattern) parts.push(`Merchant: ${rule.merchant_pattern}`);
      if (rule.category_group_id) {
        parts.push(`Category Group: ${getCategoryGroupName(rule.category_group_id)}`);
      } else if (rule.category_id) {
        parts.push(`Category: ${getCategoryName(rule.category_id)}`);
      }
      if (rule.household_person_id && rule.split_amount) {
        const person = getHouseholdPersonName(rule.household_person_id);
        const amount = rule.split_method === 'percentage' 
          ? `${rule.split_amount}%` 
          : `$${rule.split_amount}`;
        parts.push(`Split ${amount} with ${person}`);
      }
      return `Auto-split when: ${parts.join(' AND ')}`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Automation Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading automation rules...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-white/80 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Automation Rules
        </CardTitle>
        <CardDescription>
          Configure automatic actions for expense processing during file uploads
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {rules.length} rule{rules.length !== 1 ? 's' : ''} configured
          </p>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </Button>
        </div>

        {rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No automation rules configured yet.</p>
            <p className="text-sm">Add rules to automatically process expenses during file uploads.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-background/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant={rule.rule_type === 'delete' ? 'destructive' : 'default'}
                      className="capitalize"
                    >
                      {rule.rule_type}
                    </Badge>
                    {!rule.is_active && (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </div>
                  <p className="text-sm">{getRuleDescription(rule)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(rule)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Automation Rule</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this automation rule? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteRule(rule.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        <AddAutomationRuleDialog 
          open={addDialogOpen} 
          onOpenChange={setAddDialogOpen}
          onSuccess={refetch}
        />
        
        {editingRule && (
          <EditAutomationRuleDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            rule={editingRule}
            onClose={() => {
              setEditDialogOpen(false);
              setEditingRule(null);
            }}
            onSuccess={refetch}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default AutomationRulesManager;