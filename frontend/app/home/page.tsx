"use client";
import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { FilePlus, AlertTriangle, ListOrdered, Newspaper } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import CreateDisasterForm from "@/components/createDisaster";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { ssr: false });

const menuItems = [
  {
    title: "Create Disaster",
    url: "/disaster/create",
    icon: FilePlus,
    color: "bg-green-600 hover:bg-green-700 focus:ring-green-300",
  },
  {
    title: "Report Disaster",
    url: "/disaster/report",
    icon: AlertTriangle,
    color: "bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-200",
  },
  {
    title: "View Disasters",
    url: "/disaster/view",
    icon: ListOrdered,
    color: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-300",
  },
  {
    title: "Show Headlines",
    url: "/headlines",
    icon: Newspaper,
    color: "bg-purple-600 hover:bg-purple-700 focus:ring-purple-300",
  },
];

export default function HomeMapPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    const cachedUser = localStorage.getItem("userId");
    setUserId(cachedUser);
  }, []);

  return (
    <div className="relative min-h-screen w-full">
      <Suspense fallback={<div>Loading...</div>}>
        {userId ? (
          <>
            <div style={{ marginBottom: 16 }}>
              Logged in as: <b>{userId}</b>
            </div>
            <LeafletMap />
          </>
        ) : (
          <div style={{ color: "red" }}>
            No user found in cache. Please login first.
          </div>
        )}
      </Suspense>
      {/* Floating Action Buttons on the left with glassmorphism and sliding labels */}
      <div className="fixed left-8 bottom-1/3 z-50 flex flex-col gap-6">
        {menuItems.map((item) =>
          item.title === "Create Disaster" ? (
            <button
              key={item.title}
              type="button"
              onClick={() => setShowCreateDialog(true)}
              className={`group relative flex items-center w-fit h-16 rounded-full shadow-xl transition-transform duration-200 focus:outline-none focus:ring-4 ${item.color} bg-opacity-70 backdrop-blur-md border border-white/30 hover:scale-105`}
              aria-label={item.title}
              title={item.title}
              style={{ minWidth: 64 }}
            >
              <span className="flex items-center justify-center w-16 h-16">
                <item.icon className="w-8 h-8" />
              </span>
              {/* Sliding label */}
              <span className="absolute left-20 opacity-0 group-hover:opacity-100 group-hover:left-20 transition-all duration-300 bg-white/80 text-gray-800 px-4 py-2 rounded-lg shadow-lg ml-2 font-medium pointer-events-none select-none border border-gray-200 backdrop-blur-md">
                {item.title}
              </span>
            </button>
          ) : (
            <a
              key={item.title}
              href={item.url}
              className={`group relative flex items-center w-fit h-16 rounded-full shadow-xl transition-transform duration-200 focus:outline-none focus:ring-4 ${item.color} bg-opacity-70 backdrop-blur-md border border-white/30 hover:scale-105`}
              aria-label={item.title}
              title={item.title}
              style={{ minWidth: 64 }}
            >
              <span className="flex items-center justify-center w-16 h-16">
                <item.icon className="w-8 h-8" />
              </span>
              {/* Sliding label */}
              <span className="absolute left-20 opacity-0 group-hover:opacity-100 group-hover:left-20 transition-all duration-300 bg-white/80 text-gray-800 px-4 py-2 rounded-lg shadow-lg ml-2 font-medium pointer-events-none select-none border border-gray-200 backdrop-blur-md">
                {item.title}
              </span>
            </a>
          )
        )}
      </div>
      {/* Create Disaster Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>Report a New Disaster</DialogTitle>
          <CreateDisasterForm onSuccess={() => setShowCreateDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
