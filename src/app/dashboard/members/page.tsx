'use client';

import { PlusCircle } from 'lucide-react';
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
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const statusVariant = {
  Active: 'default',
  Inactive: 'secondary',
  'Expiring Soon': 'destructive',
} as const;

export default function MembersPage() {
  const { toast } = useToast();
  const [isAddEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const handleOpenAddDialog = () => {
    setSelectedMember(null);
    setAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (member: Member) => {
    setSelectedMember(member);
    setAddEditDialogOpen(true);
  };

  const handleOpenViewDialog = (member: Member) => {
    setSelectedMember(member);
    setViewDialogOpen(true);
  };

  const handleOpenDeleteDialog = (member: Member) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
  };

  const closeDialogs = () => {
    setAddEditDialogOpen(false);
    setViewDialogOpen(false);
    setDeleteDialogOpen(false);
    setTimeout(() => {
        setSelectedMember(null);
    }, 200);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: selectedMember ? 'Member Updated' : 'Member Added',
      description: `The member details have been saved.`,
    });
    closeDialogs();
  };

  const handleDeleteConfirm = () => {
    if (selectedMember) {
      toast({
        title: 'Member Deleted',
        description: `${selectedMember.name} has been deleted.`,
        variant: 'destructive'
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
            <Button size="sm" className="gap-1" onClick={handleOpenAddDialog}>
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
                <TableHead className="hidden md:table-cell">Join Date</TableHead>
                <TableHead className="hidden md:table-cell">Expiry Date</TableHead>
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
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground hidden sm:block">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{member.plan}</TableCell>
                    <TableCell className="hidden md:table-cell">{member.joinDate}</TableCell>
                    <TableCell className="hidden md:table-cell">{member.expiryDate}</TableCell>
                    <TableCell className="hidden lg:table-cell">{member.phone}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[member.status]}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenViewDialog(member)}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditDialog(member)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleOpenDeleteDialog(member)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Member Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setAddEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={closeDialogs} onEscapeKeyDown={closeDialogs}>
          <form onSubmit={handleSaveMember}>
            <DialogHeader>
              <DialogTitle>{selectedMember ? 'Edit Member' : 'Add New Member'}</DialogTitle>
              <DialogDescription>
                {selectedMember ? 'Update the details for this member.' : 'Fill in the details to add a new member.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input id="name" defaultValue={selectedMember?.name} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input id="email" type="email" defaultValue={selectedMember?.email} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <Input id="phone" type="tel" defaultValue={selectedMember?.phone} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="plan" className="text-right">
                  Plan
                </Label>
                <Select defaultValue={selectedMember?.plan}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.name}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="joinDate" className="text-right">
                  Join Date
                </Label>
                <Input id="joinDate" type="date" defaultValue={selectedMember?.joinDate} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="expiryDate" className="text-right">
                  Expiry Date
                </Label>
                <Input id="expiryDate" type="date" defaultValue={selectedMember?.expiryDate} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select defaultValue={selectedMember?.status}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Expiring Soon">
                      Expiring Soon
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialogs}>Cancel</Button>
              <Button type="submit">Save {selectedMember ? 'Changes' : 'Member'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent onInteractOutside={closeDialogs} onEscapeKeyDown={closeDialogs}>
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="grid gap-4 py-4 text-sm">
                <div className="flex items-center gap-4">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={PlaceHolderImages.find(p => p.id === selectedMember.avatar)?.imageUrl} alt={selectedMember.name} />
                        <AvatarFallback>{selectedMember.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="text-xl font-semibold">{selectedMember.name}</h3>
                        <p className="text-muted-foreground">{selectedMember.email}</p>
                        <p className="text-muted-foreground">{selectedMember.phone}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                    <div><span className="font-semibold">Plan:</span> {selectedMember.plan}</div>
                    <div><span className="font-semibold">Status:</span> <Badge variant={statusVariant[selectedMember.status]}>{selectedMember.status}</Badge></div>
                    <div><span className="font-semibold">Join Date:</span> {selectedMember.joinDate}</div>
                    <div><span className="font-semibold">Expiry Date:</span> {selectedMember.expiryDate}</div>
                </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={closeDialogs}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this member?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the member "{selectedMember?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialogs}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
