'use client';

import {
  Eye,
  Pencil,
  PlusCircle,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { type Member, type PublicMemberProfile, type MembershipPlan } from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionComponent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription as FormDescriptionComponent,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  useFirestore,
  useMemoFirebase,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useUser,
  useDoc,
  useCollection,
} from '@/firebase';
import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { isPast, parseISO, endOfDay } from 'date-fns';

const statusVariant = {
  active: 'default',
  inactive: 'secondary',
} as const;

const memberFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email('Please enter a valid email.'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits.')
    .regex(/^\d+$/, 'Phone number must only contain digits.'),
  joinDate: z.string().min(1, 'Join date is required.'),
  isActive: z.boolean().default(false),
});

type MemberFormValues = z.infer<typeof memberFormSchema>;
const MEMBERS_PER_PAGE = 8;

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  type DialogType = 'add' | 'edit' | 'view' | 'delete' | null;
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { user } = useUser();
  const firestore = useFirestore();

  const adminProfileRef = useMemoFirebase(
      () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
      [firestore, user]
  );
  const { data: adminProfile, isLoading: isLoadingAdminProfile } = useDoc<{gymName: string; gymIdentifier: string}>(adminProfileRef);

  const plansQuery = useMemoFirebase(
    () => (firestore && adminProfile?.gymIdentifier ? query(collection(firestore, 'membership_plans'), where('gymIdentifier', '==', adminProfile.gymIdentifier)) : null),
    [firestore, adminProfile]
  );
  const { data: plans } = useCollection<MembershipPlan>(plansQuery);

  // Fetch ALL members for global search and client-side pagination
  const membersQuery = useMemoFirebase(
    () =>
      firestore && adminProfile?.gymIdentifier
        ? query(
            collection(firestore, 'members'),
            where('gymIdentifier', '==', adminProfile.gymIdentifier),
            orderBy('firstName')
          )
        : null,
    [firestore, adminProfile]
  );
  const { data: allMembers, isLoading: isLoadingMembers } = useCollection<Member>(membersQuery);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
  });

  const filteredMembers = useMemo(() => {
    if (!allMembers) return [];
    if (!searchQuery) return allMembers;
    const q = searchQuery.toLowerCase();
    return allMembers.filter(
      (m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.gymId.toLowerCase().includes(q)
    );
  }, [allMembers, searchQuery]);

  const totalPages = Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE);
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * MEMBERS_PER_PAGE;
    return filteredMembers.slice(start, start + MEMBERS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleOpenDialog = (dialog: DialogType, member?: Member) => {
    setSelectedMember(member || null);
    setActiveDialog(dialog);
    if ((dialog === 'add' || dialog === 'edit') && member) {
      form.reset({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        joinDate: member.joinDate,
        isActive: member.isActive,
      });
    } else if (dialog === 'add') {
      form.reset({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        joinDate: new Date().toISOString().split('T')[0],
        isActive: false,
      });
    }
  };

  const closeDialogs = () => {
    setActiveDialog(null);
    setSelectedMember(null);
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
    });
  };
  
  const handleSaveMember = (values: MemberFormValues) => {
    if (!firestore || !adminProfile?.gymName || !adminProfile?.gymIdentifier) {
      toast({
        title: 'Cannot Add Member',
        description:
          "Your gym name or identifier couldn't be found.",
        variant: 'destructive',
      });
      return;
    }

    if (activeDialog === 'add') {
        const newDocRef = doc(collection(firestore, 'members'));
        const generateMemberId = (memberName: string) => {
            const namePart = memberName.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase().padEnd(4, 'X');
            const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
            return `${namePart}${randomPart}`;
        };
        const memberGymId = generateMemberId(values.firstName);
        
        const newMember: Member = {
            ...values,
            id: newDocRef.id,
            gymId: memberGymId,
            gymName: adminProfile.gymName,
            gymIdentifier: adminProfile.gymIdentifier,
        };
        setDocumentNonBlocking(newDocRef, newMember, { merge: true });

        // Create public profile
        const publicProfileRef = doc(firestore, 'member_profiles_public', memberGymId);
        const publicProfile: PublicMemberProfile = {
            memberDocId: newMember.id,
            gymName: adminProfile.gymName,
            gymIdentifier: adminProfile.gymIdentifier,
            isActive: newMember.isActive,
            firstName: newMember.firstName,
            lastName: newMember.lastName
        };
        setDocumentNonBlocking(publicProfileRef, publicProfile, { merge: true });

        toast({
            title: 'Member Added',
            description: `The member details for ${values.firstName} ${values.lastName} have been saved.`,
        });
    } else if (activeDialog === 'edit' && selectedMember) {
      const docRef = doc(firestore, 'members', selectedMember.id);
      const updatedMember = {
        ...selectedMember,
        ...values,
      };
      updateDocumentNonBlocking(docRef, updatedMember);
      
      // Update public profile
      const publicProfileRef = doc(firestore, 'member_profiles_public', selectedMember.gymId);
      const publicProfileUpdate: Partial<PublicMemberProfile> = {
          firstName: values.firstName,
          lastName: values.lastName,
          isActive: values.isActive,
      };
      updateDocumentNonBlocking(publicProfileRef, publicProfileUpdate);

      toast({
        title: 'Member Updated',
        description: `The member details for ${values.firstName} ${values.lastName} have been saved.`,
      });
    }
    closeDialogs();
  };

  const handleDeleteConfirm = () => {
    if (selectedMember && firestore) {
      const publicProfileRef = doc(firestore, 'member_profiles_public', selectedMember.gymId);
      deleteDocumentNonBlocking(publicProfileRef);
      const docRef = doc(firestore, 'members', selectedMember.id);
      deleteDocumentNonBlocking(docRef);

      toast({
        title: 'Member Deleted',
        description: `${selectedMember.firstName} ${selectedMember.lastName} has been deleted.`,
        variant: 'destructive',
      });
      closeDialogs();
    }
  };

  const isLoading = isLoadingAdminProfile || isLoadingMembers;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Manage your gym members and their details.
              </CardDescription>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:max-w-xs"
              />
              <Button
                size="sm"
                className="gap-1"
                onClick={() => handleOpenDialog('add')}
              >
                <PlusCircle className="h-4 w-4" />
                Add Member
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Member ID</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-32 mt-1" />
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedMembers.length > 0 ? (
                paginatedMembers.map((member) => {
                  const isExpired = member.membershipEndDate ? isPast(endOfDay(parseISO(member.membershipEndDate))) : false;
                  const plan = plans?.find(p => p.id === member.activePlanId);
                  
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{`${member.firstName} ${member.lastName}`}</div>
                          <div className="text-xs text-muted-foreground">
                            {member.email}
                          </div>
                          {plan && (
                            <div className="text-[10px] uppercase font-bold text-primary mt-0.5">
                                {plan.name} Plan
                            </div>
                          )}
                        </div>
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
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {member.phone}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusVariant[member.isActive && !isExpired ? 'active' : 'inactive']}
                        >
                          {member.isActive && !isExpired ? 'Active' : (isExpired ? 'Expired' : 'Inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isClient ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog('view', member)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog('edit', member)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog('delete', member)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="h-10 w-8" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No members found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              Showing {paginatedMembers.length} of {filteredMembers.length} members (Page {currentPage} of {totalPages || 1})
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Add/Edit Member Dialog */}
      <Dialog
        open={activeDialog === 'add' || activeDialog === 'edit'}
        onOpenChange={(isOpen) => !isOpen && closeDialogs()}
      >
        <DialogContent className="sm:max-w-md">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveMember)}>
              <DialogHeader>
                <DialogTitle>
                  {activeDialog === 'edit' ? 'Edit Member' : 'Add New Member'}
                </DialogTitle>
                <DialogDescription>
                  {activeDialog === 'edit'
                    ? 'Update the details for this member.'
                    : 'Fill in the details to add a new member.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="joinDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Join Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Manual Active Status</FormLabel>
                        <FormDescriptionComponent>
                          Override membership status manually.
                        </FormDescriptionComponent>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialogs}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save {activeDialog === 'edit' ? 'Changes' : 'Member'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog
        open={activeDialog === 'view'}
        onOpenChange={(isOpen) => !isOpen && closeDialogs()}
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
              <div className="grid grid-cols-2 gap-4 mt-4 border-t pt-4">
                <div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-muted-foreground text-xs uppercase">Member ID</span>
                    <span className="text-base">{selectedMember.gymId}</span>
                  </div>
                </div>
                <div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-muted-foreground text-xs uppercase">Status</span>
                    <Badge className="w-fit mt-1" variant={statusVariant[selectedMember.isActive ? 'active' : 'inactive']}>
                        {selectedMember.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-muted-foreground text-xs uppercase">Join Date</span>
                    <span className="text-base">{selectedMember.joinDate}</span>
                  </div>
                </div>
                <div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-muted-foreground text-xs uppercase">Plan Expiry</span>
                    <span className={`text-base font-medium ${selectedMember.membershipEndDate && isPast(endOfDay(parseISO(selectedMember.membershipEndDate))) ? 'text-destructive' : ''}`}>
                      {selectedMember.membershipEndDate || 'No Active Plan'}
                    </span>
                  </div>
                </div>
                {selectedMember.activePlanId && (
                  <div className="col-span-2">
                    <div className="flex flex-col">
                      <span className="font-semibold text-muted-foreground text-xs uppercase">Active Plan</span>
                      <span className="text-base font-semibold text-primary">
                        {plans?.find(p => p.id === selectedMember.activePlanId)?.name || 'Loading plan details...'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={closeDialogs}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={activeDialog === 'delete'}
        onOpenChange={(isOpen) => !isOpen && closeDialogs()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescriptionComponent>
              This will permanently delete "{selectedMember?.firstName} {selectedMember?.lastName}".
            </AlertDialogDescriptionComponent>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
