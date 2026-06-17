import { environment } from '../config/environment';
import type { DataProvider } from '../repositories/interfaces';
import { LocalDataProvider } from './LocalDataProvider';
import { SupabaseDataProvider } from './SupabaseDataProvider';

let dataProviderInstance: DataProvider | null = null;

export function getDataProvider(): DataProvider {
  if (!dataProviderInstance) {
    if (environment.dataProvider === 'supabase') {
      dataProviderInstance = new SupabaseDataProvider();
    } else {
      dataProviderInstance = new LocalDataProvider();
    }
  }
  return dataProviderInstance;
}
