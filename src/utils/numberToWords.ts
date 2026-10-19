/**
 * Utilitas konversi angka numerik ke teks terbilang bahasa Indonesia baku
 * Contoh:
 * 890 -> "Delapan Ratus Sembilan Puluh"
 * 1250 -> "Seribu Dua Ratus Lima Puluh"
 */
export function angkaKeTerbilang(angka: number | null | undefined): string {
  if (angka === null || angka === undefined || isNaN(angka)) return '-';
  const n = Math.round(Math.abs(angka));
  if (n === 0) return 'Nol';

  const satuan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  function toWords(num: number): string {
    if (num < 12) {
      return satuan[num];
    } else if (num < 20) {
      return toWords(num - 10) + ' Belas';
    } else if (num < 100) {
      const sisa = num % 10;
      return toWords(Math.floor(num / 10)) + ' Puluh' + (sisa > 0 ? ' ' + toWords(sisa) : '');
    } else if (num < 200) {
      const sisa = num - 100;
      return 'Seratus' + (sisa > 0 ? ' ' + toWords(sisa) : '');
    } else if (num < 1000) {
      const sisa = num % 100;
      return toWords(Math.floor(num / 100)) + ' Ratus' + (sisa > 0 ? ' ' + toWords(sisa) : '');
    } else if (num < 2000) {
      const sisa = num - 1000;
      return 'Seribu' + (sisa > 0 ? ' ' + toWords(sisa) : '');
    } else if (num < 1000000) {
      const sisa = num % 1000;
      return toWords(Math.floor(num / 1000)) + ' Ribu' + (sisa > 0 ? ' ' + toWords(sisa) : '');
    } else if (num < 1000000000) {
      const sisa = num % 1000000;
      return toWords(Math.floor(num / 1000000)) + ' Juta' + (sisa > 0 ? ' ' + toWords(sisa) : '');
    }
    return String(num);
  }

  return toWords(n).trim();
}
