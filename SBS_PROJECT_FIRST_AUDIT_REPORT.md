# SBS PROJECT-FIRST AUDIT REPORT

## 1. Executive Summary
Audit sistem online SBS (https://sbs-eight-red.vercel.app) telah dilakukan untuk menyesuaikan aplikasi dengan visi awal owner. Sistem saat ini terlalu kompleks secara akuntansi dan navigasi bagi pemula UMKM. Laporan ini memberikan cetak biru untuk restrukturisasi UX, pengubahan alur kerja menjadi "Project-First", serta penyederhanaan antarmuka pengguna tanpa mengorbankan fungsionalitas komprehensif sistem ERP.

## 2. Masalah UX Saat Ini
- **Menu Terlalu Banyak**: Navigasi tidak terpusat pada alur bisnis operasional.
- **Istilah Teknis**: Penggunaan bahasa akuntansi murni (Debit, Credit, GL, Trial Balance, Inventory, Purchase) membingungkan karyawan non-akuntan.
- **Transaksi Tidak Terisolasi**: Belum ada jaminan bahwa seluruh transaksi terkait dengan suatu "Project" (Project-First).

## 3. Rekomendasi Konsep Final
- **Penyederhanaan Istilah**: Mengubah "Inventory" menjadi "Stok", "Purchase" menjadi "Pengadaan", dsb. Menghapus sepenuhnya menu teknis akuntansi (Jurnal, GL, dll).
- **Pengelolaan Uang Fleksibel**: Menyediakan pos-pos Kas dan Bank (Kas, Rek Bank 1, Rek Bank 2) beserta fitur Mutasi untuk pemindahan dana.
- **Berbasis Project (Project-First)**: Mewajibkan `project_id` pada setiap form input.
- **Business-Flow-First**: Mengelompokkan menu berdasarkan divisi operasional nyata: Project, Operasional, Penjualan, Distribusi, Keuangan.

## 4. Project-First Flow
Sistem harus memastikan alur yang berurutan mulai dari inisiasi sampai bagi hasil:
1. Setup Project & Jabatan
2. Input Modal Investor
3. Aturan Bagi Hasil
4. Mulai Operasional (Pengadaan, Produksi, Racik, Perawatan)
5. Penjualan & Distribusi
6. Pencatatan Keuangan Terintegrasi
7. Tutup Buku & Bagi Hasil

## 5. Menu Final
Struktur menu baru yang direkomendasikan adalah:
- Dashboard
- Project
- Operasional
- Penjualan
- Distribusi
- Keuangan
- Laporan
- Pengaturan

*(Detail lengkap dapat dilihat di `SBS_MENU_RESTRUCTURE_PROPOSAL.md`)*

## 6. Role Final
Sistem akan disesuaikan untuk jabatan aktual saat ini di SBS:
- **CEO** (Akses Laporan, Pengaturan, Dashboard)
- **Finance & Marketing** (Akses Keuangan, Penjualan)
- **Produksi** (Akses Operasional, Stok, Produksi, Racik, Ayam)
- **Distribusi** (Akses Jadwal Kirim, Surat Jalan)

## 7. Business Rules
Terdapat 14 aturan utama bisnis SBS yang wajib diakomodasi oleh sistem, dengan fokus utama pada peracikan pakan, produksi kandang mandiri, pembelian ayam dari supplier, dan penjualan Paket Usaha (bundle). *(Detail di `SBS_BUSINESS_RULES.md`)*

## 8. Profit Sharing Rules
Penyusunan perhitungan bagi hasil ketika tutup buku, dengan porsi: 10% Kas Perusahaan, sisanya dibagi 45% Pekerja (Tim), 45% Investor, dan 10% CSR. *(Detail di `SBS_PROFIT_SHARING_RULES.md`)*

## 9. Gap Analysis
Fitur utama yang wajib dikerjakan segera adalah penerapan kewajiban `project_id` di seluruh transaksi, produk paket (bundle), serta pemisahan modul produksi mandiri (Kandang & Pakan). Menu teknis akuntansi dihilangkan dari tampilan utama.

## 10. P0/P1/P2 Roadmap
- **P0**: System mapping Project-First, User Role, Stok Project, Pengadaan, Paket Usaha, Keuangan, Laporan Project.
- **P1**: Produksi Kandang, Racik Pakan, Operasional Ayam (Mortalitas), Distribusi.
- **P2**: Automation, Advanced Analytics.

## 11. Risiko Jika Tidak Direstruktur
- Kesulitan onboarding pegawai baru (UI terlalu rumit).
- Pencatatan biaya antar project bisa tercampur, menyebabkan laporan Laba Rugi per batch/project menjadi tidak akurat.
- Karyawan tidak memakai sistem karena takut salah input di menu yang bersifat "Accounting-heavy".

## 12. Rekomendasi Implementasi Tahap Berikutnya
Jangan melakukan pembongkaran kode besar-besaran (No Big Code Yet). Tunggu persetujuan dari Owner/CEO atas proposal ini. Jika disetujui, tahap implementasi akan dilakukan secara bertahap, dimulai dari penerapan prioritas P0.

---
**FINAL VERDICT**
- **SBS PROJECT-FIRST AUDIT PASSED**
