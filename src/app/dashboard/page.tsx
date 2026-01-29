'use client';

import {
  Users,
  Dumbbell,
  DollarSign,
  Clock,
  Building,
  ClipboardCopy,
  Eye,
  Mail,
  MoreVertical,
} from 'lucide-react';
import Image from 'next/image';
import { dashboardStats, members, gymInfo, type Member } from '@/lib/data';
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
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statCards = [
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
    title: 'Overdue',
    value: dashboardStats.expiringSoon,
    icon: Clock,
  },
  {
    title: 'Total Revenue',
    value: `$${dashboardStats.totalRevenue.toLocaleString()}`,
    icon: DollarSign,
  },
  {
    title: 'Gym ID',
    value: gymInfo.id,
    icon: Building,
  },
];

const overdueMembers = members.filter(
  (member) => member.status === 'Overdue'
);

const statusVariant = {
  Paid: 'default',
  Pending: 'secondary',
  Overdue: 'destructive',
} as const;

export default function DashboardPage() {
  const { toast } = useToast();
  type DialogType = 'view' | null;
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleOpenDialog = (dialog: DialogType, member?: Member) => {
    setSelectedMember(member || null);
    setActiveDialog(dialog);
  };

  const closeDialogs = () => {
    setActiveDialog(null);
    setSelectedMember(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard!',
      description: `The Gym ID "${text}" has been copied.`,
    });
  };

  const handleSendReminder = (member: Member) => {
    toast({
      title: 'Reminder Sent!',
      description: `A renewal reminder has been sent to ${member.name}.`,
    });
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {card.title === 'Gym ID' ? (
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{card.value}</div>
                    {isClient && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(card.value as string)}
                        className="h-8 w-8"
                      >
                        <ClipboardCopy className="h-4 w-4" />
                        <span className="sr-only">Copy Gym ID</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-2xl font-bold">{card.value}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Memberships</CardTitle>
              <CardDescription>
                Members with an overdue payment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead className="hidden sm:table-cell">Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueMembers.map((member) => {
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
                        <TableCell>
                          <Badge variant={statusVariant[member.status]}>{member.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isClient ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSendReminder(member)}
                              >
                                <Mail className="h-4 w-4" />
                                <span className="sr-only">Send Reminder</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog('view', member)}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View</span>
                              </Button>
                            </div>
                          ) : (
                            <div className="h-10 w-20" />
                          )}
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

      <Dialog
        open={activeDialog === 'view'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeDialogs();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="grid gap-4 py-4 text-sm">
              <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={
                      PlaceHolderImages.find(
                        (p) => p.id === selectedMember.avatar
                      )?.imageUrl
                    }
                    alt={selectedMember.name}
                  />
                  <AvatarFallback>
                    {selectedMember.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedMember.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedMember.email}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedMember.phone}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div>
                  <span className="font-semibold">Plan:</span>{' '}
                  {selectedMember.plan}
                </div>
                <div>
                  <span className="font-semibold">Status:</span>{' '}
                  <Badge variant={statusVariant[selectedMember.status]}>
                    {selectedMember.status}
                  </Badge>
                </div>
                <div>
                  <span className="font-semibold">Join Date:</span>{' '}
                  {selectedMember.joinDate}
                </div>
                <div>
                  <span className="font-semibold">Expiry Date:</span>{' '}
                  {selectedMember.expiryDate}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={closeDialogs}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
