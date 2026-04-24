import { useState } from 'react';
import { 
  Folder, Home, Car, ShoppingBag, Utensils, Heart, Plane, Briefcase, 
  Gift, Sparkles, Music, Gamepad2, GraduationCap, Shirt, Pill, 
  Building, Wallet, CreditCard, Receipt, Tag, Coffee, Tv, Dumbbell,
  Baby, Smartphone, Wrench, Zap, Droplet, Wifi, Book
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const iconOptions = [
  { name: 'folder', icon: Folder, label: 'Folder' },
  { name: 'home', icon: Home, label: 'Home' },
  { name: 'car', icon: Car, label: 'Car' },
  { name: 'shopping-bag', icon: ShoppingBag, label: 'Shopping' },
  { name: 'utensils', icon: Utensils, label: 'Food' },
  { name: 'heart', icon: Heart, label: 'Health' },
  { name: 'plane', icon: Plane, label: 'Travel' },
  { name: 'briefcase', icon: Briefcase, label: 'Work' },
  { name: 'gift', icon: Gift, label: 'Gifts' },
  { name: 'sparkles', icon: Sparkles, label: 'Entertainment' },
  { name: 'music', icon: Music, label: 'Music' },
  { name: 'gamepad-2', icon: Gamepad2, label: 'Gaming' },
  { name: 'graduation-cap', icon: GraduationCap, label: 'Education' },
  { name: 'shirt', icon: Shirt, label: 'Clothing' },
  { name: 'pill', icon: Pill, label: 'Medicine' },
  { name: 'building', icon: Building, label: 'Housing' },
  { name: 'wallet', icon: Wallet, label: 'Finance' },
  { name: 'credit-card', icon: CreditCard, label: 'Payments' },
  { name: 'receipt', icon: Receipt, label: 'Bills' },
  { name: 'tag', icon: Tag, label: 'Other' },
  { name: 'coffee', icon: Coffee, label: 'Coffee' },
  { name: 'tv', icon: Tv, label: 'TV' },
  { name: 'dumbbell', icon: Dumbbell, label: 'Fitness' },
  { name: 'baby', icon: Baby, label: 'Kids' },
  { name: 'smartphone', icon: Smartphone, label: 'Tech' },
  { name: 'wrench', icon: Wrench, label: 'Repairs' },
  { name: 'zap', icon: Zap, label: 'Utilities' },
  { name: 'droplet', icon: Droplet, label: 'Water' },
  { name: 'wifi', icon: Wifi, label: 'Internet' },
  { name: 'book', icon: Book, label: 'Books' },
];

export const getIconComponent = (iconName: string) => {
  const iconOption = iconOptions.find(opt => opt.name === iconName);
  return iconOption?.icon || Folder;
};

interface IconPickerProps {
  selectedIcon: string;
  onIconChange: (icon: string) => void;
  color?: string;
}

const IconPicker = ({ selectedIcon, onIconChange, color = '#6b7280' }: IconPickerProps) => {
  const [open, setOpen] = useState(false);
  const SelectedIconComponent = getIconComponent(selectedIcon);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10"
          style={{ borderColor: color }}
        >
          <SelectedIconComponent className="h-5 w-5" style={{ color }} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="grid grid-cols-6 gap-2">
          {iconOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <Button
                key={option.name}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9",
                  selectedIcon === option.name && "bg-primary/10 ring-2 ring-primary"
                )}
                onClick={() => {
                  onIconChange(option.name);
                  setOpen(false);
                }}
                title={option.label}
              >
                <IconComponent className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default IconPicker;
