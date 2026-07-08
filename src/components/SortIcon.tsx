import { ArrowDown, ArrowUp } from 'lucide-react';
import type { SortConfig } from '../hooks/useTableSort';

interface SortIconProps {
  columnKey: string;
  sortConfig: SortConfig<any> | null;
}

export default function SortIcon({ columnKey, sortConfig }: SortIconProps) {
  if (sortConfig?.key !== columnKey) {
    return <ArrowDown className="w-3 h-3 inline ml-1 text-slate-300" />;
  }
  return sortConfig.direction === 'asc' 
    ? <ArrowUp className="w-3 h-3 inline ml-1 text-brand-500" /> 
    : <ArrowDown className="w-3 h-3 inline ml-1 text-brand-500" />;
}
