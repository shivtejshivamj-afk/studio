import { Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { CheckInForm } from '@/components/check-in-form';

export default function CheckInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 flex items-center gap-2 text-foreground sm:top-6 sm:left-6"
      >
        <Dumbbell className="h-8 w-8 text-primary" />
        <span className="text-xl font-bold tracking-tight">
          GymTrack Pro
        </span>
      </Link>
      <CheckInForm />
    </div>
  );
}
