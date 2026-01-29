'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Dumbbell,
  CreditCard,
  Calendar,
  LayoutDashboard,
  LogOut,
  UserCircle,
} from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/members', icon: Users, label: 'Members' },
  { href: '/dashboard/trainers', icon: Dumbbell, label: 'Trainers' },
  { href: '/dashboard/plans', icon: Calendar, label: 'Plans' },
  { href: '/dashboard/payments', icon: CreditCard, label: 'Payments' },
];

export function DashboardNav() {
  const pathname = usePathname();
  const userAvatar = PlaceHolderImages.find(img => img.id === 'trainer-1');

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Dumbbell className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold">GymTrack Pro</h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={{ children: item.label }}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
        <div className="flex items-center gap-3 p-2">
           <Avatar className="h-10 w-10">
            {userAvatar && <AvatarImage src={userAvatar.imageUrl} alt="Admin" data-ai-hint={userAvatar.imageHint}/>}
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Admin User</span>
            <span className="text-xs text-muted-foreground">admin@gymtrack.pro</span>
          </div>
        </div>
        <Link href="/">
          <SidebarMenuButton tooltip={{ children: 'Logout' }}>
            <LogOut />
            <span>Logout</span>
          </SidebarMenuButton>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
