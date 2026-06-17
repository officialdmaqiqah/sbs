# Aturan Bagi Hasil dan Pemisahan Kas Project (SBS)

Dokumen ini menjelaskan rancangan dasar untuk sistem Project-First dan skema Bagi Hasil di aplikasi Sultan Berkah Sejahtera (SBS).

## 1. Konsep Project-First

Sistem difokuskan pada unit usaha (Project) sebagai *Cost Center* dan *Profit Center*.
- Setiap Project memiliki Kas, Modal, Pendapatan, dan Biaya yang terisolasi.
- **Project Aktif**: Diatur melalui *Context* dan disimpan di *localStorage*. Ini membuat setiap input transaksi secara otomatis dikaitkan dengan Project yang sedang aktif.
- **Filter Global**: Halaman Laporan dan Mutasi Kas dapat difilter untuk melihat performa hanya pada Project tertentu, atau "All" untuk performa konsolidasi seluruh perusahaan.

## 2. Struktur Modal Project

Modal awal untuk setiap Project dicatat secara terpisah:
- **Investor Internal/Eksternal**: Dicatat di tabel `project_investments`.
- **Sinkronisasi ke Kas**: Uang yang masuk ke Project bisa langsung "Disinkronkan" (Dicatat ke `cash_bank_mutations` dengan referensi `PROJECT_CAPITAL`).
- Modal ini akan digunakan sebagai dasar pembagi persentase *Share* jika sistem bagi hasil diterapkan secara proporsional.

## 3. Sistem Bagi Hasil (Profit Sharing)

Sistem akan dikembangkan di fase berikutnya (P1), namun konsep dasarnya adalah:
1. **Laba Bersih Project**: Dihitung dari Total Pendapatan Project (AR/Mutasi IN) dikurangi Total Biaya Project (AP/Mutasi OUT).
2. **Distribusi**:
   - Persentase Pengelola (Misal: 30%)
   - Persentase Investor (Misal: 70%, dibagi proporsional berdasarkan `amount` di `project_investments`).
3. **Pencatatan Distribusi**: 
   - Hasil perhitungan akan dieksekusi menjadi transaksi pengeluaran (OUT) dari Kas Project, dan ditransfer ke akun Investor atau Kas Induk (untuk pengelola).
   - Project yang sudah dibagikan labanya akan diubah statusnya menjadi **Tutup Buku**.

## 4. Keamanan dan Validasi
- Tidak ada transaksi yang bisa diposting ke Project yang sudah berstatus "Tutup Buku".
- Pengambilan modal (Return of Capital) harus dibedakan dari Pembagian Keuntungan (Dividen).
