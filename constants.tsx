
import { ChecklistItem, Person } from './types';

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'eng_1', category: 'A. RUANG MESIN', label: 'Oli Mesin (Level & Kondisi)' },
  { id: 'eng_2', category: 'A. RUANG MESIN', label: 'Air Radiator / Coolant' },
  { id: 'eng_3', category: 'A. RUANG MESIN', label: 'Minyak Rem & Power Steering' },
  { id: 'eng_4', category: 'A. RUANG MESIN', label: 'Air Wiper' },
  { id: 'eng_5', category: 'A. RUANG MESIN', label: 'Kondisi Aki (Accu)' },
  { id: 'eng_6', category: 'A. RUANG MESIN', label: 'Fan Belt / Tali Kipas' },
  { id: 'ext_1', category: 'B. EKSTERIOR & KAKI-KAKI', label: 'Tekanan Angin Ban (4 Roda)' },
  { id: 'ext_2', category: 'B. EKSTERIOR & KAKI-KAKI', label: 'Fisik Ban & Ban Serep' },
  { id: 'ext_3', category: 'B. EKSTERIOR & KAKI-KAKI', label: 'Lampu Utama & Jauh' },
  { id: 'ext_4', category: 'B. EKSTERIOR & KAKI-KAKI', label: 'Lampu Sein & Rem' },
  { id: 'ext_5', category: 'B. EKSTERIOR & KAKI-KAKI', label: 'Spion & Wiper Blade' },
  { id: 'ext_6', category: 'B. EKSTERIOR & KAKI-KAKI', label: 'Body (Baret/Penyok)' },
  { id: 'int_1', category: 'C. INTERIOR', label: 'Fungsi AC (Pendingin)' },
  { id: 'int_2', category: 'C. INTERIOR', label: 'Klakson' },
  { id: 'int_3', category: 'C. INTERIOR', label: 'Indikator Dashboard' },
  { id: 'int_4', category: 'C. INTERIOR', label: 'Kebersihan Kabin' },
  { id: 'doc_1', category: 'D. DOKUMEN & PERALATAN', label: 'Masa STNK & Pajak' },
  { id: 'doc_2', category: 'D. DOKUMEN & PERALATAN', label: 'Dongkrak & Kunci Roda' },
  { id: 'doc_3', category: 'D. DOKUMEN & PERALATAN', label: 'Kotak P3K' },
];

export const CATEGORIES = Array.from(new Set(CHECKLIST_ITEMS.map(item => item.category)));

export const PREDEFINED_DRIVERS: Person[] = [
  { name: 'Robby Kurnia', nip: '199512042025211025' }
];

export const PREDEFINED_KATIMS: Person[] = [
  { name: 'Teguh Budi Hartono,ST.M.Eng', nip: '197409112005011002' }
];

export const APP_STORAGE_KEY = 'bpmp_fleet_reports_v1';
export const DRAFT_STORAGE_KEY = 'bpmp_fleet_draft_v1';
export const CUSTOM_DRIVERS_KEY = 'bpmp_custom_drivers_v1';
export const CUSTOM_KATIMS_KEY = 'bpmp_custom_katims_v1';
