'use client';

import { MoreVertical, PlusCircle } from 'lucide-react';
import Image from 'next/image';
import { trainers as initialTrainers, type Trainer } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const trainerFormSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  phone: z
    .string()
    .length(10, { message: 'Phone number must be exactly 10 digits.' })
    .regex(/^[0-9]+$/, { message: 'Phone number must only contain digits.' }),
  specialization: z
    .string()
    .min(1, { message: 'Specialization is required.' }),
  joiningDate: z.string().min(1, { message: 'Joining date is required.' }),
});

type TrainerFormValues = z.infer<typeof trainerFormSchema>;

export default function TrainersPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [trainers, setTrainers] = useState<Trainer[]>(initialTrainers);
  const [searchQuery, setSearchQuery] = useState('');

  const form = useForm<TrainerFormValues>({
    resolver: zodResolver(trainerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      specialization: '',
      joiningDate: '',
    },
  });

  function handleSaveTrainer(values: TrainerFormValues) {
    const newTrainer: Trainer = {
      id: `t${Date.now()}`,
      avatar: 'trainer-3', // Default avatar
      ...values,
    };

    setTrainers((prevTrainers) => [...prevTrainers, newTrainer]);

    toast({
      title: 'Trainer Added',
      description: 'The new trainer has been saved.',
    });
    setIsDialogOpen(false);
    form.reset();
  }

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      form.reset();
    }
  };

  const filteredTrainers = trainers.filter(
    (trainer) =>
      trainer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trainer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Trainers</CardTitle>
            <CardDescription>
              Manage your gym's trainers and their profiles.
            </CardDescription>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:max-w-xs"
            />
            <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <PlusCircle className="h-4 w-4" />
                  Add Trainer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSaveTrainer)}>
                    <DialogHeader>
                      <DialogTitle>Add New Trainer</DialogTitle>
                      <DialogDescription>
                        Fill in the details for the new trainer.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <div className="grid grid-cols-4 items-center gap-x-4">
                            <FormLabel className="text-right">Name</FormLabel>
                            <FormItem className="col-span-3">
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          </div>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <div className="grid grid-cols-4 items-center gap-x-4">
                            <FormLabel className="text-right">Email</FormLabel>
                            <FormItem className="col-span-3">
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="trainer@example.com"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          </div>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <div className="grid grid-cols-4 items-center gap-x-4">
                            <FormLabel className="text-right">Phone</FormLabel>
                            <FormItem className="col-span-3">
                              <FormControl>
                                <Input
                                  type="tel"
                                  placeholder="1234567890"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          </div>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="specialization"
                        render={({ field }) => (
                          <div className="grid grid-cols-4 items-center gap-x-4">
                            <FormLabel className="text-right">
                              Specialization
                            </FormLabel>
                            <FormItem className="col-span-3">
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          </div>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="joiningDate"
                        render={({ field }) => (
                          <div className="grid grid-cols-4 items-center gap-x-4">
                            <FormLabel className="text-right">Joining Date</FormLabel>
                            <FormItem className="col-span-3">
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          </div>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Save Trainer</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trainer</TableHead>
              <TableHead className="hidden md:table-cell">
                Specialization
              </TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              <TableHead className="hidden md:table-cell">Joining Date</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTrainers.map((trainer) => {
              const avatar = PlaceHolderImages.find(
                (img) => img.id === trainer.avatar
              );
              return (
                <TableRow key={trainer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        {avatar && (
                          <AvatarImage
                            src={avatar.imageUrl}
                            alt={trainer.name}
                            width={40}
                            height={40}
                            data-ai-hint={avatar.imageHint}
                          />
                        )}
                        <AvatarFallback>
                          {trainer.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{trainer.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {trainer.specialization}
                  </TableCell>
                   <TableCell className="hidden lg:table-cell">{trainer.email}</TableCell>
                   <TableCell className="hidden sm:table-cell">{trainer.phone}</TableCell>
                   <TableCell className="hidden md:table-cell">{trainer.joiningDate}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
