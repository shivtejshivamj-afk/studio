'use client';

import { useState } from 'react';
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

const gymIdSchema = z.object({
  gymId: z.string().min(1, 'Gym ID is required.'),
});

const memberIdSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required.'),
});

export function CheckInForm() {
  const { toast } = useToast();
  const [step, setStep] = useState<'gymId' | 'memberId'>('gymId');
  const [gymId, setGymId] = useState('');
  const firestore = useFirestore();

  const gymIdForm = useForm<z.infer<typeof gymIdSchema>>({
    resolver: zodResolver(gymIdSchema),
    defaultValues: {
      gymId: '',
    },
  });

  const memberIdForm = useForm<z.infer<typeof memberIdSchema>>({
    resolver: zodResolver(memberIdSchema),
    defaultValues: {
      memberId: '',
    },
  });

  function handleGymIdSubmit(values: z.infer<typeof gymIdSchema>) {
    // In a real app, you'd validate the gymId against a database.
    // For now, we'll just assume it's valid and move to the next step.
    setGymId(values.gymId);
    setStep('memberId');
    toast({
      title: 'Gym ID Entered',
      description: `Checking in to gym: ${values.gymId}`,
    });
  }

  async function handleMemberIdSubmit(values: z.infer<typeof memberIdSchema>) {
    if (!firestore) return;

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
          description: `Member ID "${values.memberId}" not found in gym "${gymId}". Please try again.`,
          variant: 'destructive',
        });
        return;
      }

      const memberDoc = querySnapshot.docs[0];
      const member = { ...memberDoc.data(), id: memberDoc.id } as Member;

      if (!member.isActive) {
        toast({
          title: 'Check-in Failed',
          description: `Member ${member.firstName} ${member.lastName} has an inactive membership.`,
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
      });

      toast({
        title: 'Check-in Successful!',
        description: `Welcome back, ${member.firstName} ${member.lastName}!`,
      });
    } catch (error) {
      console.error('Check-in error', error);
      toast({
        title: 'Check-in Failed',
        description: `An error occurred. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      memberIdForm.reset();
      gymIdForm.reset();
      setStep('gymId'); // Go back to the first step after an attempt
    }
  }

  const handleBack = () => {
    setStep('gymId');
    memberIdForm.reset();
  };

  if (step === 'gymId') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Dumbbell className="h-12 w-12 text-primary" />
          <CardTitle className="text-3xl font-bold">Gym Check-in</CardTitle>
          <CardDescription>
            Please enter your Gym ID to begin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...gymIdForm}>
            <form
              onSubmit={gymIdForm.handleSubmit(handleGymIdSubmit)}
              className="grid gap-4"
            >
              <FormField
                control={gymIdForm.control}
                name="gymId"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="gym-id" className="sr-only">
                      Gym ID
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="gym-id"
                        placeholder="Enter your Gym ID"
                        className="text-center"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" size="lg">
                Continue
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  if (step === 'memberId') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Dumbbell className="h-12 w-12 text-primary" />
          <CardTitle className="text-3xl font-bold">Member Check-in</CardTitle>
          <CardDescription>
            Checking in to <span className="font-semibold">{gymId}</span>.
            Please enter your Member ID.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...memberIdForm}>
            <form
              onSubmit={memberIdForm.handleSubmit(handleMemberIdSubmit)}
              className="grid gap-4"
            >
              <FormField
                control={memberIdForm.control}
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
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleBack}
                  type="button"
                >
                  Back
                </Button>
                <Button type="submit" size="lg">
                  Check In
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  return null;
}
