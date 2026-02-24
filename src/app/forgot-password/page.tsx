import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/forgot-password-form';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="absolute top-0 left-0 right-0 z-10 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 logo-mask text-primary"></div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              GymTrack Pro
            </span>
          </Link>
           <Button asChild variant="outline">
            <Link href="/login">Admin Login</Link>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <ForgotPasswordForm />
      </main>
    </div>
  );
}
