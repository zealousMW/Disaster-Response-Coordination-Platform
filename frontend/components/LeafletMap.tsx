import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { LocateFixed, Loader2, List, MapPin, Search, Filter, AlertCircle, Heart, Shield } from "lucide-react";
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

// --- Enhanced Custom icon for DISASTER markers ---
const disasterIcon = new L.DivIcon({
  html: `
    <div class="relative">
      <div class="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white animate-pulse">
        <span class="text-white text-xl font-bold">⚠️</span>
      </div>
      <div class="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full animate-ping"></div>
    </div>
  `,
  className: '',
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  popupAnchor: [0, -48]
});

// --- Enhanced Custom icon for RESOURCE markers ---
const resourceIcon = new L.DivIcon({
  html: `
    <div class="relative">
      <div class="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg border-3 border-white">
        <span class="text-white text-lg">🏥</span>
      </div>
      <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>
    </div>
  `,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

// --- User location icon ---
const userIcon = new L.DivIcon({
  html: `
    <div class="relative">
      <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
        <span class="text-white text-sm">📍</span>
      </div>
      <div class="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30"></div>
    </div>
  `,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
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

type LeafletMapProps = object;

export default function LeafletMap({}: LeafletMapProps) {
  // State for user location, disasters, and UI
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [shouldFlyTo, setShouldFlyTo] = useState<boolean>(false);
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [isFetchingDisasters, setIsFetchingDisasters] = useState<boolean>(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isFetchingResources, setIsFetchingResources] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // --- 2. STATE TO MANAGE THE DETAILED INSIGHT DIALOG ---
  const [selectedDisasterId, setSelectedDisasterId] = useState<string | number | null>(null);
  const [showDisasterList, setShowDisasterList] = useState(false);

  // Refs and constants
  const mapInstanceRef = useRef<L.Map | null>(null);
  const hasFlownRef = useRef<boolean>(false);
  const defaultPosition: [number, number] = [25, 0]; // Center of the world

  // API URL from environment variable
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

  // Filter disasters based on search term
  const filteredDisasters = disasters.filter(disaster =>
    disaster.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    disaster.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    disaster.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Effect to fetch initial disaster data
  useEffect(() => {
    const fetchDisasters = async () => {
      setIsFetchingDisasters(true);
      try {
        console.log("API_URL:", API_URL);
        const response = await fetch(`${API_URL}/disasters`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        setDisasters(await response.json());
        toast.success("Disaster data loaded successfully!");
      } catch (error) {
        console.error("Failed to fetch disasters:", error);
        toast.error("Could not fetch disaster data.");
      } finally {
        setIsFetchingDisasters(false);
      }
    };
    fetchDisasters();
  }, [API_URL]);

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
            toast.info("No resources found nearby.", {
              description: "Try expanding your search radius or check other areas."
            });
        } else {
            toast.success(`Found ${data.length} nearby resource(s)!`, {
              description: "Resources are now visible on the map."
            });
        }
        setResources(data);
        mapInstanceRef.current?.flyTo([latitude, longitude], 12);
    } catch (error) {
        console.error("Error finding nearby resources:", error);
        toast.error("Failed to find nearby resources.", {
          description: "Please check your connection and try again."
        });
    } finally {
        setIsFetchingResources(false);
    }
  };

  const handleMapReady = (map: L.Map) => { mapInstanceRef.current = map; };
  const handleFlyComplete = () => { setShouldFlyTo(false); };
  
  const handleGoToLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported', {
        description: 'Your browser does not support location services.'
      });
      return;
    }
    setIsLocating(true);
    toast.loading('Getting your location...', { id: 'location-toast' });
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setIsLocating(false);
        toast.success('Location found!', { 
          id: 'location-toast',
          description: 'Flying to your current position.'
        });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([pos.coords.latitude, pos.coords.longitude], 16);
        }
      },
      (err) => {
        setIsLocating(false);
        toast.error('Location access denied', { 
          id: 'location-toast',
          description: 'Please enable location permissions to use this feature.'
        });
      }
    );
  };

  const handleDisasterListItemClick = (disaster: Disaster) => {
    setShowDisasterList(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([disaster.latitude, disaster.longitude], 16);
      toast.info(`Flying to ${disaster.title}`, {
        description: "Check the map for detailed information."
      });
    }
  };

  // --- 3. HANDLER TO CONTROL DIALOG OPEN/CLOSE STATE ---
  const handleInsightDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedDisasterId(null);
    }
  };

  const getSeverityColor = (tags: string[]) => {
    if (tags.some(tag => ['critical', 'severe', 'emergency'].includes(tag.toLowerCase()))) {
      return 'from-red-600 to-red-700';
    } else if (tags.some(tag => ['moderate', 'warning'].includes(tag.toLowerCase()))) {
      return 'from-yellow-500 to-orange-600';
    }
    return 'from-blue-500 to-blue-600';
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" style={{ height: "80vh" }}>
      <Toaster position="top-center" richColors expand visibleToasts={3} />
      
      {/* Enhanced Search and Filter Bar */}
      <div className="absolute top-6 left-6 right-6 z-[1000] flex gap-4">
        <div className="flex-1 relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search disasters, locations, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500"
            />
          </div>
          {searchTerm && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-xl max-h-48 overflow-y-auto">
              {filteredDisasters.slice(0, 5).map((disaster) => (
                <div
                  key={disaster.id}
                  onClick={() => {
                    setSearchTerm("");
                    handleDisasterListItemClick(disaster);
                  }}
                  className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{disaster.title}</h4>
                      <p className="text-sm text-gray-600 truncate">{disaster.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-white/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-3 hover:bg-white transition-all duration-200 group"
        >
          <Filter className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
        </button>
      </div>

      <MapContainer
        center={defaultPosition}
        zoom={3}
        style={{ height: "100%", width: "100%" }}
        className="z-10"
      >
        <MapController {...{position, onMapReady: handleMapReady, shouldFlyTo, onFlyComplete: handleFlyComplete}} />
        <TileLayer 
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
        />
        
        {/* Enhanced User Location Marker */}
        {position && (
          <Marker position={position} icon={userIcon}>
            <Popup className="custom-popup">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg text-center">
                <MapPin className="w-6 h-6 mx-auto mb-2" />
                <h3 className="font-bold text-lg">You are here!</h3>
                <p className="text-sm opacity-90">Current location</p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Enhanced Disaster Markers */}
        {(searchTerm ? filteredDisasters : disasters)
          .filter(d => typeof d.latitude === 'number' && typeof d.longitude === 'number')
          .map((disaster) => (
            <Marker key={`disaster-${disaster.id}`} position={[disaster.latitude, disaster.longitude]} icon={disasterIcon}>
              <Popup className="custom-popup">
                <div className="w-80 space-y-4 p-2">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-xl mb-2 text-gray-800">{disaster.title}</h3>
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">{disaster.description}</p>
                      
                      {disaster.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {disaster.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <button 
                      onClick={() => handleFindNearbyResources(disaster)} 
                      disabled={isFetchingResources} 
                      className="w-full bg-gradient-to-r from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                    >
                      {isFetchingResources ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Searching Resources...
                        </>
                      ) : (
                        <>
                          <Heart className="w-4 h-4" />
                          Find Nearby Resources
                        </>
                      )}
                    </button>
                    
                    <button 
                      onClick={() => setSelectedDisasterId(disaster.id)} 
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Shield className="w-4 h-4" />
                      View Detailed Insight
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
        ))}

        {/* Enhanced Resource Markers */}
        {resources
            .filter(r => typeof r.latitude === 'number' && typeof r.longitude === 'number')
            .map((resource) => (
                <Marker key={`resource-${resource.id}`} position={[resource.latitude, resource.longitude]} icon={resourceIcon}>
                    <Popup className="custom-popup">
                        <div className="w-64 p-2">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <Heart className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h4 className="font-bold text-lg mb-1 text-gray-800">{resource.name}</h4>
                                <p className="text-sm text-gray-600 mb-1">
                                  <span className="font-medium">Type:</span> {resource.resource_type}
                                </p>
                                {resource.quantity && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Available:</span> {resource.quantity}
                                  </p>
                                )}
                                <div className="mt-2 px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full inline-block font-medium">
                                  Available Resource
                                </div>
                              </div>
                            </div>
                        </div>
                    </Popup>
                </Marker>
        ))}
      </MapContainer>

      {/* Enhanced Status Indicator */}
      <div className="absolute top-20 left-6 z-[1000] bg-white/95 backdrop-blur-xl px-6 py-4 rounded-xl shadow-lg border border-white/20">
        <div className="flex items-center space-x-3">
          {(isLocating || isFetchingDisasters || isFetchingResources) && (
            <div className="relative">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <div className="absolute inset-0 w-5 h-5 bg-blue-500 rounded-full animate-ping opacity-30"></div>
            </div>
          )}
          <div>
            <span className="text-gray-800 font-semibold">
              {isLocating && "📍 Getting your location..."}
              {isFetchingDisasters && "🔍 Loading disasters..."}
              {isFetchingResources && "🏥 Finding resources..."}
              {!(isLocating || isFetchingDisasters || isFetchingResources) && "✅ System Ready"}
            </span>
            {!(isLocating || isFetchingDisasters || isFetchingResources) && (
              <p className="text-sm text-gray-600 mt-1">
                {disasters.length} disasters • {resources.length} resources
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Enhanced Floating Action Buttons */}
      <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-4">
        <button
          onClick={() => setShowDisasterList(true)}
          className="group bg-white/95 backdrop-blur-xl text-gray-700 border border-white/20 p-4 rounded-2xl shadow-xl hover:bg-white hover:scale-105 transition-all duration-300 flex items-center gap-3 font-semibold"
        >
          <List className="w-6 h-6 text-blue-600" />
          <span className="hidden group-hover:inline-block transition-all duration-300">
            All Disasters
          </span>
        </button>
        
        <button 
          onClick={handleGoToLocation} 
          disabled={isLocating}
          className="group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-4 rounded-2xl shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center relative overflow-hidden"
        >
          {isLocating ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <LocateFixed className="w-6 h-6" />
          )}
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>
      </div>

      {/* Enhanced Detailed Insight Dialog */}
      <Dialog open={!!selectedDisasterId} onOpenChange={handleInsightDialogClose}>
        <DialogContent className="max-w-4xl sm:max-w-5xl md:max-w-6xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl">
            {selectedDisasterId && <DetailedInsight disasterId={selectedDisasterId} />}
        </DialogContent>
      </Dialog>

      {/* Enhanced Disaster List Dialog */}
      <Dialog open={showDisasterList} onOpenChange={setShowDisasterList}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            All Active Disasters
          </DialogTitle>
          <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
            {disasters.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg">No disasters found</p>
                <p className="text-gray-400 text-sm">Check back later for updates</p>
              </div>
            ) : (
              disasters.map((disaster) => (
                <div
                  key={disaster.id}
                  className="group p-4 bg-gradient-to-r from-white to-blue-50 rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all duration-300 border border-blue-100 hover:border-blue-300 transform hover:-translate-y-1"
                  onClick={() => handleDisasterListItemClick(disaster)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-700 transition-colors">
                        {disaster.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{disaster.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {disaster.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            {tag}
                          </span>
                        ))}
                        {disaster.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{disaster.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-blue-500 group-hover:translate-x-1 transition-transform duration-300">
                      <MapPin className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Styles */}
      <style jsx global>{`
        .custom-popup .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        
        .custom-popup .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}