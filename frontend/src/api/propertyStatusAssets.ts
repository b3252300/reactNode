import api from './api';
import type { PropertyAsset, PropertyAssetInput } from '@/types/propertyStatusAssets';

export async function getPropertyAssetsApi(
  params?: Record<string, string | undefined>,
): Promise<PropertyAsset[]> {
  const { data } = await api.get<PropertyAsset[]>('/property-status-assets', {
    params,
  });
  return data;
}

export async function getPropertyAssetByIdApi(id: string): Promise<PropertyAsset> {
  const { data } = await api.get<PropertyAsset>(`/property-status-assets/${id}`);
  return data;
}

export async function createPropertyAssetApi(
  payload: PropertyAssetInput,
): Promise<PropertyAsset> {
  const { data } = await api.post<PropertyAsset>('/property-status-assets', payload);
  return data;
}

export async function updatePropertyAssetApi(
  id: string,
  payload: Partial<PropertyAssetInput>,
): Promise<PropertyAsset> {
  const { data } = await api.patch<PropertyAsset>(`/property-status-assets/${id}`, payload);
  return data;
}

export async function deletePropertyAssetApi(id: string): Promise<void> {
  await api.delete(`/property-status-assets/${id}`);
}

export interface GeocodePropertyAddressResponse {
  lat: number | null;
  lng: number | null;
  message?: string;
}

export async function geocodePropertyAddressApi(params: {
  city?: string;
  address?: string;
}): Promise<GeocodePropertyAddressResponse> {
  const { data } = await api.get<GeocodePropertyAddressResponse>(
    '/property-status-assets/geocode',
    { params },
  );
  return data;
}
