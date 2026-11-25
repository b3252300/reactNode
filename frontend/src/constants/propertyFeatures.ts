import propertyFeaturesData from '@shared/propertyFeatures.json';

export interface PropertyFeatureItem {
  readonly code: number;
  readonly value: string;
}

export type PropertyFeatureCode = PropertyFeatureItem['code'];

export const PROPERTY_FEATURES: readonly PropertyFeatureItem[] = propertyFeaturesData;

export const PROPERTY_FEATURE_MAP: Record<number, string> = Object.fromEntries(
  PROPERTY_FEATURES.map((item) => [item.code, item.value]),
);

export function getPropertyFeatureLabel(code: number): string {
  return PROPERTY_FEATURE_MAP[code] ?? String(code);
}
