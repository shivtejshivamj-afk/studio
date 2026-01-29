'use client';

import { Eye, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { members, plans, type Member } from '@/lib/data';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
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

const statusVariant = {
  Paid: 'default',
  Pending: 'secondary',
  Overdue: 'destructive',
} as const;

const memberFormSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Please enter a valid email.'),
  phone: z
    .string()
    .length(10, 'Phone number must be 10 digits.')
    .regex(/^\d+$/, 'Phone number must only contain digits.'),
  plan: z.string({ required_error: 'Please select a plan.' }),
  joinDate: z.string().min(1, 'Join date is required.'),
  expiryDate: z.string().min(1, 'Expiry date is required.'),
  status: z.enum(['Paid', 'Pending', 'Overdue']),
});

type MemberFormValues = z.infer<typeof memberFormSchema>;

export default function MembersPage() {
  const { toast } = useToast();
  type DialogType = 'add' | 'edit' | 'view' | 'delete' | null;
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
  });

  const handleOpenDialog = (dialog: DialogType, member?: Member) => {
    setSelectedMember(member || null);
    setActiveDialog(dialog);
    if (dialog === 'edit' && member) {
      form.reset(member);
    } else if (dialog === 'add') {
      form.reset({
        name: '',
        email: '',
        phone: '',
        plan: undefined,
        joinDate: '',
        expiryDate: '',
        status: 'Paid',
      });
    }
  };

  const closeDialogs = () => {
    setActiveDialog(null);
    setSelectedMember(null);
  };

  const handleSaveMember = (values: MemberFormValues) => {
    toast({
      title: activeDialog === 'edit' ? 'Member Updated' : 'Member Added',
      description: `The member details for ${values.name} have been saved.`,
    });
    closeDialogs();
  };

  const handleDeleteConfirm = () => {
    if (selectedMember) {
      toast({
        title: 'Member Deleted',
        description: `${selectedMember.name} has been deleted.`,
        variant: 'destructive',
      });
      closeDialogs();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Manage your gym members and their details.
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="gap-1"
              onClick={() => handleOpenDialog('add')}
            >
              <PlusCircle className="h-4 w-4" />
              Add Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="hidden md:table-cell">Plan</TableHead>
                <TableHead className="hidden md:table-cell">
                  Join Date
                </TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const avatar = PlaceHolderImages.find(
                  (img) => img.id === member.avatar
                );
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          {avatar && (
                            <AvatarImage
                              src={avatar.imageUrl}
                              alt={member.name}
                              width={40}
                              height={40}
                              data-ai-hint={avatar.imageHint}
                            />
                          )}
                          <AvatarFallback>
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground hidden sm:block">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {member.plan}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {member.joinDate}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {member.phone}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[member.status]}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isClient ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog('view', member)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog('edit', member)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog('delete', member)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="h-10 w-24" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Member Dialog */}
      <Dialog
        open={activeDialog === 'add' || activeDialog === 'edit'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeDialogs();
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveMember)}>
              <DialogHeader>
                <DialogTitle>
                  {activeDialog === 'edit' ? 'Edit Member' : 'Add New Member'}
                </DialogTitle>
                <DialogDescription>
                  {activeDialog === 'edit'
                    ? 'Update the details for this member.'
                    : 'Fill in the details to add a new member.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Name</FormLabel>
                      <div className="col-span-3">
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage className="mt-1" />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Email</FormLabel>
                      <div className="col-span-3">
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage className="mt-1" />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Phone</FormLabel>
                      <div className="col-span-3">
                        <FormControl>
                          <Input type="tel" {...field} />
                        </FormControl>
                        <FormMessage className="mt-1" />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Plan</FormLabel>
                      <div className="col-span-3">
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a plan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {plans.map((plan) => (
                              <SelectItem key={plan.id} value={plan.name}>
                                {plan.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="mt-1" />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="joinDate"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Join Date</FormLabel>
                      <div className="col-span-3">
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage className="mt-1" />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Expiry Date</FormLabel>
                      <div className="col-span-3">
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage className="mt-1" />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Status</FormLabel>
                      <div className="col-span-3">
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Overdue">
                              Overdue
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="mt-1" />
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialogs}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save {activeDialog === 'edit' ? 'Changes' : 'Member'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog
        open={activeDialog === 'view'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeDialogs();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="grid gap-4 py-4 text-sm">
              <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={
                      PlaceHolderImages.find(
                        (p) => p.id === selectedMember.avatar
                      )?.imageUrl
                    }
                    alt={selectedMember.name}
                  />
                  <AvatarFallback>
                    {selectedMember.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedMember.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedMember.email}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedMember.phone}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div>
                  <span className="font-semibold">Plan:</span>{' '}
                  {selectedMember.plan}
                </div>
                <div>
                  <span className="font-semibold">Status:</span>{' '}
                  <Badge variant={statusVariant[selectedMember.status]}>
                    {selectedMember.status}
                  </Badge>
                </div>
                <div>
                  <span className="font-semibold">Join Date:</span>{' '}
                  {selectedMember.joinDate}
                </div>
                <div>
                  <span className="font-semibold">Expiry Date:</span>{' '}
                  {selectedMember.expiryDate}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={closeDialogs}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={activeDialog === 'delete'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeDialogs();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this member?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              member "{selectedMember?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
