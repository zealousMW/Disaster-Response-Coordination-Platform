import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { LocateFixed, Loader2 } from "lucide-react";
import L from "leaflet";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map events from inside MapContainer
function MapController({ 
  position, 
  onMapReady, 
  shouldFlyTo, 
  onFlyComplete 
}: {
  position: [number, number] | null;
  onMapReady: (map: L.Map) => void;
  shouldFlyTo: boolean;
  onFlyComplete: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  useEffect(() => {
    if (map && position && shouldFlyTo) {
      map.flyTo(position, 16, { 
        animate: true, 
        duration: 2,
        easeLinearity: 0.1
      });
      const timer = setTimeout(() => {
        onFlyComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [map, position, shouldFlyTo, onFlyComplete]);

  return null;
}

interface LeafletMapProps {}

export default function LeafletMap({}: LeafletMapProps) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [shouldFlyTo, setShouldFlyTo] = useState<boolean>(false);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const defaultPosition: [number, number] = [51.505, -0.09];
  const hasFlownRef = useRef<boolean>(false);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos: GeolocationPosition) => {
          const userPosition: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setPosition(userPosition);
          setLocationError(null);
          setIsLocating(false);
          console.log('User position obtained:', userPosition);
        },
        (error: GeolocationPositionError) => {
          console.error('Geolocation error:', error);
          setLocationError(error.message);
          setPosition(null);
          setIsLocating(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 600000 // 10 minutes
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
    }
  }, []);

  // Fly to user location when map and position are both available
  useEffect(() => {
    if (mapInstanceRef.current && position && !hasFlownRef.current) {
      console.log('Flying to user location on initial load');
      setIsAnimating(true);
      setShouldFlyTo(true);
      hasFlownRef.current = true;
    }
  }, [position]);

  // Handle go to location button click
  const handleGoToLocation = (): void => {
    if (!mapInstanceRef.current) {
      console.error('Map instance not available');
      return;
    }

    if (!position) {
      console.error('User position not available');
      setIsLocating(true);
      // Try to get location again
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos: GeolocationPosition) => {
            const userPosition: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setPosition(userPosition);
            setIsLocating(false);
            setIsAnimating(true);
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo(userPosition, 16, { 
                animate: true, 
                duration: 2,
                easeLinearity: 0.1
              });
              setTimeout(() => setIsAnimating(false), 2000);
            }
            console.log('Re-obtained position and flying to:', userPosition);
          },
          (error: GeolocationPositionError) => {
            console.error('Failed to get current position:', error);
            setLocationError(error.message);
            setIsLocating(false);
          }
        );
      }
      return;
    }

    console.log('Flying to current position:', position);
    setIsAnimating(true);
    mapInstanceRef.current.flyTo(position, 16, { 
      animate: true, 
      duration: 1.8,
      easeLinearity: 0.1
    });
    setTimeout(() => setIsAnimating(false), 1800);
  };

  const handleMapReady = (map: L.Map): void => {
    mapInstanceRef.current = map;
  };

  const handleFlyComplete = (): void => {
    setShouldFlyTo(false);
    setIsAnimating(false);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-2xl" style={{ height: "80vh" }}>
      <MapContainer
        center={position || defaultPosition}
        zoom={position ? 16 : 13}
        style={{ height: "100%", width: "100%" }}
        className="z-10"
      >
        <MapController
          position={position}
          onMapReady={handleMapReady}
          shouldFlyTo={shouldFlyTo}
          onFlyComplete={handleFlyComplete}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Show default marker only if user location is not available */}
        {!position && !locationError && (
          <Marker position={defaultPosition}>
            <Popup>
              <div className="text-center">
                <div className="animate-pulse">📍</div>
                <div className="font-semibold">Finding your location...</div>
                <div className="text-sm text-gray-600">Please wait</div>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Show error marker if location failed */}
        {!position && locationError && (
          <Marker position={defaultPosition}>
            <Popup>
              <div className="text-center">
                <div className="text-red-500 text-lg">⚠️</div>
                <div className="font-semibold text-red-600">Location unavailable</div>
                <div className="text-sm text-gray-600">{locationError}</div>
                <div className="text-xs text-gray-500 mt-1">Showing default location</div>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* User location marker with animation */}
        {position && (
          <Marker position={position}>
            <Popup>
              <div className="text-center">
                <div className="text-green-500 text-lg animate-bounce">📍</div>
                <div className="font-semibold text-green-600">You are here!</div>
                <div className="text-sm text-gray-600">Current location</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Animated floating location button */}
      <button
        onClick={handleGoToLocation}
        disabled={isLocating || isAnimating}
        className={`
          absolute bottom-6 right-6 z-[1000] 
          bg-gradient-to-r from-red-500 to-pink-500 
          hover:from-red-600 hover:to-pink-600 
          text-white border-none rounded-full 
          w-14 h-14 shadow-2xl 
          flex items-center justify-center 
          cursor-pointer transition-all duration-300 
          disabled:opacity-70 disabled:cursor-not-allowed
          hover:scale-110 hover:shadow-3xl
          ${isAnimating ? 'animate-pulse scale-105' : ''}
          ${isLocating ? 'animate-spin' : ''}
        `}
        title={position ? "Go to my location" : "Get my location"}
        style={{
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {isLocating ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <LocateFixed className={`w-6 h-6 transition-transform duration-300 ${isAnimating ? 'scale-125' : ''}`} />
        )}
      </button>

      {/* Animated status indicator */}
      <div className={`
        absolute top-6 left-6 z-[1000] 
        bg-white/90 backdrop-blur-sm 
        px-4 py-3 rounded-full shadow-lg 
        text-sm font-medium
        transition-all duration-500 ease-in-out
        ${isLocating ? 'animate-pulse' : ''}
      `}>
        <div className="flex items-center space-x-2">
          {isLocating && (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          )}
          {!position && !locationError && !isLocating && (
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          )}
          {!position && locationError && (
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
          )}
          {position && (
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          )}
          <span className={`
            ${isLocating ? 'text-blue-600' : ''}
            ${!position && locationError ? 'text-red-600' : ''}
            ${position ? 'text-green-600' : ''}
          `}>
            {isLocating && "Locating..."}
            {!position && !locationError && !isLocating && "Location pending"}
            {!position && locationError && "Location unavailable"}
            {position && "Location found"}
          </span>
        </div>
      </div>

      {/* Loading overlay when animating */}
      {isAnimating && (
        <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px] z-20 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-gray-700">Flying to location...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}