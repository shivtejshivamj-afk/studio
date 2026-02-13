'use client';

import {
  Users,
  Dumbbell,
  DollarSign,
  UserX,
  Eye,
  Mail,
  Copy,
} from 'lucide-react';
import { type Member } from '@/lib/data';
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
import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
  useDoc,
} from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

const statusVariant = {
  active: 'default',
  inactive: 'secondary',
} as const;

export default function DashboardPage() {
  const { toast } = useToast();
  type DialogType = 'view' | null;
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isClient, setIsClient] = useState(false);

  const { user } = useUser();
  const firestore = useFirestore();

  const adminProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );
  const { data: adminProfile, isLoading: isLoadingAdminProfile } =
    useDoc<{ gymName: string }>(adminProfileRef);

  const membersQuery = useMemoFirebase(
    () =>
      firestore && adminProfile?.gymName
        ? query(
            collection(firestore, 'members'),
            where('gymName', '==', adminProfile.gymName)
          )
        : null,
    [firestore, adminProfile]
  );
  const { data: members, isLoading: isLoadingMembers } =
    useCollection<Member>(membersQuery);

  const isLoading = isLoadingAdminProfile || isLoadingMembers;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const inactiveMembers = useMemo(
    () => members?.filter((member) => !member.isActive) || [],
    [members]
  );

  const activeMembersCount = useMemo(
    () => members?.filter((m) => m.isActive).length || 0,
    [members]
  );

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
      description: `An activation reminder has been sent to ${member.firstName} ${member.lastName}.`,
    });
  };

  const handleCopy = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        toast({
          title: 'Copied to clipboard!',
          description: `ID: ${text}`,
        });
      });
    }
  };

  const statCards = [
    {
      title: 'Total Members',
      value: members?.length ?? 0,
      icon: Users,
      loading: isLoading,
    },
    {
      title: 'Active Members',
      value: activeMembersCount,
      icon: Dumbbell,
      loading: isLoading,
    },
    {
      title: 'Inactive Members',
      value: inactiveMembers.length,
      icon: UserX,
      loading: isLoading,
    },
    {
      title: 'Total Revenue',
      value: `$0`, // This would be calculated from invoice data
      icon: DollarSign,
      loading: true, // Replace with invoice loading state
    },
  ];


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
                {card.loading ? (
                  <Skeleton className="h-8 w-20" />
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
              <CardTitle>Inactive Memberships</CardTitle>
              <CardDescription>
                Members whose accounts are currently inactive.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Gym ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                     Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : inactiveMembers.length > 0 ? (
                    inactiveMembers.map((member) => {
                      return (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="font-medium">{`${member.firstName} ${member.lastName}`}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {member.gymId}
                              {isClient && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleCopy(member.gymId)}
                                >
                                  <Copy className="h-4 w-4" />
                                  <span className="sr-only">Copy Member ID</span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant[member.isActive ? 'active' : 'inactive']}>
                              {member.isActive ? 'Active' : 'Inactive'}
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
                                  <span className="sr-only">
                                    Send Reminder
                                  </span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleOpenDialog('view', member)
                                  }
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
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">No inactive members found.</TableCell>
                    </TableRow>
                  )}
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
                    {selectedMember.firstName} {selectedMember.lastName}
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
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">Member ID:</span>
                    {selectedMember.gymId}
                    {isClient && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopy(selectedMember.gymId)}
                      >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copy Member ID</span>
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-semibold">Status:</span>{' '}
                  <Badge variant={statusVariant[selectedMember.isActive ? 'active' : 'inactive']}>
                    {selectedMember.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <span className="font-semibold">Join Date:</span>{' '}
                  {selectedMember.joinDate}
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
