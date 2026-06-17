# Source of Truth: Finance & Accounting

Dokumen ini menjelaskan arsitektur *Source of Truth* (SOT) untuk sistem keuangan pada **Internal Beta UMKM**.

## 1. Tabel Utama Mutasi Kas (UMKM Level)
Mulai dari **P0 Finance Hotfix**, tabel `cash_bank_mutations` adalah **Source of Truth utama** untuk semua saldo dan mutasi Kas & Bank di level UI UMKM. 

- Laporan Arus Kas dan Neraca (bagian Kas) dihitung dari tabel ini.
- Dashboard Kas menggunakan tabel ini.
- Tipe mutasi terdiri dari `IN` (Uang Masuk), `OUT` (Uang Keluar), dan `TRANSFER` (Pindah Buku).

## 2. Jurnal & General Ledger (Advanced Level)
Sistem penjurnalan lama (`journal_entries`, `journal_entry_lines`, `chart_of_accounts`) tetap ada sebagai fitur *back-office* untuk akuntansi lanjutan (seperti penyusutan, modal, dan rekonsiliasi kompleks). Namun, UI utama yang diakses oleh Owner/CEO **tidak lagi** membaca saldo kas dari GL.

## 3. Integrasi Pembayaran AR/AP
Agar SOT tidak terputus, setiap transaksi pembayaran piutang pelanggan (Customer Payment/AR) dan pembayaran hutang pemasok (Supplier Payment/AP) akan secara **otomatis menyisipkan data (insert)** ke dalam tabel `cash_bank_mutations`.

Hal ini dilakukan melalui fungsi *database RPC*:
- `pay_customer_invoice_v3` -> `INSERT INTO cash_bank_mutations (mutation_type: 'IN', source_module: 'AR')`
- `pay_supplier_bill` -> `INSERT INTO cash_bank_mutations (mutation_type: 'OUT', source_module: 'AP')`

## 4. Perlakuan Pindah Buku (Transfer)
Transaksi `TRANSFER` antar rekening/kas internal:
- **TIDAK** dihitung sebagai "Uang Masuk Operasional" maupun "Uang Keluar Operasional".
- **HANYA** memindahkan saldo antar akun, sehingga total kas bersih perusahaan tetap sama.
- Hal ini dijamin melalui filter `mutation_type === 'IN'` dan `mutation_type === 'OUT'` pada pelaporan Arus Kas.

## 5. Estimasi Laba Rugi
Mengingat aplikasi ini difokuskan pada kemudahan UMKM, pengisian transaksi uang keluar mungkin tidak selalu diklasifikasikan secara detail ke dalam COA beban. Oleh karena itu, Laporan Laba Rugi saat ini bersifat **Estimasi**. 
Transaksi akan diklasifikasikan lebih akurat menggunakan `reference_type` atau fitur tagging project di pengembangan selanjutnya (P2/P3).
