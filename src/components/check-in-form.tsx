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

const memberIdSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required.'),
});

export function CheckInForm() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof memberIdSchema>>({
    resolver: zodResolver(memberIdSchema),
    defaultValues: {
      memberId: '',
    },
  });

  async function handleMemberIdSubmit(values: z.infer<typeof memberIdSchema>) {
    if (!firestore) {
      toast({
        title: 'Error',
        description: 'Could not connect to the database. Please try again later.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const membersRef = collection(firestore, 'members');
      const q = query(
        membersRef,
        where('gymId', '==', values.memberId.toUpperCase())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          title: 'Check-in Failed',
          description: `Member ID "${values.memberId}" not found. Please check your ID and try again.`,
          variant: 'destructive',
        });
        form.reset();
        return;
      }

      // Assuming gymId is unique across all gyms for this implementation
      const memberDoc = querySnapshot.docs[0];
      const member = { ...memberDoc.data(), id: memberDoc.id } as Member;

      if (!member.isActive) {
        toast({
          title: 'Check-in Failed',
          description: `The membership for ${member.firstName} ${member.lastName} is inactive. Please contact the front desk.`,
          variant: 'destructive',
        });
        return;
      }

      const attendanceRef = collection(
        firestore,
        'members',
        member.id,
        'attendance'
      );
      addDocumentNonBlocking(attendanceRef, {
        memberId: member.id,
        checkInTime: serverTimestamp(),
        gymName: member.gymName, // Use gymName from the member's record
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
        <CardDescription>Please enter your Member ID to check in.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleMemberIdSubmit)}
            className="grid gap-4"
          >
            <FormField
              control={form.control}
              name="memberId"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="member-id" className="sr-only">
                    Member ID
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="member-id"
                      placeholder="Enter your Member ID (e.g., ALIC7890)"
                      className="text-center"
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
