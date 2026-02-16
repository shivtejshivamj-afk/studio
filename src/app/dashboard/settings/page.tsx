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
import { useEffect } from 'react';

const settingsFormSchema = z.object({
  ownerName: z.string().min(1, 'Owner name is required.'),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

type AdminProfile = {
  gymName: string;
  ownerName: string;
  gymIdentifier?: string;
};

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
    },
  });
  
  useEffect(() => {
    if (adminProfile) {
        form.reset({
            ownerName: adminProfile.ownerName,
        });
    }
  }, [adminProfile, form]);


  async function handleSaveChanges(values: SettingsFormValues) {
    if (!user || !firestore) return;
    const docRef = doc(firestore, 'roles_admin', user.uid);
    updateDocumentNonBlocking(docRef, {
      ownerName: values.ownerName,
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
            <p className="text-sm text-muted-foreground">For any questions or issues, please reach out to our support team at <a href="mailto:support@gymtrack.pro" className="text-primary underline">support@gymtrack.pro</a>.</p>
          </div>
           <div>
            <h3 className="font-semibold">Documentation</h3>
            <p className="text-sm text-muted-foreground">Browse our documentation for detailed guides and tutorials.</p>
            <Button variant="outline" className="mt-2">View Documentation</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
