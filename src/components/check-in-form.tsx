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

const gymNameSchema = z.object({
  gymName: z.string().min(1, 'Gym Name is required.'),
});

const memberIdSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required.'),
});

export function CheckInForm() {
  const { toast } = useToast();
  const [step, setStep] = useState<'gymName' | 'memberId'>('gymName');
  const [gymName, setGymName] = useState('');
  const firestore = useFirestore();

  const gymNameForm = useForm<z.infer<typeof gymNameSchema>>({
    resolver: zodResolver(gymNameSchema),
    defaultValues: {
      gymName: '',
    },
  });

  const memberIdForm = useForm<z.infer<typeof memberIdSchema>>({
    resolver: zodResolver(memberIdSchema),
    defaultValues: {
      memberId: '',
    },
  });

  function handleGymNameSubmit(values: z.infer<typeof gymNameSchema>) {
    setGymName(values.gymName);
    setStep('memberId');
    toast({
      title: 'Gym Name Entered',
      description: `Checking in to gym: ${values.gymName}`,
    });
  }

  async function handleMemberIdSubmit(values: z.infer<typeof memberIdSchema>) {
    if (!firestore) return;

    try {
      const membersRef = collection(firestore, 'members');
      const q = query(
        membersRef,
        where('gymName', '==', gymName),
        where('gymId', '==', values.memberId.toUpperCase())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          title: 'Check-in Failed',
          description: `Member ID "${values.memberId}" not found in gym "${gymName}". Please try again.`,
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
        gymName: gymName,
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
      gymNameForm.reset();
      setStep('gymName'); // Go back to the first step after an attempt
    }
  }

  const handleBack = () => {
    setStep('gymName');
    memberIdForm.reset();
  };

  if (step === 'gymName') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Dumbbell className="h-12 w-12 text-primary" />
          <CardTitle className="text-3xl font-bold">Gym Check-in</CardTitle>
          <CardDescription>
            Please enter your Gym Name to begin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...gymNameForm}>
            <form
              onSubmit={gymNameForm.handleSubmit(handleGymNameSubmit)}
              className="grid gap-4"
            >
              <FormField
                control={gymNameForm.control}
                name="gymName"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="gym-name" className="sr-only">
                      Gym Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="gym-name"
                        placeholder="Enter your Gym Name"
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
            Checking in to <span className="font-semibold">{gymName}</span>.
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
