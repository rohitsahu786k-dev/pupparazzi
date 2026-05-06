"use client";

import { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

export function LocationFetcher() {
  const [location, setLocation] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function reverseGeocode(lat: number, lon: number): Promise<string> {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.county || "";
      const state = addr.state || "";
      return city && state ? `${city}, ${state}` : data.display_name?.split(",")[0] || "Your Location";
    }

    async function ipFallback(): Promise<string> {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      if (data.city && data.region) return `${data.city}, ${data.region}`;
      return "Ahmedabad, Gujarat";
    }

    function tryGeolocation() {
      if (!navigator.geolocation) {
        ipFallback().then(setLocation).finally(() => setLoading(false));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
            setLocation(loc);
          } catch {
            setLocation(await ipFallback());
          } finally {
            setLoading(false);
          }
        },
        async () => {
          // User denied or unavailable – fall back to IP
          try {
            setLocation(await ipFallback());
          } catch {
            setLocation("Ahmedabad, Gujarat");
          } finally {
            setLoading(false);
          }
        },
        { timeout: 5000, maximumAge: 600000 }
      );
    }

    tryGeolocation();
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-pink-500 transition-colors cursor-default group">
      {loading ? (
        <Loader2 className="h-4 w-4 text-pink-400 animate-spin" />
      ) : (
        <MapPin className="h-4 w-4 text-pink-500 group-hover:scale-110 transition-transform" />
      )}
      <span className="truncate max-w-45 font-medium">
        {loading ? "Detecting location…" : location}
      </span>
    </div>
  );
}
