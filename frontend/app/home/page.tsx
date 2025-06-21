"use client";
import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { ssr: false });

export default function HomeMapPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const cachedUser = localStorage.getItem("userId");
    setUserId(cachedUser);
  }, []);

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "19rem" } as React.CSSProperties }
    >
      <AppSidebar />
      <SidebarInset>
        <SidebarTrigger />
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
      </SidebarInset>
    </SidebarProvider>
  );
}
