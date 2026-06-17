# SBS PROJECT-FIRST FLOW DESIGN

Berikut adalah alur sistem terbaru yang mewajibkan semua pencatatan berdasarkan project.

## Alur Utama Project
1. **Setup Project**
   Membuat project baru dengan nama/kode spesifik (misal: "Project Kemitraan Ayam Petelur Batch 1").
2. **Input Team & Jabatan**
   Memasukkan data personil yang bertugas dalam project (CEO, Finance & Marketing, Produksi, Distribusi).
3. **Input Modal Investor Internal**
   Mencatat setoran modal dari masing-masing investor untuk project ini.
4. **Set Aturan Bagi Hasil**
   Menetapkan persentase pembagian profit (Misal: Kas Perusahaan 10%, Pekerja 45%, Investor 45%, CSR 10% dari profit bersih/kotor).
5. **Mulai Operasional**
   - Pengadaan barang dan bahan (kandang, pakan, ayam).
   - Produksi kandang dari bahan mentah.
   - Meracik pakan.
   - Pemeliharaan ayam (mencatat jika ada yang sakit, mati, atau hilang).
6. **Marketing/Penjualan**
   Penjualan Paket Usaha, Ayam Petelur, Kandang, atau Telur.
7. **Distribusi**
   Pengiriman barang pesanan ke customer beserta pencatatan biaya dan surat jalan.
8. **Finance**
   Pencatatan kas masuk, kas keluar, hutang, dan piutang. Seluruh arus kas selalu terikat dengan project yang sedang berjalan.
9. **Tutup Buku**
   Menutup periode project ketika satu siklus selesai untuk menghitung laba/rugi akhir.
10. **Bagi Hasil**
    Distribusi profit secara otomatis sesuai aturan yang ditetapkan di langkah 4.

## Aturan Sistem Terkait `project_id`
Semua transaksi di bawah ini **WAJIB** memiliki `project_id` dan tidak boleh dicampur antar project:
- Pembelian (Pengadaan barang)
- Stok masuk & Stok keluar
- Produksi kandang
- Racik pakan
- Operasional ayam (mati/sakit/hilang/keluar)
- Penjualan
- Distribusi (pengiriman & biaya logistik)
- Kas masuk & Kas keluar
- Hutang & Piutang
- Semua jenis laporan
- Distribusi bagi hasil
