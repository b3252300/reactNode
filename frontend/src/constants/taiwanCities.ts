export const TAIWAN_CITIES = [
  '台北市',
  '新北市',
  '基隆市',
  '桃園市',
  '新竹市',
  '新竹縣',
  '宜蘭縣',
  '苗栗縣',
  '台中市',
  '彰化縣',
  '南投縣',
  '雲林縣',
  '嘉義市',
  '嘉義縣',
  '台南市',
  '高雄市',
  '屏東縣',
  '花蓮縣',
  '台東縣',
  '澎湖縣',
  '金門縣',
  '連江縣',
] as const;

export type TaiwanCity = (typeof TAIWAN_CITIES)[number];

export interface CityCoordinateConfig {
  center: [number, number];
  zoom: number;
}

export const TAIWAN_DEFAULT_MAP_VIEW: CityCoordinateConfig = {
  center: [23.9739, 120.982],
  zoom: 7,
};

export const TAIWAN_CITY_COORDINATES: Record<TaiwanCity, CityCoordinateConfig> = {
  台北市: { center: [25.033, 121.5654], zoom: 12 },
  新北市: { center: [25.012, 121.4657], zoom: 11 },
  基隆市: { center: [25.1276, 121.7392], zoom: 13 },
  桃園市: { center: [24.9936, 121.301], zoom: 11 },
  新竹市: { center: [24.8138, 120.9675], zoom: 13 },
  新竹縣: { center: [24.8387, 121.0177], zoom: 11 },
  宜蘭縣: { center: [24.757, 121.753], zoom: 11 },
  苗栗縣: { center: [24.5602, 120.8214], zoom: 11 },
  台中市: { center: [24.1477, 120.6736], zoom: 12 },
  彰化縣: { center: [24.0518, 120.5161], zoom: 11 },
  南投縣: { center: [23.9609, 120.9719], zoom: 10 },
  雲林縣: { center: [23.7092, 120.4313], zoom: 11 },
  嘉義市: { center: [23.4801, 120.4491], zoom: 13 },
  嘉義縣: { center: [23.4518, 120.2555], zoom: 11 },
  台南市: { center: [22.9997, 120.227], zoom: 12 },
  高雄市: { center: [22.6273, 120.3014], zoom: 12 },
  屏東縣: { center: [22.6762, 120.4929], zoom: 11 },
  花蓮縣: { center: [23.9872, 121.6016], zoom: 11 },
  台東縣: { center: [22.7583, 121.1444], zoom: 11 },
  澎湖縣: { center: [23.5712, 119.5793], zoom: 12 },
  金門縣: { center: [24.4493, 118.3767], zoom: 12 },
  連江縣: { center: [26.1505, 119.9499], zoom: 12 },
};

export function getCityMapView(city?: string | null): CityCoordinateConfig {
  if (!city || city === 'all') {
    return TAIWAN_DEFAULT_MAP_VIEW;
  }
  const normalized = city.replace(/^臺/, '台') as TaiwanCity;
  return TAIWAN_CITY_COORDINATES[normalized] || TAIWAN_DEFAULT_MAP_VIEW;
}
