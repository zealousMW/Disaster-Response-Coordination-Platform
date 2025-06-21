"use client";

import {
  Users,
  Building2,
  Bed,
  ClipboardList,
  Pill,
  Activity,
  FileText,
  Syringe,
  ArrowRightLeft,
  LayoutDashboard,
  Calendar, // Add this import
  AlertTriangle,
  FilePlus,
  ListOrdered,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

import { useRouter } from "next/navigation";

const menuGroups = [
  {
    label: "Disaster Management",
    items: [
      {
        title: "Create Disaster",
        url: "/disaster/create",
        icon: FilePlus, // plus file for create
      },
      {
        title: "Report Disaster",
        url: "/disaster/report",
        icon: AlertTriangle, // alert for report
      },
      {
        title: "View Disasters",
        url: "/disaster/view",
        icon: ListOrdered, // list for view
      },
    ],
  },
];

export function AppSidebar() {
  const router = useRouter();

  return (
    <Sidebar collapsible="icon" variant="floating">
       <SidebarContent>
         {menuGroups.map((group) => (
           <SidebarGroup key={group.label}>
             <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
             <SidebarGroupContent>
               <SidebarMenu>
                 {group.items.map((item) => (
                   <SidebarMenuItem key={item.title}>
                     <SidebarMenuButton asChild>
                       <a href={item.url}>
                         <item.icon className="w-5 h-5" />
                         <span>{item.title}</span>
                       </a>
                     </SidebarMenuButton>
                   </SidebarMenuItem>
                 ))}
               </SidebarMenu>
             </SidebarGroupContent>
           </SidebarGroup>
         ))}
       </SidebarContent>
       <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
       </SidebarFooter>
     </Sidebar>
  );
}

export default AppSidebar;
