export const environment = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  dataProvider: (
    (typeof window !== 'undefined' ? localStorage.getItem('VITE_DATA_PROVIDER') : null) || 
    import.meta.env.VITE_DATA_PROVIDER || 
    'local'
  ) as 'local' | 'supabase',
};
