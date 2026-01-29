'use client';

import {
  Users,
  Dumbbell,
  DollarSign,
  Clock,
  MoreVertical,
  Building,
} from 'lucide-react';
import Image from 'next/image';
import { dashboardStats, members, gymInfo } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statCards = [
  {
    title: 'Gym ID',
    value: gymInfo.id,
    icon: Building,
  },
  {
    title: 'Total Revenue',
    value: `$${dashboardStats.totalRevenue.toLocaleString()}`,
    icon: DollarSign,
  },
  {
    title: 'Total Members',
    value: dashboardStats.totalMembers,
    icon: Users,
  },
  {
    title: 'Active Members',
    value: dashboardStats.activeMembers,
    icon: Dumbbell,
  },
  {
    title: 'Expiring Soon',
    value: dashboardStats.expiringSoon,
    icon: Clock,
  },
];

const expiringMembers = members.filter(
  (member) => member.status === 'Expiring Soon'
);

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expiring Soon</CardTitle>
            <CardDescription>
              Members with memberships expiring soon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="hidden sm:table-cell">Plan</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Expiry Date
                  </TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringMembers.map((member) => {
                  const avatar = PlaceHolderImages.find(
                    (img) => img.id === member.avatar
                  );
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            {avatar && (
                              <AvatarImage
                                src={avatar.imageUrl}
                                alt={member.name}
                                width={40}
                                height={40}
                                data-ai-hint={avatar.imageHint}
                              />
                            )}
                            <AvatarFallback>
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{member.name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {member.plan}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {member.expiryDate}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{member.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Send Reminder</DropdownMenuItem>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
