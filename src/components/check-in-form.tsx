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
import { members } from '@/lib/data';

const formSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required.'),
});

export function CheckInForm() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const member = members.find(
      (m) => m.memberId.toUpperCase() === values.memberId.toUpperCase()
    );

    if (member) {
      toast({
        title: 'Check-in Successful!',
        description: `Welcome back, ${member.name}!`,
      });
    } else {
      toast({
        title: 'Check-in Failed',
        description: `Member ID "${values.memberId}" not found. Please try again.`,
        variant: 'destructive',
      });
    }
    form.reset();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <Dumbbell className="h-12 w-12 text-primary" />
        <CardTitle className="text-3xl font-bold">Member Check-in</CardTitle>
        <CardDescription>
          Please enter your Member ID to check in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" size="lg">
              Check In
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
