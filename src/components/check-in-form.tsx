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
import { Dumbbell } from 'lucide-react';
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
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import type { Member } from '@/lib/data';

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
      // 1. Find the gym by its identifier
      const adminRolesRef = collection(firestore, 'roles_admin');
      const gymQuery = query(
        adminRolesRef,
        where('gymIdentifier', '==', values.gymIdentifier.toUpperCase())
      );
      const gymQuerySnapshot = await getDocs(gymQuery);

      if (gymQuerySnapshot.empty) {
        toast({
          title: 'Check-in Failed',
          description: `Gym with identifier "${values.gymIdentifier}" not found.`,
          variant: 'destructive',
        });
        return;
      }
      
      const gymDoc = gymQuerySnapshot.docs[0];
      const gymName = gymDoc.data().gymName;

      // 2. Find the member within that gym using their member-specific gymId
      const membersRef = collection(firestore, 'members');
      const memberQuery = query(
        membersRef,
        where('gymName', '==', gymName),
        where('gymId', '==', values.memberId.toUpperCase())
      );
      const memberQuerySnapshot = await getDocs(memberQuery);


      if (memberQuerySnapshot.empty) {
        toast({
          title: 'Check-in Failed',
          description: `Member ID "${values.memberId}" not found in this gym. Please check your ID and try again.`,
          variant: 'destructive',
        });
        return;
      }

      const memberDoc = memberQuerySnapshot.docs[0];
      const member = { ...memberDoc.data(), id: memberDoc.id } as Member;

      if (!member.isActive) {
        toast({
          title: 'Check-in Failed',
          description: `The membership for ${member.firstName} ${member.lastName} is inactive. Please contact the front desk.`,
          variant: 'destructive',
        });
        return;
      }

      // Write to the top-level 'attendance' collection
      const attendanceRef = collection(firestore, 'attendance');
      addDocumentNonBlocking(attendanceRef, {
        memberId: member.id,
        checkInTime: serverTimestamp(),
        gymName: member.gymName,
      });

      toast({
        title: 'Check-in Successful!',
        description: `Welcome to ${member.gymName}, ${member.firstName}!`,
      });
    } catch (error) {
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
