import { Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { SignupForm } from '@/components/signup-form';
import { Button } from '@/components/ui/button';

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="absolute top-0 left-0 right-0 z-10 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Dumbbell className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold tracking-tight text-foreground">
              GymTrack Pro
            </span>
          </Link>
          <Button asChild variant="outline">
            <Link href="/check-in">Member Check-in</Link>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <SignupForm />
      </main>
    </div>
  );
}
