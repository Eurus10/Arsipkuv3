# Implementasi Redesain Workspace Analisis Butir Soal

Berdasarkan referensi desain yang dilampirkan (`image_3dd8f2ac.png`), antarmuka **Workspace Analisis Butir Soal** telah diperbarui secara penuh untuk tampilan mobile dan desktop, baik pada **Mode Wali Kelas** maupun **Mode Guru Bidang**.

## Ringkasan Perubahan UI

### 1. Header & Identitas Workspace
- **Judul**: "Workspace Analisis Butir Soal" dilengkapi badge lavender `[📄 {Jenis Ujian}]` dan subjudul informatif.
- **Kartu Identitas Terbagi 2 Kolom (Split Card)**:
  - **Mode Wali Kelas**: Kolom Kiri menampilkan **`[🎓] KELAS {Nama Kelas}`** (aksen biru langit) dan Kolom Kanan menampilkan **`[👤] Wali Kelas: {Nama Guru}`** (aksen kuning emas).
  - **Mode Guru Bidang**: Sesuai instruksi khusus, Kolom Kiri menampilkan **`[📖] {Nama Mata Pelajaran}`** dan Kolom Kanan menampilkan **`[👤] Guru Pengampu: {Nama Guru}`**.

### 2. Strip Parameter & Metrik (Grid 2x2 di Mobile, 4 Kolom di Desktop)
- **Jenis Ujian**: Ikon dokumen ungu / lavender (`STS1`, `SAS1`, dsb.).
- **Peserta Didik / Kelas Diampu**: Ikon grup siswa ungu muda (total rombel dan siswa terdaftar).
- **Target KKTP**: Ikon target amber pastel (`≥ 70` atau sesuai setting).
- **Periode**: Ikon kalender mint emerald (`TP 2026/2027` / semester).

### 3. Tiga Tombol Aksi Utama Berwarna (Vibrant Card Actions)
- **Mata Pelajaran / Tambah Mapel**: Kartu gradien biru cerah dengan lingkaran putih `+` untuk menambah mapel baru.
- **Rekap Nilai**: Kartu mint lembut `#E8FAF2` dengan ikon pita medali untuk rekapitulasi nilai seluruh mapel/kelas.
- **Kirim ke Pak Zaki**: Kartu gradien emerald hijau dengan ikon kirim `Send` untuk menyerahkan hasil analisis ke admin/Pak Zaki.

### 4. Empat Tombol Utilitas Sekunder
- **Download / Atur Kelas**: Kartu mint `#F0FAF4` untuk unduh berkas atau pengaturan butir soal.
- **Import / Ganti Mapel**: Kartu lavender `#F7F3FF` untuk memasukkan data atau beralih ke sesi lain.
- **Kode Tarik (Pindah Device)**: Kartu biru langit `#F0F8FF` dengan ikon transfer untuk melanjutkan pengerjaan di HP/laptop lain secara instan menggunakan kode 6-digit.
- **Ganti Sesi / Hapus Sesi**: Kartu netral/rose untuk mengelola sesi pengerjaan.

## Berkas yang Diperbarui
1. `src/components/analysis/SessionDashboard.tsx` — Workspace Mode Wali Kelas.
2. `src/components/analysis/SubjectTeacherWorkspace.tsx` — Workspace Mode Guru Bidang (menampilkan Mata Pelajaran pada kolom identitas utama).
