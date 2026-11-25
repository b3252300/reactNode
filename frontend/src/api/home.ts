import api from './api';

export interface PublicPropertyAsset {
  id: string;
  roomNumber: string;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  floor: string;
  roomType: string;
  area: number;
  status: 'vacant';
  statusText: string;
  monthlyRent: number;
  managementFee: number;
  notes: string;
  features?: number[];
  featuresText?: string[];
  imageUrl: string;
  imageUrls: string[];
}

export type ManagementFeeFilter = 'all' | 'included' | 'extra';
export type PublicSortOption = 'newest' | 'rent_asc' | 'rent_desc' | 'area_desc';

export interface PublicVacantQueryParams {
  q?: string;
  city?: string;
  roomType?: string;
  minRent?: number | string;
  maxRent?: number | string;
  managementFeeType?: ManagementFeeFilter;
  layout?: string;
  sort?: PublicSortOption;
  north?: number;
  south?: number;
  east?: number;
  west?: number;
}

export async function getPublicVacantAssetsApi(
  params?: PublicVacantQueryParams,
): Promise<PublicPropertyAsset[]> {
  const cleanedParams: Record<string, string | number> = {};

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        cleanedParams[key] = value;
      }
    });
  }

  const { data } = await api.get<PublicPropertyAsset[]>(
    '/property-status-assets/public/vacant',
    { params: cleanedParams },
  );

  return Array.isArray(data) ? data : [];
}
