'use client';

import { Eye, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { type Trainer } from '@/lib/data';
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
import { useState, useEffect } from 'react';
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
  useCollection,
  useFirestore,
  useMemoFirebase,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useUser,
  useDoc,
} from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
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

export default function TrainersPage() {
  const { toast } = useToast();
  type DialogType = 'add' | 'edit' | 'view' | 'delete' | null;
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);

  const { user } = useUser();
  const firestore = useFirestore();

  const adminProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );
  const { data: adminProfile, isLoading: isLoadingAdminProfile } = useDoc<{ gymName: string, gymIdentifier: string }>(adminProfileRef);

  const trainersQuery = useMemoFirebase(
    () => (firestore && adminProfile?.gymIdentifier ? query(collection(firestore, 'trainers'), where('gymIdentifier', '==', adminProfile.gymIdentifier)) : null),
    [firestore, adminProfile]
  );
  const { data: trainers, isLoading: isLoadingTrainers } = useCollection<Trainer>(trainersQuery);
  
  const isLoading = isLoadingAdminProfile || isLoadingTrainers;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<TrainerFormValues>({
    resolver: zodResolver(trainerFormSchema),
  });

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
        description:
          "Your gym couldn't be found. Please ensure you have signed up correctly.",
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
      toast({
        title: 'Trainer Added',
        description: `The details for ${values.firstName} ${values.lastName} have been saved.`,
      });
    } else if (activeDialog === 'edit' && selectedTrainer) {
      const docRef = doc(firestore, 'trainers', selectedTrainer.id);
      const updatedData = {
        ...values,
      };
      updateDocumentNonBlocking(docRef, updatedData);
      toast({
        title: 'Trainer Updated',
        description: `The details for ${values.firstName} ${values.lastName} have been updated.`,
      });
    }
    closeDialogs();
  };

  const handleDeleteConfirm = () => {
    if (selectedTrainer && firestore) {
      const docRef = doc(firestore, 'trainers', selectedTrainer.id);
      deleteDocumentNonBlocking(docRef);
      toast({
        title: 'Trainer Deleted',
        description: `${selectedTrainer.firstName} ${selectedTrainer.lastName} has been deleted.`,
        variant: 'destructive',
      });
      closeDialogs();
    }
  };

  const filteredTrainers =
    trainers?.filter(
      (trainer) =>
        `${trainer.firstName} ${trainer.lastName}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        trainer.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Trainers</CardTitle>
              <CardDescription>
                Manage your gym's trainers and their profiles for {adminProfile?.gymName || 'your gym'}.
              </CardDescription>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                <TableHead className="hidden md:table-cell">Hire Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                filteredTrainers.map((trainer) => (
                  <TableRow key={trainer.id}>
                    <TableCell>
                      <div className="font-medium">{`${trainer.firstName} ${trainer.lastName}`}</div>
                      <div className="text-sm text-muted-foreground hidden sm:block">
                        {trainer.email}
                      </div>
                    </TableCell>
                    <TableCell>{trainer.specialization}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {trainer.phone}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {trainer.hireDate}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          statusVariant[trainer.isActive ? 'active' : 'inactive']
                        }
                      >
                        {trainer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isClient ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog('view', trainer)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Trainer</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog('edit', trainer)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit Trainer</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog('delete', trainer)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Trainer</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="h-10 w-28" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={activeDialog === 'add' || activeDialog === 'edit'}
        onOpenChange={(isOpen) => !isOpen && closeDialogs()}
      >
        <DialogContent className="sm:max-w-lg">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveTrainer)}>
              <DialogHeader>
                <DialogTitle>
                  {activeDialog === 'edit' ? 'Edit Trainer' : 'Add New Trainer'}
                </DialogTitle>
                <DialogDescription>
                  {activeDialog === 'edit'
                    ? 'Update the details for this trainer.'
                    : 'Fill in the details to add a new trainer.'}
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="specialization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specialization</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hire Date</FormLabel>
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
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea placeholder="A short bio for the trainer..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active Trainer</FormLabel>
                        <FormDescription>
                          Indicates if the trainer is currently active.
                        </FormDescription>
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
                  Save {activeDialog === 'edit' ? 'Changes' : 'Trainer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* View Details Dialog */}
      <Dialog open={activeDialog === 'view'} onOpenChange={(isOpen) => !isOpen && closeDialogs()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trainer Details</DialogTitle>
          </DialogHeader>
          {selectedTrainer && (
             <div className="grid gap-4 py-4 text-sm">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedTrainer.firstName} {selectedTrainer.lastName}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedTrainer.email}
                  </p>
                   <p className="text-muted-foreground">
                    {selectedTrainer.phone}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                 <div>
                  <span className="font-semibold">Specialization:</span>{' '}
                  {selectedTrainer.specialization}
                </div>
                <div>
                  <span className="font-semibold">Status:</span>{' '}
                  <Badge
                    variant={statusVariant[selectedTrainer.isActive ? 'active' : 'inactive']}
                  >
                    {selectedTrainer.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <span className="font-semibold">Hire Date:</span>{' '}
                  {selectedTrainer.hireDate}
                </div>
              </div>
               {selectedTrainer.bio && (
                <div className="mt-4">
                  <h4 className="font-semibold">Bio</h4>
                  <p className="text-muted-foreground mt-1">{selectedTrainer.bio}</p>
                </div>
              )}
            </div>
          )}
           <DialogFooter>
            <Button onClick={closeDialogs}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={activeDialog === 'delete'} onOpenChange={(isOpen) => !isOpen && closeDialogs()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              trainer "{selectedTrainer?.firstName} {selectedTrainer?.lastName}".
            </AlertDialogDescription>
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
