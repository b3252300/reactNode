import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import {
  Crosshair,
  Loader2,
  MapPin,
  RotateCcw,
} from "lucide-react";

import { geocodePropertyAddressApi } from "@/api/propertyStatusAssets";
import { getCityMapView } from "@/constants/taiwanCities";

interface LocationPickerMapProps {
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  disabled?: boolean;
  onChange: (coords: { lat: number | null; lng: number | null }) => void;
}

interface FlyTarget {
  center: [number, number];
  zoom: number;
  nonce: number;
}

const STANDARD_TILE_LAYER = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
} as const;

function roundCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

function isValidCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  return (
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

const pinIcon = L.divIcon({
  className: "location-picker-pin-wrapper",
  html: `
    <div style="
      position: relative;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.55));
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#f59e0b" stroke="#090d16" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3" fill="#090d16"/>
      </svg>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 28],
});

interface MapInteractionProps {
  flyTarget: FlyTarget | null;
  disabled?: boolean;
  onMapClick: (lat: number, lng: number) => void;
}

function MapInteractionController({
  flyTarget,
  disabled,
  onMapClick,
}: MapInteractionProps) {
  const map = useMap();

  useEffect(() => {
    const timer1 = window.setTimeout(() => {
      map.invalidateSize();
    }, 120);
    const timer2 = window.setTimeout(() => {
      map.invalidateSize();
    }, 350);

    return () => {
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
    };
  }, [map]);

  useEffect(() => {
    if (!flyTarget) return;
    map.flyTo(flyTarget.center, flyTarget.zoom, { duration: 0.65 });
  }, [flyTarget, map]);

  useMapEvents({
    click(event) {
      if (disabled) return;
      onMapClick(roundCoordinate(event.latlng.lat), roundCoordinate(event.latlng.lng));
    },
  });

  return null;
}

function LocationPickerMap({
  city,
  address,
  lat,
  lng,
  disabled = false,
  onChange,
}: LocationPickerMapProps) {
  const hasCoords = isValidCoordinates(lat, lng);
  const [locating, setLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "info" | "success" | "warning";
    text: string;
  } | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [latInput, setLatInput] = useState<string>(hasCoords ? String(lat) : "");
  const [lngInput, setLngInput] = useState<string>(hasCoords ? String(lng) : "");
  const prevCityRef = useRef(city);
  const lastInternalCoordsRef = useRef<string | null>(null);

  const initialView = useMemo(() => {
    if (isValidCoordinates(lat, lng)) {
      return {
        center: [lat as number, lng as number] as [number, number],
        zoom: 16,
      };
    }
    return getCityMapView(city);
    // 僅於元件掛載時決定 MapContainer 初始視角
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isValidCoordinates(lat, lng)) {
      setLatInput(String(lat));
      setLngInput(String(lng));
      const coordKey = `${lat},${lng}`;
      if (lastInternalCoordsRef.current !== coordKey) {
        lastInternalCoordsRef.current = coordKey;
        setFlyTarget({
          center: [lat as number, lng as number],
          zoom: 16,
          nonce: Date.now(),
        });
      }
    } else {
      lastInternalCoordsRef.current = null;
      setLatInput("");
      setLngInput("");
    }
  }, [lat, lng]);

  // 尚未精準定位時，切換縣市自動移動迷你地圖至該縣市中心
  useEffect(() => {
    if (prevCityRef.current === city) return;
    prevCityRef.current = city;
    if (!hasCoords) {
      const nextView = getCityMapView(city);
      setFlyTarget({
        center: nextView.center,
        zoom: nextView.zoom,
        nonce: Date.now(),
      });
    }
  }, [city, hasCoords]);

  const handleLocateByAddress = async () => {
    const trimmedCity = city.trim();
    const trimmedAddress = address.trim();

    if (!trimmedCity && !trimmedAddress) {
      setStatusMessage({
        type: "warning",
        text: "請先輸入地址或選擇縣市，再進行自動定位。",
      });
      return;
    }

    setLocating(true);
    setStatusMessage(null);

    try {
      const result = await geocodePropertyAddressApi({
        city: trimmedCity || undefined,
        address: trimmedAddress || undefined,
      });

      if (isValidCoordinates(result.lat, result.lng)) {
        const nextLat = roundCoordinate(result.lat as number);
        const nextLng = roundCoordinate(result.lng as number);
        onChange({ lat: nextLat, lng: nextLng });
        setFlyTarget({
          center: [nextLat, nextLng],
          zoom: 16,
          nonce: Date.now(),
        });
        setStatusMessage({
          type: "success",
          text: "已依地址自動定位，若位置有偏差可直接拖曳圖釘微調。",
        });
      } else {
        setStatusMessage({
          type: "warning",
          text:
            result.message ||
            "找不到精準門牌，請直接在地圖上點選位置放置圖釘。",
        });
      }
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      setStatusMessage({
        type: "warning",
        text: message || "自動定位服務暫時無法使用，請直接在地圖上點選定位。",
      });
    } finally {
      setLocating(false);
    }
  };

  const handleClearCoordinates = () => {
    onChange({ lat: null, lng: null });
    setStatusMessage({
      type: "info",
      text: "已清除精準座標，儲存後前台地圖將以縣市約略位置顯示。",
    });
  };

  const handleManualCoordBlur = () => {
    const trimmedLat = latInput.trim();
    const trimmedLng = lngInput.trim();
    if (!trimmedLat && !trimmedLng) {
      if (hasCoords) {
        onChange({ lat: null, lng: null });
      }
      return;
    }

    const parsedLat = Number(trimmedLat);
    const parsedLng = Number(trimmedLng);
    if (isValidCoordinates(parsedLat, parsedLng)) {
      const nextLat = roundCoordinate(parsedLat);
      const nextLng = roundCoordinate(parsedLng);
      onChange({ lat: nextLat, lng: nextLng });
      setFlyTarget({
        center: [nextLat, nextLng],
        zoom: 16,
        nonce: Date.now(),
      });
      setStatusMessage(null);
    } else if (trimmedLat && trimmedLng) {
      setStatusMessage({
        type: "warning",
        text: "經緯度格式無效（緯度需介於 -90 ~ 90，經度需介於 -180 ~ 180）。",
      });
    }
  };

  return (
    <div className="grid gap-2.5 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 p-3">
      {/* 標題與操作列 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            地圖精準定位（經緯度）
          </span>
          {hasCoords ? (
            <span className="rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold dark:text-emerald-300">
              已精準定位
            </span>
          ) : (
            <span className="rounded-full border border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium dark:text-slate-400">
              尚未精準定位
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleLocateByAddress}
            disabled={disabled || locating}
            className="btn-outline-amber border-amber-500/50 bg-amber-500/15 px-2.5 py-1 hover:bg-amber-500/25"
          >
            {locating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Crosshair className="h-3.5 w-3.5" />
            )}
            <span>{locating ? "定位中..." : "依地址自動定位"}</span>
          </button>
        </div>
      </div>

      {/* 互動迷你地圖 */}
      <div className="relative h-56 w-full overflow-hidden rounded-lg border border-slate-700/80 bg-[#090d16]">
        <MapContainer
          center={initialView.center}
          zoom={initialView.zoom}
          className="h-full w-full z-0"
          scrollWheelZoom
        >
          <TileLayer
            url={STANDARD_TILE_LAYER.url}
            attribution={STANDARD_TILE_LAYER.attribution}
          />
          <MapInteractionController
            flyTarget={flyTarget}
            disabled={disabled}
            onMapClick={(nextLat, nextLng) => {
              lastInternalCoordsRef.current = `${nextLat},${nextLng}`;
              onChange({ lat: nextLat, lng: nextLng });
              setStatusMessage(null);
            }}
          />
          {hasCoords && (
            <Marker
              position={[lat as number, lng as number]}
              icon={pinIcon}
              draggable={!disabled}
              eventHandlers={{
                dragend: (event) => {
                  const marker = event.target as L.Marker;
                  const position = marker.getLatLng();
                  const nextLat = roundCoordinate(position.lat);
                  const nextLng = roundCoordinate(position.lng);
                  lastInternalCoordsRef.current = `${nextLat},${nextLng}`;
                  onChange({
                    lat: nextLat,
                    lng: nextLng,
                  });
                  setStatusMessage(null);
                },
              }}
            />
          )}
        </MapContainer>

        <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded-md border border-slate-700/80 bg-slate-950/85 px-2.5 py-1 text-[11px] text-slate-300 backdrop-blur">
          {hasCoords
            ? "可點擊地圖移動圖釘，或直接拖曳圖釘微調位置"
            : "請點擊「依地址自動定位」，或直接點擊地圖放置圖釘"}
        </div>
      </div>

      {/* 經緯度數值與重設列 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="inline-flex items-center gap-1.5 text-slate-400">
            <span>緯度</span>
            <input
              type="text"
              inputMode="decimal"
              value={latInput}
              onChange={(event) => setLatInput(event.target.value)}
              onBlur={handleManualCoordBlur}
              disabled={disabled}
              placeholder="25.033964"
              className="form-input h-auto w-28 rounded-md dark:bg-slate-950/80 px-2 py-1 font-mono text-xs placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </label>
          <label className="inline-flex items-center gap-1.5 text-slate-400">
            <span>經度</span>
            <input
              type="text"
              inputMode="decimal"
              value={lngInput}
              onChange={(event) => setLngInput(event.target.value)}
              onBlur={handleManualCoordBlur}
              disabled={disabled}
              placeholder="121.564468"
              className="form-input h-auto w-28 rounded-md dark:bg-slate-950/80 px-2 py-1 font-mono text-xs placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </label>
        </div>

        {hasCoords && (
          <button
            type="button"
            onClick={handleClearCoordinates}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-rose-500/50 hover:text-rose-300 transition cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>清除定位</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <p
          className={`text-xs ${statusMessage.type === "success"
            ? "text-emerald-400"
            : statusMessage.type === "warning"
              ? "text-amber-300"
              : "text-slate-400"
            }`}
        >
          {statusMessage.text}
        </p>
      )}
    </div>
  );
}

export default LocationPickerMap;
