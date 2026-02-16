'use client';

import {
  Download,
  MoreVertical,
  PlusCircle,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { type Member, type Invoice, plans } from '@/lib/data';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
import { useState, useRef, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
  useUser,
  useDoc,
  setDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

const statusVariant = {
  Paid: 'default',
  Pending: 'secondary',
  Overdue: 'destructive',
  Draft: 'outline',
} as const;

const invoiceSchema = z.object({
  memberId: z.string().min(1, { message: 'Please select a member.' }),
  planId: z.string().min(1, { message: 'Please select a plan.' }),
  status: z.enum(['Paid', 'Pending', 'Overdue', 'Draft']),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;
type AdminProfile = {
  gymName: string;
  gymEmail?: string;
  gymAddress?: string;
  gymContactNumber?: string;
};

export default function InvoicingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  type DialogType = 'add' | 'view' | 'delete' | null;
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isClient, setIsClient] = useState(false);
  const invoiceContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { user } = useUser();
  const firestore = useFirestore();

  const adminProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );
  const { data: adminProfile, isLoading: isLoadingAdminProfile } = useDoc<AdminProfile>(adminProfileRef);

  const membersQuery = useMemoFirebase(
    () => (firestore && adminProfile?.gymName ? query(collection(firestore, 'members'), where('gymName', '==', adminProfile.gymName)) : null),
    [firestore, adminProfile]
  );
  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersQuery);

  const invoicesQuery = useMemoFirebase(
    () => (firestore && adminProfile?.gymName ? query(collection(firestore, 'invoices'), where('gymName', '==', adminProfile.gymName)) : null),
    [firestore, adminProfile]
  );
  const { data: invoicesData, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);
  
  const isLoading = isLoadingAdminProfile || isLoadingMembers || isLoadingInvoices;

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
  });

  const processedInvoices = useMemo(() => {
    if (!invoicesData || !members) return [];
    return invoicesData.map(inv => {
      const member = members.find(m => m.id === inv.memberId);
      const plan = plans.find(p => p.id === inv.membershipId);
      return {
        ...inv,
        memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown Member',
        memberEmail: member?.email,
        planName: plan?.name || 'Unknown Plan',
      };
    }).sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [invoicesData, members]);

  const handleOpenDialog = (dialog: DialogType, invoice?: Invoice) => {
    setSelectedInvoice(invoice || null);
    setActiveDialog(dialog);
    if (dialog === 'add') {
      form.reset({
        memberId: undefined,
        planId: undefined,
        status: 'Draft',
      });
    }
  };

  const closeDialogs = () => {
    setActiveDialog(null);
    setSelectedInvoice(null);
  };

  const handleSaveInvoice = (values: InvoiceFormValues) => {
    if (!firestore || !members || !adminProfile?.gymName) {
        toast({
            title: 'Cannot Create Invoice',
            description: "Could not determine your gym. Please ensure you have signed up correctly.",
            variant: 'destructive',
        });
        return;
    }
    
    const member = members.find((m) => m.id === values.memberId);
    const plan = plans.find((p) => p.id === values.planId);

    if (!member || !plan) {
      toast({
        title: 'Error',
        description: 'Selected member or plan not found.',
        variant: 'destructive',
      });
      return;
    }
    
    const newDocRef = doc(collection(firestore, 'invoices'));

    const newInvoiceData = {
      id: newDocRef.id,
      invoiceNumber: `INV-${String((invoicesData?.length || 0) + 1).padStart(3, '0')}`,
      memberId: member.id,
      membershipId: plan.id,
      totalAmount: plan.price,
      issueDate: format(new Date(), 'yyyy-MM-dd'),
      dueDate: format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      status: values.status,
      gymName: adminProfile.gymName,
    };
    
    setDocumentNonBlocking(newDocRef, newInvoiceData, {});
    
    toast({
      title: 'Invoice Created',
      description: `New invoice for ${member.firstName} ${member.lastName} has been created.`,
    });
    closeDialogs();
  };

  const handleDeleteConfirm = () => {
    if (selectedInvoice && firestore) {
      const docRef = doc(firestore, 'invoices', selectedInvoice.id);
      deleteDocumentNonBlocking(docRef);

      toast({
        title: 'Invoice Deleted',
        description: `Invoice ${selectedInvoice.invoiceNumber} has been deleted.`,
        variant: 'destructive',
      });
      closeDialogs();
    }
  };
  
  const handleUpdateStatus = (invoice: Invoice, status: 'Paid' | 'Pending' | 'Overdue' | 'Draft') => {
    if (!firestore) return;
    const docRef = doc(firestore, 'invoices', invoice.id);
    updateDocumentNonBlocking(docRef, { status });
    toast({
      title: 'Invoice Status Updated',
      description: `Invoice ${invoice.invoiceNumber} has been marked as ${status}.`,
    });
  };

  const handleDownloadPdf = () => {
    if (!selectedInvoice || !invoiceContentRef.current) return;
    
    const originalColors = new Map();
    const elements = invoiceContentRef.current.querySelectorAll('*');
    elements.forEach(el => {
        const style = window.getComputedStyle(el);
        originalColors.set(el, style.color);
        (el as HTMLElement).style.color = 'black';
    });


    if (typeof window !== 'undefined') {
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'pt',
            format: 'a4',
        });
        doc.html(invoiceContentRef.current, {
            callback: function (doc) {
                doc.save(`invoice-${selectedInvoice.invoiceNumber}.pdf`);
                elements.forEach(el => {
                    (el as HTMLElement).style.color = originalColors.get(el);
                });
            },
            x: 10,
            y: 10,
            html2canvas: {
                scale: 0.7
            }
        });
    }
  };

  const filteredInvoices = processedInvoices.filter(
    (invoice) =>
      invoice.memberName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Invoicing</CardTitle>
              <CardDescription>
                Manage your member invoices and billing for {adminProfile?.gymName || 'your gym'}.
              </CardDescription>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Input
                placeholder="Search by name or invoice ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:max-w-xs"
              />
              <Button
                size="sm"
                className="gap-1"
                onClick={() => handleOpenDialog('add')}
              >
                <PlusCircle className="h-4 w-4" />
                Create Invoice
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.memberName}</TableCell>
                  <TableCell>{invoice.issueDate}</TableCell>
                  <TableCell>{invoice.dueDate}</TableCell>
                  <TableCell>${invoice.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[invoice.status]}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isClient ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog('view', invoice)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Details</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Update Status</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(invoice, 'Paid')}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark as Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(invoice, 'Pending')}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Mark as Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(invoice, 'Overdue')}
                            >
                              <AlertCircle className="mr-2 h-4 w-4" />
                              Mark as Overdue
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog('delete', invoice)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="h-10 w-28" />
                    )}
                  </TableCell>
                </TableRow>
              ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={activeDialog === 'add'}
        onOpenChange={(isOpen) => !isOpen && closeDialogs()}
      >
        <DialogContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveInvoice)}>
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Select a member and plan to generate an invoice.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <FormField
                  control={form.control}
                  name="memberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {members?.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.firstName} {member.lastName} ({member.gymId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="planId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - ${plan.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialogs} type="button">Cancel</Button>
                <Button type="submit">Create Invoice</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Dialog
        open={activeDialog === 'view'}
        onOpenChange={(isOpen) => !isOpen && closeDialogs()}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Review the invoice details below.
            </DialogDescription>
          </DialogHeader>
          <div ref={invoiceContentRef} className="p-8 text-black bg-white rounded-lg">
            {selectedInvoice && (
              <div className="prose max-w-none">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">INVOICE</h1>
                    <p className="text-gray-500">{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-semibold text-gray-800">{adminProfile?.gymName}</h2>
                    {adminProfile?.gymAddress && <p className="text-gray-500">{adminProfile.gymAddress}</p>}
                    {adminProfile?.gymEmail && <p className="text-gray-500">{adminProfile.gymEmail}</p>}
                    {adminProfile?.gymContactNumber && <p className="text-gray-500">{adminProfile.gymContactNumber}</p>}
                  </div>
                </div>
                <Separator className="my-8" />
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="font-semibold text-gray-600 mb-2">BILL TO</h3>
                    <p className="font-bold text-gray-800">{selectedInvoice.memberName}</p>
                    <p className="text-gray-600">{selectedInvoice.memberEmail}</p>
                  </div>
                  <div className="text-right">
                    <div className="grid grid-cols-2">
                      <p className="font-semibold text-gray-600">Issue Date:</p>
                      <p className="text-gray-800">{selectedInvoice.issueDate}</p>
                    </div>
                     <div className="grid grid-cols-2">
                      <p className="font-semibold text-gray-600">Due Date:</p>
                      <p className="text-gray-800">{selectedInvoice.dueDate}</p>
                    </div>
                     <div className="grid grid-cols-2">
                      <p className="font-semibold text-gray-600">Status:</p>
                       <Badge variant={statusVariant[selectedInvoice.status]} className="justify-self-end text-white">
                        {selectedInvoice.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Table className="mb-8">
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="text-gray-800">Description</TableHead>
                      <TableHead className="text-right text-gray-800">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-gray-700">{selectedInvoice.planName} Membership</TableCell>
                      <TableCell className="text-right text-gray-700">${selectedInvoice.totalAmount.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="flex justify-end">
                    <div className="w-64">
                        <div className="flex justify-between text-gray-700">
                            <p>Subtotal</p>
                            <p>${selectedInvoice.totalAmount.toFixed(2)}</p>
                        </div>
                        <Separator className="my-2"/>
                         <div className="flex justify-between font-bold text-gray-800 text-lg">
                            <p>Total</p>
                            <p>${selectedInvoice.totalAmount.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                 <div className="mt-12 text-center text-gray-500 text-sm">
                    <p>Thank you for your business!</p>
                    <p>If you have any questions, please contact us at {adminProfile?.gymEmail || 'support@gymtrack.pro'}.</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Close</Button>
            <Button onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog
        open={activeDialog === 'delete'}
        onOpenChange={(isOpen) => !isOpen && closeDialogs()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete invoice{' '}
              <strong>{selectedInvoice?.invoiceNumber}</strong>. This action
              cannot be undone.
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
