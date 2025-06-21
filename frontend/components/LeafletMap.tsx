import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { LocateFixed, Loader2 } from "lucide-react";
import L from "leaflet";
import 'leaflet/dist/leaflet.css';
import { Toaster, toast } from "sonner";

// --- 1. IMPORTS FOR THE DIALOG AND INSIGHT COMPONENT ---
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import DetailedInsight from './DetailedInsight'; // Assuming DetailedInsight.tsx is in the same folder

// Fix for default markers in react-leaflet
delete ((L.Icon.Default.prototype as unknown) as { [key: string]: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Custom icon for DISASTER markers ---
const disasterIcon = new L.DivIcon({
  html: `<div class="text-3xl animate-pulse">🚨</div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

// --- Custom icon for RESOURCE markers ---
const resourceIcon = new L.DivIcon({
  html: `<div class="text-3xl">⚕️</div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

// --- Type definition for DISASTER data ---
interface Disaster {
  id: string | number;
  created_at: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  tags: string[];
}

// --- Type definition for RESOURCE data ---
interface Resource {
    id: string | number;
    name: string;
    resource_type: string;
    latitude: number;
    longitude: number;
    quantity?: number;
}


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
  useEffect(() => { onMapReady(map); }, [map, onMapReady]);
  useEffect(() => {
    if (map && position && shouldFlyTo) {
      map.flyTo(position, 16, { animate: true, duration: 2, easeLinearity: 0.1 });
      const timer = setTimeout(() => onFlyComplete(), 2000);
      return () => clearTimeout(timer);
    }
  }, [map, position, shouldFlyTo, onFlyComplete]);
  return null;
}

// Replace empty interface with type alias to avoid lint error
// type LeafletMapProps = object;
type LeafletMapProps = object;

export default function LeafletMap({}: LeafletMapProps) {
  // State for user location, disasters, and UI
  const [position, setPosition] = useState<[number, number] | null>(null);
  // Removed unused locationError and isAnimating
  // const [locationError, setLocationError] = useState<string | null>(null);
  // const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [shouldFlyTo, setShouldFlyTo] = useState<boolean>(false);
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [isFetchingDisasters, setIsFetchingDisasters] = useState<boolean>(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isFetchingResources, setIsFetchingResources] = useState<boolean>(false);

  // --- 2. STATE TO MANAGE THE DETAILED INSIGHT DIALOG ---
  const [selectedDisasterId, setSelectedDisasterId] = useState<string | number | null>(null);
  const [showDisasterList, setShowDisasterList] = useState(false);

  // Refs and constants
  const mapInstanceRef = useRef<L.Map | null>(null);
  const hasFlownRef = useRef<boolean>(false);
  const defaultPosition: [number, number] = [25, 0]; // Center of the world

  // API URL from environment variable
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

  // Effect to fetch initial disaster data
  useEffect(() => {
    const fetchDisasters = async () => {
      setIsFetchingDisasters(true);
      try {
        console.log("API_URL:", API_URL); // Debug: log API_URL
        const response = await fetch(`${API_URL}/disasters`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        setDisasters(await response.json());
      } catch (error) {
        console.error("Failed to fetch disasters:", error);
        toast.error("Could not fetch disaster data.");
      } finally {
        setIsFetchingDisasters(false);
      }
    };
    fetchDisasters();
  }, [API_URL]); // Add API_URL to dependency array

  // Effect to fly to user location on initial load
  useEffect(() => {
    if (mapInstanceRef.current && position && !hasFlownRef.current) {
      setShouldFlyTo(true);
      hasFlownRef.current = true;
    }
  }, [position]);

  // Handler to find nearby resources for a specific disaster
  const handleFindNearbyResources = async (disaster: Disaster) => {
    if (!disaster) return;
    setIsFetchingResources(true);
    setResources([]);
    const { latitude, longitude } = disaster;
    try {
        const url = `${API_URL}/resources/nearby?lat=${latitude}&lon=${longitude}&radius=20000`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch resources. Status: ${response.status}`);
        const data: Resource[] = await response.json();
        if (data.length === 0) {
            toast.info("No resources found nearby.");
        } else {
            toast.success(`Found ${data.length} nearby resource(s)!`);
        }
        setResources(data);
        mapInstanceRef.current?.flyTo([latitude, longitude], 12);
    } catch (error) {
        console.error("Error finding nearby resources:", error);
        toast.error("Failed to find nearby resources.");
    } finally {
        setIsFetchingResources(false);
    }
  };

  const handleMapReady = (map: L.Map) => { mapInstanceRef.current = map; };
  const handleFlyComplete = () => { setShouldFlyTo(false); };
  const handleGoToLocation = () => {
    if (!navigator.geolocation) {
      // setLocationError('Geolocation is not supported by this browser.');
      toast.error('Geolocation is not supported by this browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setIsLocating(false);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([pos.coords.latitude, pos.coords.longitude], 16);
        }
      },
      () => {
        // setLocationError(err.message);
        setIsLocating(false);
        toast.error('Failed to get your location.');
      }
    );
  };
  const handleDisasterListItemClick = (disaster: Disaster) => {
    setShowDisasterList(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([disaster.latitude, disaster.longitude], 16);
    }
  };

  // --- 3. HANDLER TO CONTROL DIALOG OPEN/CLOSE STATE ---
  const handleInsightDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedDisasterId(null);
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-2xl" style={{ height: "80vh" }}>
      <Toaster position="top-center" richColors />
      <MapContainer
        center={defaultPosition}
        zoom={3}
        style={{ height: "100%", width: "100%" }}
        className="z-10"
      >
        <MapController {...{position, onMapReady: handleMapReady, shouldFlyTo, onFlyComplete: handleFlyComplete}} />
        <TileLayer attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {position && <Marker position={position}><Popup>You are here!</Popup></Marker>}
        
        {/* Render markers for each DISASTER */}
        {disasters
          .filter(d => typeof d.latitude === 'number' && typeof d.longitude === 'number')
          .map((disaster) => (
            <Marker key={`disaster-${disaster.id}`} position={[disaster.latitude, disaster.longitude]} icon={disasterIcon}>
              <Popup>
                <div className="w-64 space-y-2">
                  <h3 className="font-bold text-base mb-1">{disaster.title}</h3>
                  <p className="text-sm text-gray-700 mb-2">{disaster.description}</p>
                  
                  {/* Button to find nearby resources */}
                  <button onClick={() => handleFindNearbyResources(disaster)} disabled={isFetchingResources} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors disabled:bg-gray-400">
                    {isFetchingResources ? 'Searching...' : 'Find Nearby Resources'}
                  </button>
                  
                  {/* --- 4. BUTTON TO OPEN THE INSIGHT DIALOG --- */}
                  <button onClick={() => setSelectedDisasterId(disaster.id)} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">
                    View Detailed Insight
                  </button>
                </div>
              </Popup>
            </Marker>
        ))}

        {/* Render markers for each nearby RESOURCE */}
        {resources
            .filter(r => typeof r.latitude === 'number' && typeof r.longitude === 'number')
            .map((resource) => (
                <Marker key={`resource-${resource.id}`} position={[resource.latitude, resource.longitude]} icon={resourceIcon}>
                    <Popup>
                        <div className="w-56">
                            <h4 className="font-bold text-base mb-1">{resource.name}</h4>
                            <p className="text-sm text-gray-600">Type: {resource.resource_type}</p>
                            {resource.quantity && <p className="text-sm text-gray-600">Quantity: {resource.quantity}</p>}
                        </div>
                    </Popup>
                </Marker>
        ))}
      </MapContainer>

      {/* Animated status indicator */}
      <div className="absolute top-6 left-6 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-3 rounded-full shadow-lg text-sm font-medium">
        <div className="flex items-center space-x-2">
          {(isLocating || isFetchingDisasters || isFetchingResources) && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          <span className="text-blue-600">
            {isLocating && "Locating..."}
            {isFetchingDisasters && "Fetching disasters..."}
            {isFetchingResources && "Fetching resources..."}
            {!(isLocating || isFetchingDisasters || isFetchingResources) && "Ready"}
          </span>
        </div>
      </div>
      
      {/* Other UI elements */}
      {/* Button to open disaster list */}
      <button
        onClick={() => setShowDisasterList(true)}
        className="absolute bottom-24 right-6 z-[1000] bg-white text-blue-700 border border-blue-300 p-4 rounded-full shadow-lg hover:bg-blue-50 transition-transform font-semibold flex items-center gap-2"
      >
        <span className="text-lg">📋</span> Show All Disasters
      </button>
      <button onClick={handleGoToLocation} className="absolute bottom-6 right-6 z-[1000] bg-red-500 text-white p-4 rounded-full shadow-lg hover:scale-105 transition-transform">
        <LocateFixed/>
      </button>

      {/* --- 5. CONTROLLED DIALOG FOR DETAILED INSIGHT --- */}
      <Dialog open={!!selectedDisasterId} onOpenChange={handleInsightDialogClose}>
        <DialogContent className="max-w-4xl sm:max-w-5xl md:max-w-6xl">
            {selectedDisasterId && <DetailedInsight disasterId={selectedDisasterId} />}
        </DialogContent>
      </Dialog>

      {/* Disaster List Dialog */}
      <Dialog open={showDisasterList} onOpenChange={setShowDisasterList}>
        <DialogContent className="max-w-lg">
          <DialogTitle>All Disasters</DialogTitle>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {disasters.length === 0 ? (
              <p className="text-gray-500">No disasters found.</p>
            ) : (
              disasters.map((disaster) => (
                <div
                  key={disaster.id}
                  className="p-4 bg-blue-50 rounded-lg shadow hover:bg-blue-100 cursor-pointer transition-colors border border-blue-200"
                  onClick={() => handleDisasterListItemClick(disaster)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🚨</span>
                    <div>
                      <h3 className="font-semibold text-lg text-blue-800">{disaster.title}</h3>
                      <p className="text-sm text-gray-700">{disaster.description}</p>
                      <p className="text-xs text-gray-500 mt-1">Tags: {disaster.tags.join(', ')}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}