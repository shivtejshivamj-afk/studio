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

const formSchema = z.object({
  gymId: z.string().min(1, 'Gym ID is required.'),
});

export function CheckInForm() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gymId: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    toast({
      title: 'Check-in Successful!',
      description: `Welcome back, member ${values.gymId}!`,
    });
    form.reset();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <Dumbbell className="h-12 w-12 text-primary" />
        <CardTitle className="text-3xl font-bold">Member Check-in</CardTitle>
        <CardDescription>
          Please enter your Gym ID to check in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="gymId"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="gym-id" className="sr-only">
                    Gym ID
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="gym-id"
                      placeholder="Enter your Gym ID (e.g., m001)"
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
