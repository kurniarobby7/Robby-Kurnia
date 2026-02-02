
import { GoogleGenAI } from "@google/genai";
import { SavedReport, ChecklistItem } from "../types";
import { CHECKLIST_ITEMS } from "../constants";

export const analyzeVehicleHealth = async (report: Partial<SavedReport>) => {
  const apiKey = process.env.API_KEY;

  // Cek apakah API Key tersedia
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    console.warn("Gemini API Key tidak ditemukan. Laporan akan disimpan tanpa analisis AI.");
    return "Analisis AI dilewati: API Key belum dikonfigurasi di environment variable.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Siapkan daftar isu untuk prompt
    const issues: string[] = [];
    CHECKLIST_ITEMS.forEach(item => {
      const check = report.checks?.[item.id];
      if (check?.week1 === 'issue' || check?.week3 === 'issue') {
        const weeks = [];
        if (check.week1 === 'issue') weeks.push('1');
        if (check.week3 === 'issue') weeks.push('3');
        issues.push(`${item.label} (Masalah di Minggu: ${weeks.join(' & ')})`);
      }
    });

    const prompt = `
      Sebagai ahli pemeliharaan armada kendaraan dinas pemerintah (BPMP Lampung), 
      analisis laporan inspeksi berikut dan berikan ringkasan profesional yang singkat 
      mengenai kesehatan kendaraan dan rekomendasi pemeliharaan mendesak.

      Kendaraan: ${report.vehicleType} (${report.plateNumber})
      Odometer: ${report.odometer} KM
      Level BBM: ${report.fuelLevel}%
      
      Isu yang Ditemukan:
      ${issues.length > 0 ? issues.join('\n') : 'Tidak ada masalah mekanis yang teridentifikasi.'}

      Catatan Tambahan Pemeriksa: ${report.additionalNote || 'Tidak ada'}

      Format respons dalam Markdown:
      1. **Ringkasan Eksekutif** (Status: Baik/Perlu Perhatian/Mendesak)
      2. **Temuan Utama**
      3. **Rekomendasi Ahli**
      4. **Skor Urgensi Pemeliharaan** (0-10)

      Gunakan bahasa Indonesia yang profesional dan lugas.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
      },
    });

    return response.text;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "Laporan berhasil disimpan. (Analisis AI gagal dimuat saat ini).";
  }
};
