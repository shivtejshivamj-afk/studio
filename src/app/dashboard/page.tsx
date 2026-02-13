'use client';

import {
  Users,
  Dumbbell,
  DollarSign,
  Clock,
  Eye,
  Mail,
} from 'lucide-react';
import { dashboardStats, members, type Member } from '@/lib/data';
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const processedMembers = members.map((member) => {
    const expiryDate = new Date(member.expiryDate);
    if (expiryDate < today) {
      return { ...member, status: 'Overdue' as const };
    }
    return member;
  });

  const overdueMembers = processedMembers.filter(
    (member) => member.status === 'Overdue'
  );

  const activeMembersCount = processedMembers.filter(
    (m) => m.status === 'Paid'
  ).length;

  const statCards = [
    {
      title: 'Total Members',
      value: members.length,
      icon: Users,
    },
    {
      title: 'Active Members',
      value: activeMembersCount,
      icon: Dumbbell,
    },
    {
      title: 'Overdue',
      value: overdueMembers.length,
      icon: Clock,
    },
    {
      title: 'Total Revenue',
      value: `$${dashboardStats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
    },
  ];

  const handleOpenDialog = (dialog: DialogType, member?: Member) => {
    setSelectedMember(member || null);
    setActiveDialog(dialog);
  };

  const closeDialogs = () => {
    setActiveDialog(null);
    setSelectedMember(null);
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
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
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="font-medium">{member.name}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {member.plan}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[member.status]}>
                            {member.status}
                          </Badge>
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
