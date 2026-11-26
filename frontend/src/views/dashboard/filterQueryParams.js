import { TAIWAN_CITIES } from '@/constants/taiwanCities';
import { PROPERTY_FEATURES } from '@/constants/propertyFeatures';

export const INITIAL_FILTERS = {
  keyword: '',
  city: 'all',
  roomType: '全部',
  rentRangeId: 'all',
  managementFeeType: 'all',
  layout: 'all',
  features: [],
  sort: 'newest',
};

export const FEATURE_OPTIONS = PROPERTY_FEATURES;

export const CITY_OPTIONS = [
  { id: 'all', label: '縣市不限' },
  ...TAIWAN_CITIES.map((city) => ({ id: city, label: city })),
];

export const ROOM_TYPE_OPTIONS = [
  '全部',
  '整層住家',
  '獨立套房',
  '分租套房',
  '雅房',
  '車位',
];

export const RENT_RANGE_OPTIONS = [
  { id: 'all', label: '租金不限', minRent: undefined, maxRent: undefined },
  { id: 'under_10k', label: '10,000 元以下', minRent: 0, maxRent: 10000 },
  { id: '10k_20k', label: '10,000 – 20,000 元', minRent: 10000, maxRent: 20000 },
  { id: '20k_35k', label: '20,000 – 35,000 元', minRent: 20000, maxRent: 35000 },
  { id: 'over_35k', label: '35,000 元以上', minRent: 35000, maxRent: undefined },
];

export const MANAGEMENT_FEE_OPTIONS = [
  { id: 'all', label: '管理費不限' },
  { id: 'included', label: '含管理費／免管理費' },
  { id: 'extra', label: '另計管理費' },
];

export const LAYOUT_OPTIONS = [
  { id: 'all', label: '格局不限' },
  { id: '1房', label: '1 房' },
  { id: '2房', label: '2 房' },
  { id: '3房以上', label: '3 房以上' },
  { id: '開放式/套房', label: '開放式／套房' },
  { id: '車位', label: '車位' },
];

export const SORT_OPTIONS = [
  { id: 'newest', label: '最新上架' },
  { id: 'rent_asc', label: '租金由低到高' },
  { id: 'rent_desc', label: '租金由高到低' },
  { id: 'area_desc', label: '坪數由大到小' },
];

const VALID_CITIES = new Set(CITY_OPTIONS.map((item) => item.id));
const VALID_ROOM_TYPES = new Set(ROOM_TYPE_OPTIONS);
const VALID_RENT_RANGES = new Set(RENT_RANGE_OPTIONS.map((item) => item.id));
const VALID_MANAGEMENT_FEES = new Set(MANAGEMENT_FEE_OPTIONS.map((item) => item.id));
const VALID_LAYOUTS = new Set(LAYOUT_OPTIONS.map((item) => item.id));
const VALID_FEATURE_CODES = new Set(FEATURE_OPTIONS.map((item) => item.code));
const VALID_SORTS = new Set(SORT_OPTIONS.map((item) => item.id));

export function normalizeFeatureCodes(codes) {
  if (!Array.isArray(codes)) return [];
  return [...new Set(
    codes
      .map((code) => Number(code))
      .filter((code) => Number.isInteger(code) && VALID_FEATURE_CODES.has(code)),
  )].sort((a, b) => a - b);
}

export function parseFiltersFromSearchParams(searchParams) {
  const keyword = searchParams.get('q') || '';
  const rawCity = searchParams.get('city') || INITIAL_FILTERS.city;
  const rawRoomType = searchParams.get('roomType') || INITIAL_FILTERS.roomType;
  const rawRentRangeId = searchParams.get('rentRangeId') || INITIAL_FILTERS.rentRangeId;
  const rawManagementFeeType = searchParams.get('managementFeeType') || INITIAL_FILTERS.managementFeeType;
  const rawLayout = searchParams.get('layout') || INITIAL_FILTERS.layout;
  const rawFeatures = searchParams.get('features') || '';
  const rawSort = searchParams.get('sort') || INITIAL_FILTERS.sort;

  const features = rawFeatures
    ? normalizeFeatureCodes(rawFeatures.split(','))
    : [];

  return {
    keyword,
    city: VALID_CITIES.has(rawCity) ? rawCity : INITIAL_FILTERS.city,
    roomType: VALID_ROOM_TYPES.has(rawRoomType) ? rawRoomType : INITIAL_FILTERS.roomType,
    rentRangeId: VALID_RENT_RANGES.has(rawRentRangeId) ? rawRentRangeId : INITIAL_FILTERS.rentRangeId,
    managementFeeType: VALID_MANAGEMENT_FEES.has(rawManagementFeeType)
      ? rawManagementFeeType
      : INITIAL_FILTERS.managementFeeType,
    layout: VALID_LAYOUTS.has(rawLayout) ? rawLayout : INITIAL_FILTERS.layout,
    features,
    sort: VALID_SORTS.has(rawSort) ? rawSort : INITIAL_FILTERS.sort,
  };
}

export function buildSearchParamsFromFilters(filters) {
  const params = new URLSearchParams();
  const trimmedKeyword = String(filters.keyword || '').trim();
  const normalizedFeatures = normalizeFeatureCodes(filters.features);

  if (trimmedKeyword) params.set('q', trimmedKeyword);
  if (filters.city && filters.city !== INITIAL_FILTERS.city) {
    params.set('city', filters.city);
  }
  if (filters.roomType && filters.roomType !== INITIAL_FILTERS.roomType) {
    params.set('roomType', filters.roomType);
  }
  if (filters.rentRangeId && filters.rentRangeId !== INITIAL_FILTERS.rentRangeId) {
    params.set('rentRangeId', filters.rentRangeId);
  }
  if (filters.managementFeeType && filters.managementFeeType !== INITIAL_FILTERS.managementFeeType) {
    params.set('managementFeeType', filters.managementFeeType);
  }
  if (filters.layout && filters.layout !== INITIAL_FILTERS.layout) {
    params.set('layout', filters.layout);
  }
  if (normalizedFeatures.length > 0) {
    params.set('features', normalizedFeatures.join(','));
  }
  if (filters.sort && filters.sort !== INITIAL_FILTERS.sort) {
    params.set('sort', filters.sort);
  }

  return params;
}

export function buildFilterQueryString(filters) {
  const query = buildSearchParamsFromFilters(filters).toString();
  return query ? `?${query}` : '';
}
