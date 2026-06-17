# SBS BUSINESS RULES

Dokumen ini berisi aturan baku proses bisnis dalam sistem SBS.

1. Semua transaksi **wajib** menggunakan `project_id`.
2. Produk **Paket Usaha** terdiri dari gabungan (bundle): Ayam + Kandang + Pakan.
3. Ayam **dibeli** dari supplier eksternal.
4. Kandang **diproduksi** sendiri dengan menggunakan bahan baku dari stok inventory.
5. Pakan **diracik** sendiri dengan menggunakan bahan baku dari stok inventory.
6. **Penjualan Paket Usaha** secara otomatis mengurangi stok ayam, stok kandang, dan stok pakan.
7. **Pembelian barang** menambah stok barang (inventory/ayam) dan mencatat hutang atau kas keluar di sistem keuangan.
8. **Produksi kandang** akan mengurangi stok bahan mentah dan menambah stok kandang jadi.
9. **Racik pakan** akan mengurangi stok bahan pakan dan menambah stok pakan jadi.
10. **Operasional ayam** mencatat setiap kejadian khusus seperti ayam mati, sakit, hilang, atau keluar kandang yang akan memengaruhi jumlah stok riil.
11. **Distribusi** mencatat proses barang keluar dari gudang, pelacakan status pengiriman, serta pencatatan biaya distribusi (ongkir/akomodasi).
12. **Keuangan (Finance)** mencatat seluruh arus uang dari hulu ke hilir, baik yang berhubungan dengan kas, bank, maupun hutang/piutang secara komprehensif.
13. Setiap **Project** dapat ditutup setelah satu siklus usaha selesai (Tutup Buku Project).
14. Setelah project ditutup, sistem secara otomatis akan **menghitung bagi hasil** sesuai dengan proporsi yang diatur pada awal pembuatan project.
