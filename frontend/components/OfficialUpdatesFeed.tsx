import { useEffect, useState } from 'react';
import { Loader2, ExternalLink, MapPin, AlertTriangle, Calendar, Newspaper } from 'lucide-react';
import { toast } from 'sonner';

// Interfaces and helper functions remain unchanged
interface FemaUpdate {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  feedType: string;
  extractedAt: string;
}

interface ParsedUpdate extends FemaUpdate {
  parsedDetails: {
    summary?: string | null;
    state?: string | null;
    incidentType?: string | null;
    declarationDate?: string | null;
    declarableArea?: string | null;
  };
}

const extractDetail = (key: string, text: string): string | null => {
  const regex = new RegExp(`${key}\\s*\\n\\s*([^\\n]+)`);
  const match = text.match(regex);
  return match ? match[1].trim() : null;
};

const parseFemaDescription = (description: string) => {
  return {
    summary: extractDetail('Disaster Summary', description),
    state: extractDetail('State', description),
    incidentType: extractDetail('Incident Type', description) || extractDetail('Primary Incident Type', description),
    declarationDate: extractDetail('Declaration Date', description),
    declarableArea: extractDetail('Declarable Area \\(county, parish, reservation, etc.\\)', description),
  };
};

/**
 * A component that fetches, parses, and displays official updates from FEMA,
 * with a vibrant, high-contrast UI designed for a light glassmorphism background.
 */
export default function OfficialUpdatesFeed() {
  const [updates, setUpdates] = useState<ParsedUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

  useEffect(() => {
    // The fetching logic remains the same
    const fetchUpdates = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/official-updates`);
        if (!response.ok) {
          throw new Error(`Failed to fetch official updates. Status: ${response.status}`);
        }
        
        const rawUpdates: FemaUpdate[] = await response.json();
        const uniqueUpdates = Array.from(new Map(rawUpdates.map(item => [item.link, item])).values());
        const parsedUpdates: ParsedUpdate[] = uniqueUpdates.map(update => ({
          ...update,
          parsedDetails: parseFemaDescription(update.description),
        }));

        setUpdates(parsedUpdates);
        if (parsedUpdates.length === 0) {
          toast.info("No new official updates found from FEMA at this time.");
        }
      } catch (err: any) {
        const errorMessage = err.message || 'An unknown error occurred.';
        setError(errorMessage);
        toast.error("Error fetching updates", { description: errorMessage });
      } finally {
        setLoading(false);
      }
    };

    fetchUpdates();
  }, [API_URL]);

  return (
    <div className="w-full h-[60vh] flex flex-col">
      <div className="flex-grow overflow-y-auto pr-2 -mr-4 custom-scrollbar">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <p className="mt-4 text-slate-600 font-medium">Fetching latest data...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full bg-red-50 text-red-700 p-6 rounded-lg border-2 border-red-200">
            <AlertTriangle className="w-12 h-12 mb-4 text-red-500" />
            <p className="text-lg font-bold text-red-800">Error Fetching Updates</p>
            <p className="text-sm text-center mt-1">{error}</p>
          </div>
        )}
        
        {!loading && !error && (
          <ul className="space-y-4">
            {updates.length > 0 ? (
              updates.map(update => (
                <li 
                  key={update.id} 
                  className="group bg-white/60 p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-blue-400 transition-all duration-300"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors duration-300">
                        {update.parsedDetails.summary || update.title}
                      </h3>
                      
                      {update.parsedDetails.incidentType && (
                         <span className="inline-block bg-gradient-to-r from-violet-100 to-blue-100 text-blue-800 text-xs font-semibold mr-2 px-3 py-1 rounded-full mt-2 tracking-wide">
                           {update.parsedDetails.incidentType}
                         </span>
                      )}
                    </div>
                    <a 
                      href={update.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline decoration-2 underline-offset-4"
                      aria-label={`View full details for ${update.parsedDetails.summary || update.title} on FEMA.gov`}
                    >
                      <span>Full Details</span>
                      <ExternalLink className="w-4 h-4 ml-1.5" />
                    </a>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {update.parsedDetails.state && (
                      <div className="flex items-center text-slate-600">
                        <MapPin className="w-5 h-5 mr-2.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <strong className="text-slate-700 font-medium">State:</strong>
                        <span className="ml-2">{update.parsedDetails.state}</span>
                      </div>
                    )}
                    {update.parsedDetails.declarableArea && (
                      <div className="flex items-center text-slate-600">
                         <MapPin className="w-5 h-5 mr-2.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                         <strong className="text-slate-700 font-medium">Area:</strong>
                         <span className="ml-2 truncate">{update.parsedDetails.declarableArea}</span>
                      </div>
                    )}
                     {update.pubDate && (
                      <div className="flex items-center text-slate-600">
                         <Calendar className="w-5 h-5 mr-2.5 text-slate-400 group-hover:text-violet-500 transition-colors" />
                         <strong className="text-slate-700 font-medium">Published:</strong>
                         <span className="ml-2">{new Date(update.pubDate).toLocaleDateString()}</span>
                      </div>
                    )}
                     {update.parsedDetails.declarationDate && (
                      <div className="flex items-center text-slate-600">
                         <Calendar className="w-5 h-5 mr-2.5 text-slate-400 group-hover:text-violet-500 transition-colors" />
                         <strong className="text-slate-700 font-medium">Declared:</strong>
                         <span className="ml-2">{new Date(update.parsedDetails.declarationDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </li>
              ))
            ) : (
              <div className="text-center py-16 px-6 bg-slate-50 rounded-lg border border-slate-200">
                <Newspaper className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="font-bold text-slate-700 text-lg">All Quiet on the Official Front</p>
                <p className="text-sm mt-2 text-slate-500">There are no new disaster declarations from FEMA at this time. We'll keep monitoring.</p>
              </div>
            )}
          </ul>
        )}
      </div>
      {/* Add custom scrollbar styles to match the aesthetic */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}