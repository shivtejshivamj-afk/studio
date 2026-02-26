
'use client';

import {
  Users,
  Dumbbell,
  UserX,
  Eye,
  Mail,
  Copy,
  Building,
} from 'lucide-react';
import { type Member, type MembershipPlan } from '@/lib/data';
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
import { differenceInDays, parseISO, startOfDay, endOfDay, isPast } from 'date-fns';

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
    useDoc<{ gymName: string; gymIdentifier: string }>(adminProfileRef);

  const membersQuery = useMemoFirebase(
    () =>
      firestore && adminProfile?.gymIdentifier
        ? query(
            collection(firestore, 'members'),
            where('gymIdentifier', '==', adminProfile.gymIdentifier)
          )
        : null,
    [firestore, adminProfile]
  );
  const { data: members, isLoading: isLoadingMembers } =
    useCollection<Member>(membersQuery);

  const plansQuery = useMemoFirebase(
    () =>
      firestore && adminProfile?.gymIdentifier
        ? query(
            collection(firestore, 'membership_plans'),
            where('gymIdentifier', '==', adminProfile.gymIdentifier)
          )
        : null,
    [firestore, adminProfile]
  );
  const { data: plans, isLoading: isLoadingPlans } =
    useCollection<MembershipPlan>(plansQuery);

  const isLoading = isLoadingAdminProfile || isLoadingMembers || isLoadingPlans;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const expiringSoonMembers = useMemo(() => {
    if (!members) return [];

    const today = startOfDay(new Date());

    return members.filter(member => {
        if (!member.membershipEndDate) return false;
        
        try {
            const endDate = endOfDay(parseISO(member.membershipEndDate));
            const diff = differenceInDays(endDate, today);
            // Show if expired (diff < 0) or expiring within 7 days
            return diff <= 7;
        } catch(e) {
            return false;
        }
    }).sort((a, b) => {
        const dateA = parseISO(a.membershipEndDate!).getTime();
        const dateB = parseISO(b.membershipEndDate!).getTime();
        return dateA - dateB;
    });
  }, [members]);

  const activeMembersCount = useMemo(
    () => members?.filter((m) => {
      if (!m.isActive) return false;
      if (!m.membershipEndDate) return true;
      return !isPast(endOfDay(parseISO(m.membershipEndDate)));
    }).length || 0,
    [members]
  );
  
  const inactiveMembersCount = useMemo(
    () => members?.filter((m) => {
      if (!m.isActive) return true;
      if (m.membershipEndDate) {
        return isPast(endOfDay(parseISO(m.membershipEndDate)));
      }
      return false;
    }).length || 0,
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
      description: `A renewal reminder has been sent to ${member.firstName} ${member.lastName}.`,
    });
  };

  const handleCopy = (text: string) => {
    if (!navigator.clipboard) {
      toast({
        title: 'Clipboard Not Available',
        description: 'Could not access the clipboard. Please copy manually.',
        variant: 'destructive',
      });
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied to clipboard!',
        description: `ID: ${text}`,
      });
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
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
      title: 'Inactive/Expired',
      value: inactiveMembersCount,
      icon: UserX,
      loading: isLoading,
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gym Identifier</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingAdminProfile ? (
                <Skeleton className="h-8 w-32" />
              ) : adminProfile?.gymIdentifier ? (
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {adminProfile.gymIdentifier}
                  </div>
                  {isClient && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopy(adminProfile.gymIdentifier!)}
                    >
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Copy Gym Identifier</span>
                    </Button>
                  )}
                </div>
              ) : (
                <Skeleton className="h-8 w-32" />
              )}
            </CardContent>
          </Card>
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
              <CardTitle>Expiring or Expired</CardTitle>
              <CardDescription>
                Members whose subscription has ended or ends soon (7 days).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                     Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : expiringSoonMembers.length > 0 ? (
                    expiringSoonMembers.map((member) => {
                      const today = startOfDay(new Date());
                      const endDate = endOfDay(parseISO(member.membershipEndDate!));
                      const daysLeft = differenceInDays(endDate, today);
                      const expiresInText = 
                        daysLeft < 0 ? 'Expired' :
                        daysLeft === 0 ? 'Expires today' :
                        daysLeft === 1 ? 'Expires tomorrow' :
                        `Expires in ${daysLeft} days`;

                      const plan = plans?.find(p => p.id === member.activePlanId);

                      return (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="font-medium">{`${member.firstName} ${member.lastName}`}</div>
                            <div className="text-xs text-muted-foreground">{member.gymId}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold">{plan?.name || 'Standard'} Plan</span>
                              <span className="text-xs text-muted-foreground">Expires: {member.membershipEndDate}</span>
                              <Badge variant={daysLeft < 0 ? 'destructive' : (daysLeft <= 3 ? 'default' : 'secondary')} className="mt-1 w-fit text-[10px]">
                                  {expiresInText}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {isClient ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Send Reminder"
                                  onClick={() => handleSendReminder(member)}
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="View Profile"
                                  onClick={() =>
                                    handleOpenDialog('view', member)
                                  }
                                >
                                  <Eye className="h-4 w-4" />
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
                      <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                        No critical memberships found.
                      </TableCell>
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
