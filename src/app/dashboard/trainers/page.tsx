'use client';

import { 
    Eye, 
    Pencil, 
    PlusCircle, 
    Trash2,
    ChevronLeft,
    ChevronRight 
} from 'lucide-react';
import { type Trainer } from '@/lib/data';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
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

const trainerFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email('Please enter a valid email.'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits.')
    .regex(/^\d+$/, 'Phone number must only contain digits.'),
  specialization: z.string().min(1, 'Specialization is required.'),
  hireDate: z.string().min(1, 'Hire date is required.'),
  bio: z.string().optional(),
  isActive: z.boolean().default(true),
});

type TrainerFormValues = z.infer<typeof trainerFormSchema>;

const statusVariant = {
  active: 'default',
  inactive: 'secondary',
} as const;

const TRAINERS_PER_PAGE = 8;

export default function TrainersPage() {
  const { toast } = useToast();
  type DialogType = 'add' | 'edit' | 'view' | 'delete' | null;
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { user } = useUser();
  const firestore = useFirestore();

  const adminProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );
  const { data: adminProfile, isLoading: isLoadingAdminProfile } = useDoc<{ gymName: string, gymIdentifier: string }>(adminProfileRef);

  const trainersQuery = useMemoFirebase(
    () =>
      firestore && adminProfile?.gymIdentifier
        ? query(
            collection(firestore, 'trainers'),
            where('gymIdentifier', '==', adminProfile.gymIdentifier),
            orderBy('firstName')
          )
        : null,
    [firestore, adminProfile]
  );
  const { data: allTrainers, isLoading: isLoadingTrainers } = useCollection<Trainer>(trainersQuery);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<TrainerFormValues>({
    resolver: zodResolver(trainerFormSchema),
  });

  const filteredTrainers = useMemo(() => {
    if (!allTrainers) return [];
    if (!searchQuery) return allTrainers;
    const q = searchQuery.toLowerCase();
    return allTrainers.filter(
      (t) =>
        `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.specialization.toLowerCase().includes(q)
    );
  }, [allTrainers, searchQuery]);

  const totalPages = Math.ceil(filteredTrainers.length / TRAINERS_PER_PAGE);
  const paginatedTrainers = useMemo(() => {
    const start = (currentPage - 1) * TRAINERS_PER_PAGE;
    return filteredTrainers.slice(start, start + TRAINERS_PER_PAGE);
  }, [filteredTrainers, currentPage]);

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

  const handleOpenDialog = (dialog: DialogType, trainer?: Trainer) => {
    setSelectedTrainer(trainer || null);
    setActiveDialog(dialog);
    if ((dialog === 'add' || dialog === 'edit') && trainer) {
      form.reset({
        firstName: trainer.firstName,
        lastName: trainer.lastName,
        email: trainer.email,
        phone: trainer.phone,
        specialization: trainer.specialization,
        hireDate: trainer.hireDate,
        bio: trainer.bio || '',
        isActive: trainer.isActive,
      });
    } else if (dialog === 'add') {
      form.reset({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        specialization: '',
        hireDate: new Date().toISOString().split('T')[0],
        bio: '',
        isActive: true,
      });
    }
  };

  const closeDialogs = () => {
    setActiveDialog(null);
    setSelectedTrainer(null);
  };

  const handleSaveTrainer = (values: TrainerFormValues) => {
    if (!firestore || !adminProfile?.gymName || !adminProfile.gymIdentifier) {
      toast({
        title: 'Cannot Add Trainer',
        description: "Your gym couldn't be found.",
        variant: 'destructive',
      });
      return;
    }

    if (activeDialog === 'add') {
      const newDocRef = doc(collection(firestore, 'trainers'));
      const newTrainer: Trainer = {
        ...values,
        id: newDocRef.id,
        gymName: adminProfile.gymName,
        gymIdentifier: adminProfile.gymIdentifier
      };
      setDocumentNonBlocking(newDocRef, newTrainer, { merge: true });
      toast({ title: 'Trainer Added' });
    } else if (activeDialog === 'edit' && selectedTrainer) {
      const docRef = doc(firestore, 'trainers', selectedTrainer.id);
      updateDocumentNonBlocking(docRef, values);
      toast({ title: 'Trainer Updated' });
    }
    closeDialogs();
  };

  const handleDeleteConfirm = () => {
    if (selectedTrainer && firestore) {
      const docRef = doc(firestore, 'trainers', selectedTrainer.id);
      deleteDocumentNonBlocking(docRef);
      toast({ title: 'Trainer Deleted', variant: 'destructive' });
      closeDialogs();
    }
  };

  const isLoading = isLoadingAdminProfile || isLoadingTrainers;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Trainers</CardTitle>
              <CardDescription>
                Manage your gym's trainers and their profiles.
              </CardDescription>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Input
                placeholder="Search by name or email..."
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
                disabled={isLoading}
              >
                <PlusCircle className="h-4 w-4" />
                Add Trainer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trainer</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-32 mt-1" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedTrainers.length > 0 ? (
                paginatedTrainers.map((trainer) => (
                  <TableRow key={trainer.id}>
                    <TableCell>
                      <div className="font-medium">{`${trainer.firstName} ${trainer.lastName}`}</div>
                      <div className="text-xs text-muted-foreground">{trainer.email}</div>
                    </TableCell>
                    <TableCell>{trainer.specialization}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{trainer.phone}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[trainer.isActive ? 'active' : 'inactive']}>
                        {trainer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isClient ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('view', trainer)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('edit', trainer)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('delete', trainer)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <div className="h-10 w-28" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No trainers found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              Showing {paginatedTrainers.length} of {filteredTrainers.length} trainers (Page {currentPage} of {totalPages || 1})
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={currentPage <= 1}><ChevronLeft className="h-4 w-4 mr-1" /> Previous</Button>
              <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage >= totalPages}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={activeDialog === 'add' || activeDialog === 'edit'} onOpenChange={(isOpen) => !isOpen && closeDialogs()}>
        <DialogContent className="sm:max-w-lg">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveTrainer)} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{activeDialog === 'edit' ? 'Edit Trainer' : 'Add New Trainer'}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="specialization" render={({ field }) => (
                  <FormItem><FormLabel>Specialization</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="hireDate" render={({ field }) => (
                  <FormItem><FormLabel>Hire Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="bio" render={({ field }) => (
                <FormItem><FormLabel>Bio</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>Active Status</FormLabel></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialogs}>Cancel</Button>
                <Button type="submit">Save {activeDialog === 'edit' ? 'Changes' : 'Trainer'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* View Details Dialog */}
      <Dialog open={activeDialog === 'view'} onOpenChange={(isOpen) => !isOpen && closeDialogs()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Trainer Details</DialogTitle></DialogHeader>
          {selectedTrainer && (
             <div className="grid gap-4 py-4 text-sm">
              <div>
                <h3 className="text-xl font-semibold">{selectedTrainer.firstName} {selectedTrainer.lastName}</h3>
                <p className="text-muted-foreground">{selectedTrainer.email}</p>
                <p className="text-muted-foreground">{selectedTrainer.phone}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 border-t pt-4">
                 <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Specialization</p><p className="text-base">{selectedTrainer.specialization}</p></div>
                 <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Status</p><Badge variant={statusVariant[selectedTrainer.isActive ? 'active' : 'inactive']}>{selectedTrainer.isActive ? 'Active' : 'Inactive'}</Badge></div>
                 <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Hire Date</p><p className="text-base">{selectedTrainer.hireDate}</p></div>
              </div>
              {selectedTrainer.bio && (
                <div className="mt-2"><p className="text-[10px] uppercase font-bold text-muted-foreground">Bio</p><p className="text-muted-foreground">{selectedTrainer.bio}</p></div>
              )}
            </div>
          )}
           <DialogFooter><Button onClick={closeDialogs}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={activeDialog === 'delete'} onOpenChange={(isOpen) => !isOpen && closeDialogs()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{selectedTrainer?.firstName} {selectedTrainer?.lastName}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
