export type PropertyStatus =
  | 'rented'
  | 'vacant'
  | 'overdue'
  | 'expiring'
  | 'maintenance';

export type PropertyStatusFilter = 'all' | PropertyStatus;

export interface PropertyAsset {
  id: string;
  roomNumber: string;
  city: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  floor: string;
  roomType: string;
  area: number;
  status: PropertyStatus;
  statusText: string;
  tenantName: string;
  tenantPhone?: string;
  monthlyRent: number;
  deposit: number;
  managementFee: number;
  leaseEndDate: string;
  overdueDays?: number;
  overdueAmount?: number;
  maintenanceReason?: string;
  notes?: string;
  features?: number[];
  featuresText?: string[];
  imageUrl?: string;
  imageUrls?: string[];
}

export type PropertyAssetInput = Omit<PropertyAsset, 'id' | 'roomNumber' | 'statusText' | 'featuresText'> & {
  status: PropertyStatus;
  leaseEndDate: string;
};