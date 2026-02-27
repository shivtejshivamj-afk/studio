'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import {
  serverTimestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import { format } from 'date-fns';
import type { PublicMemberProfile } from '@/lib/data';
import { Dumbbell } from 'lucide-react';

const checkInSchema = z.object({
  gymIdentifier: z.string().min(1, 'Your Gym Identifier is required.'),
  memberId: z.string().min(1, 'Your Member ID is required.'),
});

export function CheckInForm() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof checkInSchema>>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      gymIdentifier: '',
      memberId: '',
    },
  });

  async function handleCheckIn(values: z.infer<typeof checkInSchema>) {
    if (!firestore) {
      toast({
        title: 'Error',
        description: 'Could not connect to the database. Please try again later.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // 1. Find the public member profile using their gymId
      const memberPublicId = values.memberId.toUpperCase();
      const memberProfileRef = doc(firestore, 'member_profiles_public', memberPublicId);
      const memberProfileSnap = await getDoc(memberProfileRef);
      
      if (!memberProfileSnap.exists()) {
        toast({
          title: 'Check-in Failed',
          description: `Member ID "${values.memberId}" not found. Please check your ID and try again.`,
          variant: 'destructive',
        });
        form.reset();
        return;
      }
      
      const publicProfile = memberProfileSnap.data() as PublicMemberProfile;

      // 2. Validate the gym identifier
      if (publicProfile.gymIdentifier.toUpperCase() !== values.gymIdentifier.toUpperCase()) {
        toast({
          title: 'Check-in Failed',
          description: `This Member ID does not belong to the gym with identifier "${values.gymIdentifier}".`,
          variant: 'destructive',
        });
        form.reset();
        return;
      }

      // 3. Check if member is active
      if (!publicProfile.isActive) {
        toast({
          title: 'Check-in Failed',
          description: `The membership for ${publicProfile.firstName} ${publicProfile.lastName} is inactive. Please contact the front desk.`,
          variant: 'destructive',
        });
        form.reset();
        return;
      }
      
      // 4. Check for existing check-in to avoid duplicate write attempts and permission errors
      const checkInDateStr = format(new Date(), 'yyyy-MM-dd');
      const attendanceDocId = `${publicProfile.memberDocId}_${checkInDateStr}`;
      const attendanceDocRef = doc(firestore, 'attendance', attendanceDocId);
      const existingSnap = await getDoc(attendanceDocRef);

      if (existingSnap.exists()) {
        toast({
          title: 'Already Checked In',
          description: `You have already checked in today, ${publicProfile.firstName}.`,
          variant: 'destructive',
        });
        form.reset();
        return;
      }

      // 5. Attempt to write the check-in document. 
      setDocumentNonBlocking(attendanceDocRef, {
        id: attendanceDocId,
        memberId: publicProfile.memberDocId,
        checkInTime: serverTimestamp(),
        gymName: publicProfile.gymName,
        gymIdentifier: publicProfile.gymIdentifier,
        memberGymId: memberPublicId,
      }, {});

      toast({
        title: 'Check-in Successful!',
        description: `Welcome to ${publicProfile.gymName}, ${publicProfile.firstName}!`,
      });

    } catch (error: any) {
      console.error('Check-in error', error);
      toast({
        title: 'Check-in Failed',
        description: `An error occurred. If this problem persists, please contact support.`,
        variant: 'destructive',
      });
    } finally {
      form.reset();
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <Dumbbell className="h-12 w-12 text-primary" />
        <CardTitle className="text-3xl font-bold">Member Check-in</CardTitle>
        <CardDescription>Enter your Gym Identifier and Member ID to check in.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleCheckIn)}
            className="grid gap-4"
          >
             <FormField
              control={form.control}
              name="gymIdentifier"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="gym-identifier">
                    Gym Identifier
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="gym-identifier"
                      placeholder="Enter your Gym's Identifier"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="memberId"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="member-id">
                    Member ID
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="member-id"
                      placeholder="Enter your Member ID (e.g., ALIC7890)"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Checking In...' : 'Check In'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
