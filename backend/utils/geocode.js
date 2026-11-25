const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const GEOCODE_TIMEOUT_MS = 4500;
const USER_AGENT = 'HouseAssetsPropertyPlatform/1.0 (dashboard-map-search)';

const geocodeCache = new Map();

function buildQueryCandidates(city, address) {
  const cleanCity = String(city ?? '').trim();
  const cleanAddress = String(address ?? '').trim();
  if (!cleanCity && !cleanAddress) return [];

  const candidates = [];
  const full = cleanCity && cleanAddress.startsWith(cleanCity)
    ? cleanAddress
    : `${cleanCity}${cleanAddress}`.trim();

  if (full) {
    candidates.push(full);
  }
  if (cleanCity && cleanAddress && `${cleanCity} ${cleanAddress}` !== full) {
    candidates.push(`${cleanCity} ${cleanAddress}`);
  }
  return candidates;
}

async function queryNominatim(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

  try {
    const url = new URL(NOMINATIM_ENDPOINT);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'tw');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.5',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[geocode] Nominatim HTTP ${response.status} for "${query}"`);
      return null;
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const lat = Number(results[0].lat);
    const lng = Number(results[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }

    return { lat, lng };
  } catch (error) {
    console.warn(`[geocode] Failed to geocode "${query}":`, error.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 將台灣縣市與地址轉換為經緯度座標。
 * 失敗時不拋出錯誤，回傳 null 以避免阻斷物件新增或儲存。
 */
async function geocodeAddress(city, address) {
  const candidates = buildQueryCandidates(city, address);
  if (candidates.length === 0) return null;

  const cacheKey = candidates[0];
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  for (const query of candidates) {
    const coords = await queryNominatim(query);
    if (coords) {
      geocodeCache.set(cacheKey, coords);
      return coords;
    }
  }

  geocodeCache.set(cacheKey, null);
  return null;
}

module.exports = {
  geocodeAddress,
};
