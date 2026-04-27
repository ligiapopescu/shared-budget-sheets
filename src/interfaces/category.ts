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
  categories: Category[];
}
