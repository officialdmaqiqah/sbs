# SBS ONLINE UX AUDIT

Matriks hasil audit sistem online SBS berdasarkan tujuan project-first dan UMKM-friendly.

| Menu/Fitur Saat Ini | Tujuan Bisnis | User yang Memakai | Apakah Pemula Paham? | Terlalu Teknis? | Wajib di Menu Utama? | Masuk Submenu? | Disembunyikan? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Dashboard | Ringkasan kondisi usaha | CEO, Finance | Ya | Tidak | Ya | Tidak | Tidak | **Keep** |
| Project | Pengelolaan project bisnis | CEO, Finance, Produksi | Ya | Tidak | Ya | Tidak | Tidak | **Keep** |
| Stok/Inventory | Cek ketersediaan barang | Produksi, Finance | Tidak (istilah Inventory) | Ya (butuh disederhanakan)| Tidak | Ya | Tidak | **Rename & Move** (Stok) |
| Pembelian/Purchase | Pengadaan barang modal | Finance, Produksi | Tidak (Purchase) | Tidak | Tidak | Ya | Tidak | **Rename & Move** (Pengadaan Barang) |
| Produksi Kandang | Pencatatan hasil kandang | Produksi | Ya | Tidak | Tidak | Ya | Tidak | **Move** |
| Racik Pakan | Pencatatan pakan buatan | Produksi | Ya | Tidak | Tidak | Ya | Tidak | **Move** |
| Operasional Ayam | Manajemen kondisi ayam | Produksi | Ya | Tidak | Tidak | Ya | Tidak | **Move** |
| Penjualan/Sales | Mencatat pendapatan | Marketing, Finance | Tidak (Sales) | Tidak | Ya | Tidak | Tidak | **Rename** (Penjualan) |
| Distribusi | Logistik pengiriman barang | Distribusi | Ya | Tidak | Ya | Tidak | Tidak | **Keep** |
| Keuangan/Finance | Arus kas, hutang, piutang | Finance, CEO | Tidak (Finance, Jurnal) | Ya (Jurnal, GL, COA) | Ya | Tidak | Tidak | **Rename & Simplify** (Keuangan) |
| Laporan | Rekap data bisnis | CEO, Finance | Ya | Tidak | Ya | Tidak | Tidak | **Keep** |
| Pengaturan | Set up sistem & master data| CEO | Ya | Tidak | Ya | Tidak | Tidak | **Keep** |
| User Role | Manajemen akses pengguna | CEO | Ya | Tidak | Tidak | Ya | Tidak | **Move** (ke Pengaturan) |
| Jurnal Akuntansi | Pencatatan double entry | Finance | Tidak | Ya | Tidak | Tidak | Ya | **Remove/Drop** |
| Neraca Saldo | Pengecekan saldo akun | Finance | Tidak | Ya | Tidak | Tidak | Ya | **Remove/Drop** |

## Catatan Temuan
- Terlalu banyak istilah akuntansi teknis (Jurnal, GL, COA, Debit, Credit) yang membingungkan pemula.
- Menu utama terlalu penuh. Perlu dikelompokkan ke dalam proses bisnis utama: Operasional, Penjualan, Distribusi, Keuangan.
- Semua form input wajib ditambahkan field `project_id` agar pendataan terisolasi per project.
