import { Users, CreditCard, UserCheck, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function IntroductionPage() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-background');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Dumbbell className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold tracking-tight text-white">
              GymTrack Pro
            </span>
          </Link>
          <div className="flex items-center gap-4">
             <Button asChild variant="outline" className="border-neutral-400 text-white hover:bg-white hover:text-black">
               <Link href="/check-in">Member Check-in</Link>
             </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="relative h-screen w-full flex items-center justify-center">
          {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              fill
              className="object-cover"
              data-ai-hint={heroImage.imageHint}
              priority
            />
          )}
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white px-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Welcome to GymTrack Pro
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-neutral-200 sm:text-xl">
              The ultimate solution for managing your gym. Streamline your operations, manage members, and grow your business with ease.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/login">Admin Login</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 md:py-24 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                An All-In-One Gym Management Platform
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                GymTrack Pro provides everything you need to run your business smoothly, keep your members engaged, and grow your community.
              </p>
            </div>
            <div className="mt-16 grid gap-x-8 gap-y-12 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">Effortless Member Management</h3>
                <p className="mt-2 text-muted-foreground">
                  Track member profiles, attendance, and membership statuses in one central dashboard.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CreditCard className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">Seamless Payments & Plans</h3>
                <p className="mt-2 text-muted-foreground">
                  Create flexible membership plans and automate billing. View detailed financial reports with ease.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                 <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserCheck className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">Trainer & Staff Profiles</h3>
                <p className="mt-2 text-muted-foreground">
                  Manage your team, showcase trainer specializations, and empower your staff.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted py-16 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to Elevate Your Gym?</h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Join the community of modern gyms using GymTrack Pro to achieve their goals.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg">
                <Link href="/signup">Get Started Today</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

       <footer className="py-6 border-t">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">GymTrack Pro</span>
          </div>
          <p className="text-sm text-muted-foreground mt-4 sm:mt-0">
            © 2024 GymTrack Pro. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
