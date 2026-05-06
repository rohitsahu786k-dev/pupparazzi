"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

export function LocationFetcher() {
  const [location, setLocation] = useState<string>("Fetching location...");

  useEffect(() => {
    async function fetchLocation() {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        if (data.city && data.region) {
          setLocation(`${data.city}, ${data.region}`);
        } else {
          setLocation("Mumbai, Maharashtra"); // Fallback
        }
      } catch (error) {
        console.error("Failed to fetch location", error);
        setLocation("Mumbai, Maharashtra"); // Fallback
      }
    }

    fetchLocation();
  }, []);

  return (
    <div className="flex items-center gap-1 text-sm text-secondary hover:text-primary transition-colors cursor-pointer group">
      <MapPin className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
      <span className="truncate max-w-[200px] font-medium">{location}</span>
    </div>
  );
}
