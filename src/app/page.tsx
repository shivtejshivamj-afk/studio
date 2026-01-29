import { Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function IntroductionPage() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-background');

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
          <div className="flex items-center gap-4">
             <Button asChild variant="outline">
               <Link href="/check-in">Member Check-in</Link>
             </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="relative h-screen w-full">
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
      </main>
    </div>
  );
}
