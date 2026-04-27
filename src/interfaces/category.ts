export interface Category {
  id: string;
  name: string;
  color: string;
  group_id?: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
  // Present when this group is a household_category_group; absent for
  // user-level groups (which never have one in this app today).
  household_id?: string;
  categories: Category[];
}
