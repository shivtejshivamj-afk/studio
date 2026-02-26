'use client';

import {
  Users,
  Dumbbell,
  UserX,
  Eye,
  Copy,
  Building,
  FileText,
} from 'lucide-react';
import { type Member, type MembershipPlan, type Invoice } from '@/lib/data';
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
import { collection, doc, query, where, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInDays, parseISO, startOfDay, endOfDay, isPast, isValid } from 'date-fns';

const statusVariant = {
  active: 'default',
  inactive: 'secondary',
  Paid: 'default',
  Pending: 'secondary',
  Overdue: 'destructive',
} as const;

export default function DashboardPage() {
  const { toast } = useToast();
  const [activeDialog, setActiveDialog] = useState<'view' | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [clientNow, setClientNow] = useState<Date | null>(null);

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

  const recentInvoicesQuery = useMemoFirebase(
    () =>
      firestore && adminProfile?.gymIdentifier
        ? query(
            collection(firestore, 'invoices'),
            where('gymIdentifier', '==', adminProfile.gymIdentifier),
            orderBy('issueDate', 'desc'),
            limit(5)
          )
        : null,
    [firestore, adminProfile]
  );
  const { data: recentInvoices, isLoading: isLoadingRecentInvoices } =
    useCollection<Invoice>(recentInvoicesQuery);

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

  useEffect(() => {
    setIsClient(true);
    setClientNow(startOfDay(new Date()));
  }, []);

  const expiringSoonMembers = useMemo(() => {
    if (!members || !clientNow) return [];

    return members.filter(member => {
        if (!member.membershipEndDate) return false;
        
        try {
            const end = parseISO(member.membershipEndDate);
            if (!isValid(end)) return false;

            const endDate = endOfDay(end);
            const diff = differenceInDays(endDate, clientNow);
            return diff <= 7;
        } catch(e) {
            return false;
        }
    }).sort((a, b) => {
        const dateA = parseISO(a.membershipEndDate!).getTime();
        const dateB = parseISO(b.membershipEndDate!).getTime();
        return dateA - dateB;
    });
  }, [members, clientNow]);

  const activeMembersCount = useMemo(
    () => members?.filter((m) => {
      if (!m.isActive) return false;
      if (!m.membershipEndDate) return true;
      const end = parseISO(m.membershipEndDate);
      return isValid(end) && !isPast(endOfDay(end));
    }).length || 0,
    [members]
  );
  
  const inactiveMembersCount = useMemo(
    () => members?.filter((m) => {
      if (!m.isActive) return true;
      if (m.membershipEndDate) {
        const end = parseISO(m.membershipEndDate);
        return isValid(end) && isPast(endOfDay(end));
      }
      return false;
    }).length || 0,
    [members]
  );

  const handleOpenDialog = (dialog: 'view', member?: Member) => {
    setSelectedMember(member || null);
    setActiveDialog(dialog);
  };

  const closeDialogs = () => {
    setActiveDialog(null);
    setSelectedMember(null);
  };

  const handleCopy = (text: string) => {
    if (!navigator.clipboard) {
      toast({ title: 'Clipboard Not Available', variant: 'destructive' });
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copied!', description: `ID: ${text}` });
    });
  };

  const isLoading = isLoadingAdminProfile || isLoadingMembers || isLoadingPlans || isLoadingRecentInvoices || !isClient;

  const statCards = [
    { title: 'Total Members', value: members?.length ?? 0, icon: Users, loading: isLoading },
    { title: 'Active Members', value: activeMembersCount, icon: Dumbbell, loading: isLoading },
    { title: 'Inactive/Expired', value: inactiveMembersCount, icon: UserX, loading: isLoading },
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
              {isLoadingAdminProfile ? <Skeleton className="h-8 w-32" /> : (
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{adminProfile?.gymIdentifier}</div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(adminProfile?.gymIdentifier || '')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          {statCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {card.loading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{card.value}</div>}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Expiring or Expired</CardTitle>
              <CardDescription>Members whose subscription ends within 7 days or has already lapsed.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Plan Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  )) : expiringSoonMembers.length > 0 ? expiringSoonMembers.map((member) => {
                      const today = clientNow || startOfDay(new Date());
                      const end = parseISO(member.membershipEndDate!);
                      const endDate = endOfDay(end);
                      const daysLeft = differenceInDays(endDate, today);
                      const expiresInText = daysLeft < 0 ? `Expired ${Math.abs(daysLeft)} days ago` : daysLeft === 0 ? 'Expires today' : `Expires in ${daysLeft} days`;
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
                              <Badge variant={daysLeft < 0 ? 'destructive' : 'secondary'} className="mt-1 w-fit text-[10px]">
                                {expiresInText}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('view', member)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                    <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No critical memberships found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Latest processed payments.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-2">
                    <Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-12" />
                  </div>
                )) : recentInvoices && recentInvoices.length > 0 ? recentInvoices.map((inv) => {
                  const member = members?.find(m => m.id === inv.memberId);
                  return (
                    <div key={inv.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{member ? `${member.firstName} ${member.lastName}` : 'Member'}</p>
                        <p className="text-[10px] text-muted-foreground">{inv.invoiceNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">₹{inv.totalAmount}</p>
                        <Badge variant={statusVariant[inv.status]} className="text-[9px] h-4 px-1">{inv.status}</Badge>
                      </div>
                    </div>
                  );
                }) : <p className="text-center text-sm text-muted-foreground py-4">No recent invoices.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={activeDialog === 'view'} onOpenChange={(isOpen) => !isOpen && closeDialogs()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Member Details</DialogTitle></DialogHeader>
          {selectedMember && (
            <div className="grid gap-4 py-4 text-sm">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-xl font-semibold">{selectedMember.firstName} {selectedMember.lastName}</h3>
                  <p className="text-muted-foreground">{selectedMember.email}</p>
                  <p className="text-muted-foreground">{selectedMember.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 border-t pt-4">
                <div>
                  <p className="font-semibold text-muted-foreground text-[10px] uppercase">Member ID</p>
                  <p className="text-base font-bold">{selectedMember.gymId}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground text-[10px] uppercase">Status</p>
                  <Badge className="mt-1" variant={statusVariant[selectedMember.isActive ? 'active' : 'inactive']}>{selectedMember.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground text-[10px] uppercase">Plan Expiry</p>
                  <p className={`text-base font-bold ${selectedMember.membershipEndDate && isPast(endOfDay(parseISO(selectedMember.membershipEndDate))) ? 'text-destructive' : ''}`}>
                    {selectedMember.membershipEndDate || 'No Plan'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground text-[10px] uppercase">Current Plan</p>
                  <p className="text-base font-bold text-primary">
                    {plans?.find(p => p.id === selectedMember.activePlanId)?.name || 'Standard'}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={closeDialogs}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
