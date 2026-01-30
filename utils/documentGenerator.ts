
import { SavedReport, ChecklistItem } from "../types";
import { CHECKLIST_ITEMS, CATEGORIES } from "../constants";

export const getFuelLabel = (val: number) => {
  if (val <= 0) return 'Kosong';
  if (val <= 25) return '1/4';
  if (val <= 50) return '1/2';
  if (val <= 75) return '3/4';
  return 'Penuh';
};

export const generateWordBlob = (data: SavedReport) => {
  const tableRows = CATEGORIES.map(cat => {
    const items = CHECKLIST_ITEMS.filter(i => i.category === cat).map((item, idx) => {
      const c1 = data.checks[item.id]?.week1 === 'ok' ? 'Baik' : data.checks[item.id]?.week1 === 'issue' ? 'Rusak' : '-';
      const c3 = data.checks[item.id]?.week3 === 'ok' ? 'Baik' : data.checks[item.id]?.week3 === 'issue' ? 'Rusak' : '-';
      return `<tr>
        <td style="border:0.5pt solid black; text-align:center; padding: 1px;">${idx+1}</td>
        <td style="border:0.5pt solid black; padding: 1px 3px;">${item.label}</td>
        <td style="border:0.5pt solid black; text-align:center; padding: 1px;">${c1}</td>
        <td style="border:0.5pt solid black; text-align:center; padding: 1px;">${c3}</td>
        <td style="border:0.5pt solid black; padding: 1px 3px; font-size: 6.5pt;">${data.checks[item.id]?.note || ''}</td>
      </tr>`;
    }).join('');
    return `<tr style="background:#F0F0F0;"><td colspan="5" style="border:0.5pt solid black; font-weight:bold; font-size: 7.5pt; padding: 1px 5px;">${cat}</td></tr>${items}`;
  }).join('');

  const html = `<html><head><meta charset='utf-8'>
    <style>
      @page { size: 215.9mm 330.2mm; margin: 10mm 15mm; }
      body { font-family: 'Times New Roman', serif; font-size: 8.5pt; color: #000; line-height: 1.2; }
      .header { text-align: center; border-bottom: 2pt double black; padding-bottom: 8px; margin-bottom: 12px; }
      .header h1 { margin: 0; font-size: 12pt; text-transform: uppercase; font-weight: bold; }
      .header p { margin: 2px 0 0 0; font-size: 8.5pt; font-style: italic; }
      .title { text-align: center; font-weight: bold; font-size: 11pt; text-decoration: underline; margin-bottom: 15px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      th { background: #E5E5E5; border: 0.5pt solid black; padding: 3px; font-size: 8pt; text-align: center; }
      td { border: 0.5pt solid black; vertical-align: middle; }
      .info-table td { border: none; padding: 2px; font-size: 9pt; }
      .sig-table { margin-top: 25px; }
      .sig-table td { border: none; text-align: center; width: 50%; padding-top: 5px; font-size: 9.5pt; }
      .conclusion { border: 0.5pt solid black; padding: 8px; margin-top: 5px; font-size: 8.5pt; min-height: 50px; }
    </style>
  </head><body>
    <div class="header">
      <h1>BALAI PENJAMINAN MUTU PENDIDIKAN (BPMP) PROVINSI LAMPUNG</h1>
      <p>Jl. Gatot Subroto No.44A, Pahoman, Bandar Lampung, Telp: (0721) 252477</p>
    </div>

    <div class="title">DAFTAR CEK PEMERIKSAAN KENDARAAN OPERASIONAL</div>
    
    <table class="info-table">
      <tr>
        <td width="18%">Jenis Kendaraan</td><td width="2%">:</td><td width="30%"><strong>${data.vehicleType}</strong></td>
        <td width="18%">No. Polisi</td><td width="2%">:</td><td width="30%"><strong>${data.plateNumber}</strong></td>
      </tr>
      <tr>
        <td>Periode Bulan</td><td>:</td><td>${data.month} ${data.year}</td>
        <td>Odometer</td><td>:</td><td>${data.odometer} KM</td>
      </tr>
      <tr>
        <td>Bahan Bakar</td><td>:</td><td>${getFuelLabel(data.fuelLevel)}</td>
        <td>Driver / NIP</td><td>:</td><td>${data.driverName} / ${data.driverNip}</td>
      </tr>
    </table>

    <table>
      <thead>
        <tr>
          <th width="4%">No</th>
          <th width="36%">Komponen Pemeriksaan</th>
          <th width="10%">Minggu I</th>
          <th width="10%">Minggu III</th>
          <th width="40%">Hasil Temuan / Keterangan</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>

    <div style="font-weight: bold; font-size: 9pt; margin-top: 8px;">Kesimpulan & Saran Tindak Lanjut:</div>
    <div class="conclusion">${data.additionalNote || 'Kendaraan dalam kondisi layak jalan.'}</div>

    <table class="sig-table">
      <tr>
        <td>Mengetahui,<br/>Ketua Tim RTPK<br/><br/><br/><br/><br/><strong>${data.katimName}</strong><br/>NIP. ${data.katimNip}</td>
        <td>Bandar Lampung, ${new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}<br/>Pemeriksa / Driver<br/><br/><br/><br/><br/><strong>${data.driverName}</strong><br/>NIP. ${data.driverNip}</td>
      </tr>
    </table>
  </body></html>`;
  return new Blob(['\ufeff', html], { type: 'application/msword' });
};
