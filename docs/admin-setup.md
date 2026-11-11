# Setup admin

Admin ada di `/admin`. Di sana kamu bisa:

- **Projects / Certificates**: tambah, edit, sembunyikan, urutkan, dan hapus. Sertifikat cukup
  upload PDF-nya, nanti halaman pertamanya otomatis jadi gambar. Project cukup upload videonya,
  nanti cover-nya otomatis diambil dari video.
- **Visitors**: jumlah pengunjung, page view, grafik per hari, sumber kunjungan, negara, perangkat,
  dan berapa orang yang menekan Send on WhatsApp atau email.

Tidak ada database untuk konten. Login memakai **akun GitHub kamu**. Saat kamu menekan
**Publish**, semua perubahan jadi satu commit di repo `ahtarr238/profile`, lalu Vercel
otomatis build ulang. Web ter-update dalam sekitar 1 menit.

## Setup sekali (±15 menit)

### 1. Pastikan 2FA GitHub aktif
GitHub → *Settings → Password and authentication*. Two-factor authentication harus **on**.
Inilah kunci utama admin kamu.

### 2. Buat GitHub App
GitHub → *Settings → Developer settings → GitHub Apps → **New GitHub App***:

| Kolom | Isi |
|---|---|
| GitHub App name | bebas dan unik, misalnya `ahtar-portfolio-admin` |
| Homepage URL | `https://<web kamu>` |
| **Redirect URI** (di bagian *Identifying and authorizing users*; dulu namanya Callback URL) | `https://<web kamu>/api/auth/callback` (**satu saja**, jangan tambah domain preview) |
| Allow wildcard matching | ❌ |
| Expire user authorization tokens | ✅ (biarkan tercentang) |
| Request user authorization (OAuth) during installation | ❌ |
| **Enable Device Flow** | ❌ **wajib mati**. Kalau nyala, orang bisa memancing kamu memasukkan kode di github.com/login/device lalu mendapat token-mu tanpa lewat pengecekan web ini |
| Webhook → Active | ❌ (matikan) |
| Repository permissions → **Contents** | **Read and write** |
| Repository permissions → Metadata | Read-only (otomatis) |
| Permission lain, **termasuk Workflows** | biarkan *No access* |
| Account permissions | semuanya *No access* |
| Where can this GitHub App be installed? | **Only on this account** |

Klik **Create GitHub App**, lalu di halaman app-nya:
- salin **Client ID**
- klik **Generate a new client secret** dan salin (hanya muncul sekali)
- buka **Install App** → akun kamu → **Only select repositories** → pilih **profile** → Install

### 3. Isi Environment Variables di Vercel
Vercel → project → *Settings → Environment Variables*. Centang **Production saja**, jangan Preview:

| Nama | Nilai |
|---|---|
| `GITHUB_CLIENT_ID` | Client ID dari langkah 2 |
| `GITHUB_CLIENT_SECRET` | client secret dari langkah 2 |
| `ADMIN_GITHUB_ID` | `186983991` (ID akun GitHub `ahtarr238`; ID tidak berubah walau username diganti) |
| `GITHUB_REPO` | `ahtarr238/profile` |
| `PUBLIC_ORIGIN` | alamat web kamu, misalnya `https://ahtar.vercel.app` (tanpa `/` di akhir) |

Client secret **hanya** dimasukkan di sini. Jangan dimasukkan ke repo, ke chat, atau ke
variabel yang diawali `VITE_` (variabel `VITE_` ikut terkirim ke browser).

### 4. Aktifkan statistik pengunjung
Vercel → project → **Storage** → *Create Database* → **Upstash for Redis** (paket Free), lalu
**Connect** ke project ini. Vercel otomatis menambahkan `KV_REST_API_URL` dan `KV_REST_API_TOKEN`.

### 5. Redeploy, lalu login
Klik **Redeploy** di Vercel, lalu buka `https://<web kamu>/admin` → **Sign in with GitHub** → Authorize.

## Kenapa ini aman

- **Yang memutuskan boleh masuk atau tidak adalah GitHub, bukan halaman admin.**
  - Login lewat GitHub, jadi butuh password dan 2FA kamu.
  - Server mengecek empat hal:
    - login itu memang dimulai dari browser yang sama (state dan PKCE)
    - akunnya punya ID `ADMIN_GITHUB_ID`
    - akun itu punya akses tulis ke repo
    - alamat balik login selalu `PUBLIC_ORIGIN`, tidak bisa dipalsukan lewat header

    Kalau salah satu gagal, token-nya langsung dicabut.
  - Token diserahkan ke halaman admin lewat cookie 60 detik yang hanya bisa dibuat oleh web
    ini sendiri. Token tidak pernah muncul di URL, jadi tidak tercatat di riwayat browser, dan
    link dari orang lain tidak bisa "menitipkan" token palsu. Dashboard juga hanya mau menulis
    ke repo `ahtarr238/profile`.
- **Token-nya sempit.** GitHub App hanya ter-install di repo `profile` dan hanya punya izin
  *Contents*, jadi token admin tidak bisa menyentuh repo lain atau setting akun.
- **Setiap login hanya berlaku 30 menit.** Hitungannya sejak login, sibuk atau tidak. Jam
  hitung mundur ada di bawah nama kamu di dashboard. 5 menit sebelum habis muncul peringatan
  untuk Publish perubahan. Begitu 30 menit lewat, kamu otomatis keluar dan token-nya
  **dicabut di GitHub**, jadi tidak bisa dipakai lagi di mana pun. Untuk lanjut, login ulang
  dan kamu dapat token baru. Durasinya diatur di `src/admin/config.js` (`SESSION_MINUTES`) dan
  `api/_auth.js` (`SESSION_SECONDS`).
- **Sesi tidak tertinggal.** Token hanya disimpan di tab itu (tidak di URL atau riwayat) dan
  hilang dari browser saat tab ditutup. Biasakan menekan **Sign out** supaya token langsung
  dicabut. Kalau tab ditutup tanpa Sign out, token tetap mati sendiri di GitHub paling
  lambat 8 jam (batas bawaan GitHub).
- **Client secret tidak pernah sampai ke browser.** Secret hanya ada di server Vercel
  (`/api/auth/*`).
- **Semua perubahan tercatat.** Setiap Publish adalah commit, jadi kesalahan bisa di-revert dari
  riwayat GitHub. Kalau repo berubah di tempat lain saat kamu sedang mengedit, Publish ditolak
  dan tidak menimpa apa pun.
- **Isian berbahaya ditolak.**
  - Link verifikasi harus `https://`.
  - Path file harus dari web ini sendiri (`//situs-lain` atau `/\situs-lain` ditolak).
  - Upload dibatasi PDF, JPG, PNG, WebP, MP4, dan WebM. HTML tidak bisa di-upload.
- **Header keamanan.**
  - Content-Security-Policy: script hanya dari web ini, dan koneksi keluar hanya ke `api.github.com`.
  - Halaman tidak bisa dipasang di iframe situs lain.
  - `/admin` tidak diindeks mesin pencari.
- **Statistik ramah privasi.**
  - Tanpa cookie, jadi tidak perlu banner cookie.
  - IP dan identitas browser tidak disimpan: tiap pengunjung dihitung lewat hash satu arah yang
    berganti setiap hari.
  - Bot, script, dan request dari situs lain tidak dihitung, dan banjir request dibatasi
    20 per menit.
  - Hanya akun GitHub admin yang bisa membaca angkanya.

## Hal yang perlu kamu tahu

- **Repo `profile` itu publik.** Item yang kamu sembunyikan tidak tampil di web dan tidak
  ikut di file JavaScript web, tapi tetap terlihat di `src/data/cms.json` di GitHub. Jadi jangan
  simpan hal rahasia sebagai item tersembunyi. Kalau perlu, jadikan repo-nya private (Vercel
  tetap bisa deploy).
- **Upload masuk ke repo selamanya.** Video dibatasi 25 MB. Kompres dulu kalau lebih besar.
- **Admin hanya jalan di web yang sudah live** (butuh fungsi Vercel). Di `npm run dev`, tombol
  login tidak akan jalan.

## Kalau ada masalah

- *"That GitHub account can't edit this site"*: kamu login dengan akun lain. Cek `ADMIN_GITHUB_ID`.
- *"Admin sign-in isn't set up yet"*: env var di langkah 3 belum lengkap, atau belum redeploy.
- *"GitHub refused this"*: GitHub App belum di-install di repo `profile`, atau izin Contents belum Read and write.
- **Curiga token bocor:** buka GitHub → *Settings → Applications → Authorized GitHub Apps* → Revoke,
  lalu di halaman app klik *Revoke all user tokens*. Kalau client secret bocor, hapus secret
  itu di halaman app, buat yang baru, lalu ganti di Vercel.
