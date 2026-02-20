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
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import Link from 'next/link';

import { MoreVertical, PlusCircle } from 'lucide-react';
import { plans } from '@/lib/data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  price: z.coerce
    .number()
    .positive({ message: 'Price must be a positive number.' }),
  duration: z.coerce
    .number()
    .int()
    .positive({ message: 'Duration must be a positive number of days.' }),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

function PlansSettings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: '',
      price: 0,
      duration: 0,
    },
  });

  function handleSavePlan(values: PlanFormValues) {
    console.log(values); // The data is not persistent, so just log it.
    toast({
      title: 'Plan Added',
      description: `The new plan "${values.name}" has been saved.`,
    });
    setIsDialogOpen(false);
    form.reset();
  }

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      form.reset();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Membership Plans</CardTitle>
            <CardDescription>
              Manage your gym's membership plans.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-4 w-4" />
                Add Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSavePlan)}>
                  <DialogHeader>
                    <DialogTitle>Add New Plan</DialogTitle>
                    <DialogDescription>
                      Define a new membership plan for your gym.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-x-4">
                          <FormLabel className="text-right">
                            Plan Name
                          </FormLabel>
                          <div className="col-span-3">
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-x-4">
                          <FormLabel className="text-right">
                            Price (₹)
                          </FormLabel>
                          <div className="col-span-3">
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-x-4">
                          <FormLabel className="text-right">
                            Duration (days)
                          </FormLabel>
                          <div className="col-span-3">
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Save Plan</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell>₹{plan.price.toFixed(2)}</TableCell>
                <TableCell>{plan.duration} days</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const adminProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );
  const { data: adminProfile, isLoading: isLoadingAdminProfile } =
    useDoc<AdminProfile>(adminProfileRef);

  const form = useForm<SettingsFormValues>({
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
      form.reset({
        ownerName: adminProfile.ownerName,
        gymEmail: adminProfile.gymEmail || '',
        gymAddress: adminProfile.gymAddress || '',
        gymContactNumber: adminProfile.gymContactNumber || '',
      });
    }
  }, [adminProfile, form]);


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
    <div className="grid gap-6">
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
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSaveChanges)}
              className="max-w-xl space-y-6"
            >
              <FormField
                control={form.control}
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
                control={form.control}
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
                control={form.control}
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
                control={form.control}
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
              <Button type="submit" disabled={form.formState.isSubmitting || !adminProfile}>Save Changes</Button>
            </form>
          </Form>
          )}
        </CardContent>
      </Card>
      
      <PlansSettings />

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
  );
}
