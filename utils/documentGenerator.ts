
import { SavedReport, ChecklistItem } from "../types";
import { CHECKLIST_ITEMS, CATEGORIES } from "../constants";

export const getFuelLabel = (val: number) => {
  if (val <= 0) return 'Kosong';
  if (val <= 25) return '1/4';
  if (val <= 50) return '1/2';
  if (val <= 75) return '3/4';
  return 'Penuh';
};

// URL Logo Tut Wuri Handayani / Kemendikbud
const LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg/800px-Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg.png";

export const generateDocumentHtml = (data: SavedReport) => {
  const tableRows = CATEGORIES.map(cat => {
    const items = CHECKLIST_ITEMS.filter(i => i.category === cat).map((item, idx) => {
      const c1 = data.checks[item.id]?.week1 === 'ok' ? 'Baik' : data.checks[item.id]?.week1 === 'issue' ? 'Rusak' : '-';
      const c3 = data.checks[item.id]?.week3 === 'ok' ? 'Baik' : data.checks[item.id]?.week3 === 'issue' ? 'Rusak' : '-';
      return `<tr>
        <td style="border:0.5pt solid black; text-align:center; padding: 1px; font-size: 7.5pt;">${idx+1}</td>
        <td style="border:0.5pt solid black; padding: 1px 3px; font-size: 7.5pt;">${item.label}</td>
        <td style="border:0.5pt solid black; text-align:center; padding: 1px; font-size: 7.5pt;">${c1}</td>
        <td style="border:0.5pt solid black; text-align:center; padding: 1px; font-size: 7.5pt;">${c3}</td>
        <td style="border:0.5pt solid black; padding: 1px 3px; font-size: 6.5pt;">${data.checks[item.id]?.note || ''}</td>
      </tr>`;
    }).join('');
    return `<tr style="background:#F0F0F0;"><td colspan="5" style="border:0.5pt solid black; font-weight:bold; font-size: 7.5pt; padding: 1px 5px;">${cat}</td></tr>${items}`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset='utf-8'>
    <style>
      @page { size: 215.9mm 330.2mm; margin: 8mm 12mm; }
      body { font-family: 'Times New Roman', serif; font-size: 8.5pt; color: #000; line-height: 1.1; margin: 0; padding: 0; }
      .kop-surat { display: table; width: 100%; border-bottom: 2.5pt double black; padding-bottom: 5px; margin-bottom: 10px; }
      .kop-logo { display: table-cell; vertical-align: middle; width: 70px; }
      .kop-logo img { width: 65px; height: auto; }
      .kop-text { display: table-cell; vertical-align: middle; text-align: center; }
      .kop-text h2 { margin: 0; font-size: 11pt; text-transform: uppercase; font-weight: bold; }
      .kop-text h1 { margin: 0; font-size: 13pt; text-transform: uppercase; font-weight: bold; }
      .kop-text p { margin: 1px 0 0 0; font-size: 8pt; }
      
      .title { text-align: center; font-weight: bold; font-size: 10.5pt; text-decoration: underline; margin-bottom: 10px; text-transform: uppercase; }
      
      table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
      th { background: #E5E5E5; border: 0.5pt solid black; padding: 2px; font-size: 8pt; text-align: center; }
      td { border: 0.5pt solid black; vertical-align: middle; }
      
      .info-table td { border: none; padding: 1px; font-size: 8.5pt; }
      .sig-table { margin-top: 15px; width: 100%; }
      .sig-table td { border: none; text-align: center; width: 50%; padding-top: 0; font-size: 9pt; vertical-align: top; }
      .conclusion { border: 0.5pt solid black; padding: 5px; margin-top: 3px; font-size: 8pt; min-height: 40px; }
      .label-box { font-weight: bold; font-size: 8.5pt; margin-top: 5px; }
    </style>
  </head><body>
    <div class="kop-surat">
      <div class="kop-logo">
        <img src="${LOGO_URL}" alt="Logo">
      </div>
      <div class="kop-text">
        <h2>KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH</h2>
        <h1>BALAI PENJAMINAN MUTU PENDIDIKAN</h1>
        <h2>PROVINSI LAMPUNG</h2>
        <p>Jl. Gatot Subroto No.44A, Pahoman, Bandar Lampung, Kode Pos 35213</p>
        <p>Telepon: (0721) 252477 | Laman: bpmp-lampung.kemdikbud.go.id</p>
      </div>
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
        <td>Pemeriksa</td><td>:</td><td>${data.driverName}</td>
      </tr>
    </table>

    <table>
      <thead>
        <tr>
          <th width="3%">No</th>
          <th width="32%">Komponen Pemeriksaan</th>
          <th width="10%">Minggu I</th>
          <th width="10%">Minggu III</th>
          <th width="45%">Hasil Temuan / Keterangan Khusus</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>

    <div class="label-box">Kesimpulan & Saran Tindak Lanjut:</div>
    <div class="conclusion">${data.additionalNote || 'Kendaraan dalam kondisi layak jalan secara fungsional.'}</div>

    <table class="sig-table">
      <tr>
        <td>
          Mengetahui,<br/>Ketua Tim RTPK<br/><br/><br/><br/><br/>
          <strong>${data.katimName}</strong><br/>
          NIP. ${data.katimNip}
        </td>
        <td>
          Bandar Lampung, ${new Date(data.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}<br/>
          Pemeriksa / Driver<br/><br/><br/><br/><br/>
          <strong>${data.driverName}</strong><br/>
          NIP. ${data.driverNip}
        </td>
      </tr>
    </table>
  </body></html>`;
};

export const generateWordBlob = (data: SavedReport) => {
  const html = generateDocumentHtml(data);
  return new Blob(['\ufeff', html], { type: 'application/msword' });
};
