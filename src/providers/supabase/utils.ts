export function handleSupabaseError(error: any): never {
  if (!error) throw new Error('Unknown error occurred');
  
  const msg = error.message || '';
  const code = error.code || '';

  // RLS
  if (code === '42501' || msg.includes('row-level security') || msg.includes('policy')) {
    throw new Error('Anda tidak memiliki akses');
  }

  // Unique constraint
  if (code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')) {
    throw new Error('Kode sudah digunakan');
  }

  // Foreign key
  if (code === '23503' || msg.includes('foreign key constraint')) {
    throw new Error('Data terkait masih digunakan dan tidak dapat dihapus/diubah');
  }

  // Check constraint
  if (code === '23514' || msg.includes('check constraint')) {
    if (msg.includes('quantity')) throw new Error('Jumlah harus lebih dari 0');
    if (msg.includes('stock')) throw new Error('Stok tidak mencukupi');
    throw new Error('Validasi data gagal');
  }

  // Null constraint
  if (code === '23502' || msg.includes('not-null constraint') || msg.includes('null value in column')) {
    throw new Error('Data wajib belum lengkap');
  }

  // RPC specific custom exceptions
  if (msg.includes('Insufficient stock') || msg.includes('not enough')) {
    throw new Error('Stok tidak mencukupi');
  }
  if (msg.includes('Duplicate transaction')) {
    throw new Error('Transaksi ini sudah pernah diproses');
  }
  if (msg.includes('Quantity must be greater than 0')) {
    throw new Error('Jumlah harus lebih dari 0');
  }
  if (msg.includes('cannot be null') || msg.includes('required')) {
    throw new Error('Data wajib belum lengkap');
  }

  // General Network / Supabase Connection / Missing Env
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
    throw new Error('Koneksi database gagal');
  }
  if (msg.includes('supabaseUrl is required') || msg.includes('supabaseKey is required') || msg.includes('URL is required')) {
    throw new Error('Konfigurasi Supabase belum lengkap');
  }

  // Fallback for unmapped errors
  throw new Error(`Sistem error: ${msg}`);
}
