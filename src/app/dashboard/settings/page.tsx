'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
  useDoc,
  useFirestore,
  useMemoFirebase,
  updateDocumentNonBlocking,
  useUser,
  useCollection,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import Link from 'next/link';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { MoreVertical, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { type MembershipPlan } from '@/lib/data';

const settingsFormSchema = z.object({
  ownerName: z.string().min(1, 'Owner name is required.'),
  gymEmail: z.string().email('Please enter a valid email.').optional().or(z.literal('')),
  gymAddress: z.string().optional(),
  gymContactNumber: z.string().min(10, { message: 'Phone number must be at least 10 digits.' }).optional().or(z.literal('')),
});
type SettingsFormValues = z.infer<typeof settingsFormSchema>;

type AdminProfile = {
  gymName: string;
  ownerName: string;
  gymIdentifier?: string;
  gymEmail?: string;
  gymAddress?: string;
  gymContactNumber?: string;
};

const planFormSchema = z.object({
  name: z.string().min(1, { message: 'Plan name is required.' }),
  description: z.string().min(1, 'Description is required.'),
  price: z.coerce
    .number()
    .positive({ message: 'Price must be a positive number.' }),
  durationInDays: z.coerce
    .number()
    .int()
    .positive({ message: 'Duration must be a positive number of days.' }),
  isAvailable: z.boolean().default(true),
});
type PlanFormValues = z.infer<typeof planFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [dialogState, setDialogState] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);

  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
  });

  const adminProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );
  const { data: adminProfile, isLoading: isLoadingAdminProfile } =
    useDoc<AdminProfile>(adminProfileRef);

  const plansQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'membership_plans') : null),
    [firestore]
  );
  const { data: plans, isLoading: isLoadingPlans } = useCollection<MembershipPlan>(plansQuery);

  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      ownerName: '',
      gymEmail: '',
      gymAddress: '',
      gymContactNumber: '',
    },
  });

  useEffect(() => {
    if (adminProfile) {
      settingsForm.reset({
        ownerName: adminProfile.ownerName,
        gymEmail: adminProfile.gymEmail || '',
        gymAddress: adminProfile.gymAddress || '',
        gymContactNumber: adminProfile.gymContactNumber || '',
      });
    }
  }, [adminProfile, settingsForm]);

  const handleOpenPlanDialog = (
    dialogType: 'add' | 'edit' | 'delete',
    plan?: MembershipPlan
  ) => {
    setDialogState(dialogType);
    setSelectedPlan(plan || null);
    if (dialogType === 'edit' && plan) {
      planForm.reset({
        name: plan.name,
        description: plan.description,
        price: plan.price,
        durationInDays: plan.durationInDays,
        isAvailable: plan.isAvailable,
      });
    } else if (dialogType === 'add') {
      planForm.reset({
        name: '',
        description: '',
        price: 0,
        durationInDays: 30,
        isAvailable: true,
      });
    }
  };

  const handleCloseDialogs = () => {
    setDialogState(null);
    setSelectedPlan(null);
  };

  function handleSavePlan(values: PlanFormValues) {
    if (!firestore) return;

    if (dialogState === 'add') {
      const newDocRef = doc(collection(firestore, 'membership_plans'));
      const newPlan = {
        ...values,
        id: newDocRef.id,
      };
      setDocumentNonBlocking(newDocRef, newPlan, { merge: true });
      toast({
        title: 'Plan Added',
        description: `The new plan "${values.name}" has been saved.`,
      });
    } else if (dialogState === 'edit' && selectedPlan) {
      const docRef = doc(firestore, 'membership_plans', selectedPlan.id);
      updateDocumentNonBlocking(docRef, values);
      toast({
        title: 'Plan Updated',
        description: `The plan "${values.name}" has been updated.`,
      });
    }
    handleCloseDialogs();
  }
  
  const handleDeletePlanConfirm = () => {
    if (!firestore || !selectedPlan) return;
    const docRef = doc(firestore, 'membership_plans', selectedPlan.id);
    deleteDocumentNonBlocking(docRef);
    toast({
        title: 'Plan Deleted',
        description: `The plan "${selectedPlan.name}" has been permanently deleted.`,
        variant: 'destructive',
    });
    handleCloseDialogs();
  };


  async function handleSaveChanges(values: SettingsFormValues) {
    if (!user || !firestore) return;
    const docRef = doc(firestore, 'roles_admin', user.uid);
    updateDocumentNonBlocking(docRef, {
      ownerName: values.ownerName,
      gymEmail: values.gymEmail,
      gymAddress: values.gymAddress,
      gymContactNumber: values.gymContactNumber,
    });
    toast({
      title: 'Settings Saved',
      description: 'Your profile information has been updated.',
    });
  }

  return (
    <>
      <div className="grid gap-6 animate-fade-in">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Manage your administrator profile and gym details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAdminProfile ? (
              <div className="space-y-6 max-w-xl">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
            ) : (
              <Form {...settingsForm}>
                <form
                  onSubmit={settingsForm.handleSubmit(handleSaveChanges)}
                  className="max-w-xl space-y-6"
                >
                  <FormField
                    control={settingsForm.control}
                    name="ownerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="gymEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gym Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contact@mygym.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="gymAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gym Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Fitness Ave, Gymtown, USA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="gymContactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gym Contact Number</FormLabel>
                        <FormControl>
                          <Input placeholder="(123) 456-7890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel>Gym Name</FormLabel>
                    <FormControl>
                      <Input value={adminProfile?.gymName || ''} disabled />
                    </FormControl>
                    <FormDescription>Gym Name cannot be changed after signup.</FormDescription>
                  </FormItem>
                  <FormItem>
                    <FormLabel>Gym Identifier</FormLabel>
                    <FormControl>
                      <Input value={adminProfile?.gymIdentifier || 'Not generated'} disabled />
                    </FormControl>
                    <FormDescription>This is your unique ID for member check-ins.</FormDescription>
                  </FormItem>
                  <Button type="submit" disabled={settingsForm.formState.isSubmitting || !adminProfile}>Save Changes</Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Membership Plans</CardTitle>
                <CardDescription>
                  Manage your gym's membership plans.
                </CardDescription>
              </div>
              <Button size="sm" className="gap-1" onClick={() => handleOpenPlanDialog('add')}>
                <PlusCircle className="h-4 w-4" />
                Add Plan
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPlans ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : plans && plans.length > 0 ? (
                  plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>₹{plan.price.toFixed(2)}</TableCell>
                      <TableCell>{plan.durationInDays} days</TableCell>
                      <TableCell>
                        <Badge variant={plan.isAvailable ? 'default' : 'secondary'}>
                          {plan.isAvailable ? 'Available' : 'Unavailable'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenPlanDialog('edit', plan)}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit Plan</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                             onClick={() => handleOpenPlanDialog('delete', plan)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Plan</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center">No membership plans created yet.</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card id="help">
          <CardHeader>
            <CardTitle>Help & Support</CardTitle>
            <CardDescription>
              Find resources and get help with GymTrack Pro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">Contact Support</h3>
              <p className="text-sm text-muted-foreground">For any questions or issues, please reach out to our support team at <a href="mailto:shivtej.shivamj@gmail.com" className="text-primary underline">shivtej.shivamj@gmail.com</a> or call us at 7208789589.</p>
            </div>
            <div>
              <h3 className="font-semibold">Documentation</h3>
              <p className="text-sm text-muted-foreground">Browse our documentation for detailed guides and tutorials.</p>
              <Button variant="outline" className="mt-2" asChild>
                <Link href="#">View Documentation</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={dialogState === 'add' || dialogState === 'edit'}
        onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}
      >
        <DialogContent>
          <Form {...planForm}>
            <form onSubmit={planForm.handleSubmit(handleSavePlan)}>
              <DialogHeader>
                <DialogTitle>{dialogState === 'edit' ? 'Edit Plan' : 'Add New Plan'}</DialogTitle>
                <DialogDescription>
                  {dialogState === 'edit' ? 'Update the details for this membership plan.' : 'Define a new membership plan for your gym.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <FormField
                  control={planForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Monthly Basic" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={planForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe the plan and its benefits." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={planForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={planForm.control}
                    name="durationInDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (days)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                 <FormField
                  control={planForm.control}
                  name="isAvailable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Available for Purchase</FormLabel>
                         <FormDescription>
                          Make this plan visible to members for purchase.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label={`Set plan availability to ${field.value ? 'unavailable' : 'available'}`}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialogs}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Plan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog
        open={dialogState === 'delete'}
        onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the <strong>{selectedPlan?.name}</strong> plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlanConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
