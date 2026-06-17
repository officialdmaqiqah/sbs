# SBS GAP ANALYSIS

Analisis kondisi sistem saat ini berbanding dengan tujuan Project-First dan UMKM-Friendly.

## Kategori Fitur
**A. Fitur sudah ada dan sesuai:**
- Dashboard dasar
- Laporan standar

**B. Fitur sudah ada tapi perlu rename/move:**
- Inventory → Stok (Move ke Operasional)
- Purchase → Pengadaan Barang (Move ke Operasional)
- Sales → Penjualan (Menu Utama)
- Finance → Keuangan (Rename, simplify UI)
- User Role → Pindah ke Pengaturan

**C. Fitur sudah ada tapi terlalu teknis:**
- Jurnal Akuntansi (Istilah Debit, Kredit, Jurnal)
- Buku Besar (GL)
- Neraca Saldo (Trial Balance)
- Chart of Accounts (COA)
*(Solusi: Hapus/Drop fitur teknis akuntansi ini sepenuhnya agar tidak membingungkan).*

**D. Fitur belum ada tapi wajib (Core):**
- System mapping semua form input untuk `project_id`.
- Fitur Bundle: Produk Paket Usaha (Ayam + Kandang + Pakan).
- Modul Produksi Kandang.
- Modul Racik Pakan.
- Operasional detail ayam (sakit, mati, hilang).
- Setup Modal Investor & Bagi Hasil Project.
- Manajemen Pos Kas & Bank (Kas, Rekening Bank 1, Rekening Bank 2, dll).
- Fitur Mutasi Uang antar pos kas/bank.

**E. Fitur belum ada tapi bisa nanti:**
- Export dashboard analytics yang lebih dalam.
- Full automation akuntansi lanjutan.
- Manajemen Reseller / Marketing Partner detail komisi.

---

## Prioritas Pengembangan (Roadmap)

### P0 (Kritis & Wajib Segera)
- Setup Project-first (Wajib project_id di setiap transaksi).
- Penyesuaian User & Role sesuai jabatan SBS (CEO, Finance & Marketing, Produksi, Distribusi).
- Stok inventory yang terpisah per project.
- Pengadaan barang terkoneksi langsung ke stok + finance.
- Fitur Produk Paket Usaha.
- Penjualan Paket Usaha yang secara otomatis mengurangi stok (ayam, kandang, pakan).
- Keuangan (Uang masuk/keluar, hutang/piutang) bersifat project-based.
- Manajemen Pos Kas & Bank serta Mutasi antar pos kas/bank.
- Laporan project-based (Laba Rugi per project).

### P1 (Penting, Tahap Kedua)
- Modul Produksi Kandang (Konversi bahan baku -> barang jadi).
- Modul Racik Pakan (Konversi bahan pakan -> pakan jadi).
- Modul Operasional Ayam (Tracking penyusutan ayam akibat sakit/mati).
- Modul Distribusi & Logistik Pengiriman.
- Fitur pendataan Reseller / Marketing partner.

### P2 (Nice to Have, Lanjutan)
- Automation lanjutan untuk pengingat atau notifikasi.
- Export laporan komprehensif (PDF/Excel) tingkat detail.
- Dashboard analytics dan visualisasi data.
