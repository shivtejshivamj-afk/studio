"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell } from "lucide-react";

export function CheckInForm() {
  const { toast } = useToast();

  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const gymIdInput = form.elements.namedItem('gym-id') as HTMLInputElement;
    
    toast({
      title: "Check-in Successful!",
      description: `Welcome back, member ${gymIdInput.value}!`,
    });

    form.reset();
  };

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
        <form onSubmit={handleCheckIn} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="gym-id" className="sr-only">Gym ID</Label>
            <Input
              id="gym-id"
              name="gym-id"
              type="text"
              placeholder="Enter your Gym ID (e.g., m001)"
              required
              className="text-center"
            />
          </div>
          <Button type="submit" className="w-full" size="lg">
            Check In
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
