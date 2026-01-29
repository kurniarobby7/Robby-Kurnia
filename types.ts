
export type CheckStatus = 'ok' | 'issue' | null;

export interface ItemState {
  week1: CheckStatus;
  week3: CheckStatus;
  note: string;
}

export interface ChecklistData {
  [key: string]: ItemState;
}

export interface Person {
  name: string;
  nip: string;
}

export interface VehicleInfo {
  plateNumber: string;
  vehicleType: string;
  driverName: string;
  driverNip: string;
  katimName: string; 
  katimNip: string;  
  odometer: string;
  fuelLevel: number; 
  month: string;
  year: string;
}

export interface SavedReport extends VehicleInfo {
  id: string;
  checks: ChecklistData;
  additionalNote: string;
  aiAnalysis?: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  category: string;
  label: string;
}
