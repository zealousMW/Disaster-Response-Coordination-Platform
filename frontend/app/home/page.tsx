"use client";
import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { FilePlus, AlertTriangle, ListOrdered, Newspaper, User, LogOut, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import CreateDisasterForm from "@/components/createDisaster";
import OfficialUpdatesFeed from "@/components/OfficialUpdatesFeed";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { ssr: false });

const menuItems = [
  {
    title: "Create Disaster",
    url: "/disaster/create",
    icon: FilePlus,
    gradient: "from-emerald-500 to-teal-600",
    hoverGradient: "from-emerald-600 to-teal-700",
    description: "Report new incidents"
  },
  {
    title: "Report Disaster",
    url: "/disaster/report",
    icon: AlertTriangle,
    gradient: "from-amber-500 to-orange-600",
    hoverGradient: "from-amber-600 to-orange-700",
    description: "Submit urgent reports"
  },
  {
    title: "View Disasters",
    url: "/disaster/view",
    icon: ListOrdered,
    gradient: "from-blue-500 to-indigo-600",
    hoverGradient: "from-blue-600 to-indigo-700",
    description: "Browse all incidents"
  },
  {
    title: "Show Headlines",
    url: "/headlines",
    icon: Newspaper,
    gradient: "from-purple-500 to-pink-600",
    hoverGradient: "from-purple-600 to-pink-700",
    description: "Latest news updates"
  },
];

export default function HomeMapPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showHeadlinesDialog, setShowHeadlinesDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cachedUser = localStorage.getItem("userId");
    setUserId(cachedUser);
    // Simulate loading delay for better UX
    setTimeout(() => setIsLoading(false), 800);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-400/30 rounded-full animate-spin border-t-blue-400 mx-auto mb-6"></div>
            <MapPin className="w-8 h-8 text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Disaster Management System</h2>
          <p className="text-blue-300">Preparing your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -right-8 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute -bottom-8 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/10 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Disaster Management</h1>
                <p className="text-blue-200 text-sm">Real-time monitoring & response</p>
              </div>
            </div>
            
            {userId && (
              <div className="flex items-center space-x-4">
                <div className="bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{userId}</p>
                      <p className="text-xs text-blue-300">Online</p>
                    </div>
                  </div>
                </div>
                <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1">
        <Suspense fallback={
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-400/30 rounded-full animate-spin border-t-blue-400 mx-auto mb-4"></div>
              <p className="text-white">Loading map...</p>
            </div>
          </div>
        }>
          {userId ? (
            <div className="h-[calc(100vh-120px)] relative">
              <LeafletMap />
              {/* Map overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none"></div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Authentication Required</h3>
                <p className="text-red-300 mb-4">Please log in to access the disaster management system</p>
                <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                  Login Now
                </button>
              </div>
            </div>
          )}
        </Suspense>
      </main>

      {/* Floating Action Menu */}
      <div className="fixed left-8 top-1/2 transform -translate-y-1/2 z-50 space-y-4">
        {menuItems.map((item, index) => (
          item.title === "Create Disaster" ? (
            <div key={item.title} className="group relative">
              <button
                onClick={() => setShowCreateDialog(true)}
                className={`
                  relative overflow-hidden w-16 h-16 rounded-2xl shadow-2xl
                  bg-gradient-to-r ${item.gradient} hover:${item.hoverGradient}
                  transform hover:scale-110 transition-all duration-300 ease-out
                  border border-white/20 backdrop-blur-xl
                  focus:outline-none focus:ring-4 focus:ring-white/30
                  animate-fade-in-left
                `}
                style={{ animationDelay: `${index * 100}ms` }}
                aria-label={item.title}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <item.icon className="w-8 h-8 text-white relative z-10 mx-auto" />
                
                {/* Ripple effect */}
                <div className="absolute inset-0 rounded-2xl bg-white/20 scale-0 group-active:scale-100 transition-transform duration-150"></div>
              </button>
              
              {/* Enhanced tooltip */}
              <div className="absolute left-20 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300 pointer-events-none">
                <div className="bg-white/95 backdrop-blur-xl rounded-xl p-4 shadow-2xl border border-white/20 min-w-48">
                  <h4 className="font-bold text-gray-800 mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-600">{item.description}</p>
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-3 h-3 bg-white/95 rotate-45 border-l border-b border-white/20"></div>
                </div>
              </div>
            </div>
          ) : item.title === "Show Headlines" ? (
            <div key={item.title} className="group relative">
              <button
                onClick={() => setShowHeadlinesDialog(true)}
                className={`
                  relative overflow-hidden w-16 h-16 rounded-2xl shadow-2xl
                  bg-gradient-to-r ${item.gradient} hover:${item.hoverGradient}
                  transform hover:scale-110 transition-all duration-300 ease-out
                  border border-white/20 backdrop-blur-xl
                  focus:outline-none focus:ring-4 focus:ring-white/30
                  animate-fade-in-left
                `}
                style={{ animationDelay: `${index * 100}ms` }}
                aria-label={item.title}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <item.icon className="w-8 h-8 text-white relative z-10 mx-auto" />
                
                {/* Ripple effect */}
                <div className="absolute inset-0 rounded-2xl bg-white/20 scale-0 group-active:scale-100 transition-transform duration-150"></div>
              </button>
              
              {/* Enhanced tooltip */}
              <div className="absolute left-20 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300 pointer-events-none">
                <div className="bg-white/95 backdrop-blur-xl rounded-xl p-4 shadow-2xl border border-white/20 min-w-48">
                  <h4 className="font-bold text-gray-800 mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-600">{item.description}</p>
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-3 h-3 bg-white/95 rotate-45 border-l border-b border-white/20"></div>
                </div>
              </div>
            </div>
          ) : (
            <div key={item.title} className="group relative">
              <a
                href={item.url}
                className={`
                  relative overflow-hidden w-16 h-16 rounded-2xl shadow-2xl
                  bg-gradient-to-r ${item.gradient} hover:${item.hoverGradient}
                  transform hover:scale-110 transition-all duration-300 ease-out
                  border border-white/20 backdrop-blur-xl
                  focus:outline-none focus:ring-4 focus:ring-white/30
                  animate-fade-in-left flex items-center justify-center
                `}
                style={{ animationDelay: `${index * 100}ms` }}
                aria-label={item.title}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <item.icon className="w-8 h-8 text-white relative z-10" />
                
                {/* Ripple effect */}
                <div className="absolute inset-0 rounded-2xl bg-white/20 scale-0 group-active:scale-100 transition-transform duration-150"></div>
              </a>
              
              {/* Enhanced tooltip */}
              <div className="absolute left-20 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300 pointer-events-none">
                <div className="bg-white/95 backdrop-blur-xl rounded-xl p-4 shadow-2xl border border-white/20 min-w-48">
                  <h4 className="font-bold text-gray-800 mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-600">{item.description}</p>
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-3 h-3 bg-white/95 rotate-45 border-l border-b border-white/20"></div>
                </div>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Enhanced Create Disaster Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Report a New Disaster
          </DialogTitle>
          <CreateDisasterForm onSuccess={() => setShowCreateDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Headlines Dialog */}
      <Dialog open={showHeadlinesDialog} onOpenChange={setShowHeadlinesDialog}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Latest Headlines
          </DialogTitle>
          <OfficialUpdatesFeed />
        </DialogContent>
      </Dialog>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fade-in-left {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fade-in-left {
          animation: fade-in-left 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}