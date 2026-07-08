import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
  key: keyof T | string;
  direction: SortDirection;
}

export function useTableSort<T>(items: T[], customSortValues?: Record<string, (item: T) => any>) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(null);

  const requestSort = (key: keyof T | string) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig) return items;

    return [...items].sort((a, b) => {
      let aVal: any = null;
      let bVal: any = null;

      if (customSortValues && customSortValues[sortConfig.key as string]) {
        aVal = customSortValues[sortConfig.key as string](a);
        bVal = customSortValues[sortConfig.key as string](b);
      } else {
        aVal = a[sortConfig.key as keyof T];
        bVal = b[sortConfig.key as keyof T];
      }

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortConfig, customSortValues]);

  return { sortedData, requestSort, sortConfig };
}
