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
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { type Member, type Invoice, type MembershipPlan } from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { format, parseISO, addMonths } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
  useUser,
  useDoc,
  setDocumentNonBlocking,
  useCollection,
} from '@/firebase';
import {
    collection,
    doc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getCountFromServer,
    onSnapshot,
    type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

const statusVariant = {
  Paid: 'default',
  Pending: 'secondary',
  Overdue: 'destructive',
} as const;

const invoiceSchema = z.object({
  memberId: z.string().min(1, { message: 'Please select a member.' }),
  planId: z.string().min(1, { message: 'Please select a plan.' }),
  status: z.enum(['Paid', 'Pending', 'Overdue']),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;
type AdminProfile = {
  gymName: string;
  gymIdentifier: string;
  gymEmail?: string;
  gymAddress?: string;
  gymContactNumber?: string;
};

const INVOICES_PER_PAGE = 10;

export default function InvoicingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  type DialogType = 'add' | 'edit' | 'view' | 'delete' | null;
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isClient, setIsClient] = useState(false);
  const invoiceContentRef = useRef<HTMLDivElement>(null);
  
  // Pagination State
  const [invoicesData, setInvoicesData] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<(QueryDocumentSnapshot | null)[]>([null]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);


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
    () => (firestore && adminProfile?.gymIdentifier ? query(collection(firestore, 'members'), where('gymIdentifier', '==', adminProfile.gymIdentifier)) : null),
    [firestore, adminProfile]
  );
  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersQuery);
  
  const plansQuery = useMemoFirebase(
    () => (firestore && adminProfile?.gymIdentifier ? query(collection(firestore, 'membership_plans'), where('gymIdentifier', '==', adminProfile.gymIdentifier)) : null),
    [firestore, adminProfile]
  );
  const { data: plans, isLoading: isLoadingPlans } = useCollection<MembershipPlan>(plansQuery);
  
  useEffect(() => {
     if (firestore && adminProfile?.gymIdentifier) {
      const getCount = async () => {
        const q = query(collection(firestore, 'invoices'), where('gymIdentifier', '==', adminProfile.gymIdentifier));
        const snapshot = await getCountFromServer(q);
        setTotalRecords(snapshot.data().count);
      };
      getCount();
    }
  }, [firestore, adminProfile]);
  
  useEffect(() => {
    if (!firestore || !adminProfile?.gymIdentifier) return;
    
    setIsLoading(true);
    const cursor = pageCursors[page - 1];

    let q = query(
      collection(firestore, 'invoices'),
      where('gymIdentifier', '==', adminProfile.gymIdentifier),
      orderBy('issueDate', 'desc')
    );

    if (cursor) {
      q = query(q, startAfter(cursor));
    }
    
    q = query(q, limit(INVOICES_PER_PAGE));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice));
      setInvoicesData(data);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setIsLoading(false);
    }, (error) => {
      console.error('Failed to fetch invoices:', error);
      if (error.code === 'failed-precondition') {
          toast({
            title: "Database Index Required",
            description: "The query for invoices needs a database index. Please check the developer console for a direct link to create it in Firebase. This is needed for sorting.",
            variant: "destructive",
            duration: 15000,
          });
      } else {
        toast({ title: "Error", description: `Could not fetch invoices. ${error.message}`, variant: "destructive" });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, adminProfile, page, pageCursors, toast]);

  const isDataLoading = isLoading || isLoadingAdminProfile || isLoadingMembers || isLoadingPlans;

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
  });

  const totalPages = Math.ceil(totalRecords / INVOICES_PER_PAGE);

  const goToNextPage = () => {
    if (page < totalPages) {
      setPageCursors(prev => [...prev, lastDoc]);
      setPage(prev => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (page > 1) {
      setPageCursors(prev => prev.slice(0, -1));
      setPage(prev => prev - 1);
    }
  };


  const processedInvoices = useMemo(() => {
    if (!invoicesData || !members || !plans) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

    return invoicesData.map(inv => {
      const member = members.find(m => m.id === inv.memberId);
      const plan = plans.find(p => p.id === inv.membershipId);
      
      let displayStatus = inv.status;
      if (inv.status === 'Pending' && parseISO(inv.dueDate) < today) {
        displayStatus = 'Overdue';
      }

      return {
        ...inv,
        status: displayStatus,
        memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown Member',
        memberEmail: member?.email,
        memberPhone: member?.phone,
        planName: plan?.name || 'Unknown Plan',
      };
    });
  }, [invoicesData, members, plans]);

  const handleOpenDialog = (dialog: DialogType, invoice?: Invoice) => {
    setSelectedInvoice(invoice || null);
    setActiveDialog(dialog);
    if (dialog === 'edit' && invoice) {
      form.reset({
        memberId: invoice.memberId,
        planId: invoice.membershipId,
        status: invoice.status,
      });
    } else if (dialog === 'add') {
      form.reset({
        memberId: undefined,
        planId: undefined,
        status: 'Pending',
      });
    }
  };

  const closeDialogs = () => {
    setActiveDialog(null);
    setSelectedInvoice(null);
  };

  const handleSaveInvoice = (values: InvoiceFormValues) => {
    if (!firestore || !members || !adminProfile?.gymName || !adminProfile.gymIdentifier || !plans) {
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
    
    if (activeDialog === 'add') {
      const newDocRef = doc(collection(firestore, 'invoices'));

      const newInvoiceData: Invoice = {
        id: newDocRef.id,
        invoiceNumber: `INV-${String((totalRecords || 0) + 1).padStart(3, '0')}`,
        memberId: member.id,
        membershipId: plan.id,
        totalAmount: plan.price,
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        dueDate: format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        status: values.status,
        gymName: adminProfile.gymName,
        gymIdentifier: adminProfile.gymIdentifier,
      };
      
      setDocumentNonBlocking(newDocRef, newInvoiceData, {});
      
      toast({
        title: 'Invoice Created',
        description: `New invoice for ${member.firstName} ${member.lastName} has been created.`,
      });
    } else if (activeDialog === 'edit' && selectedInvoice) {
      const docRef = doc(firestore, 'invoices', selectedInvoice.id);
      const updatedData = {
        memberId: values.memberId,
        membershipId: values.planId,
        status: values.status,
        totalAmount: plan.price,
      };
      updateDocumentNonBlocking(docRef, updatedData);
      toast({
        title: 'Invoice Updated',
        description: `Invoice ${selectedInvoice.invoiceNumber} has been updated.`,
      });
    }

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
  
  const handleUpdateStatus = (invoice: Invoice, status: 'Paid' | 'Pending' | 'Overdue') => {
    if (!firestore || !members || !plans) return;
    const docRef = doc(firestore, 'invoices', invoice.id);
    updateDocumentNonBlocking(docRef, { status });

    if (status === 'Paid') {
      const member = members.find(m => m.id === invoice.memberId);
      const plan = plans.find(p => p.id === invoice.membershipId);
      if (member && plan) {
          const memberDocRef = doc(firestore, 'members', member.id);
          const endDate = addMonths(new Date(), plan.durationInMonths);

          const memberUpdate = {
              membershipEndDate: format(endDate, 'yyyy-MM-dd'),
              activePlanId: plan.id,
              isActive: true,
          };
          updateDocumentNonBlocking(memberDocRef, memberUpdate);
      }
    }

    toast({
      title: 'Invoice Status Updated',
      description: `Invoice ${invoice.invoiceNumber} has been marked as ${status}.`,
    });
  };

  const handleDownloadPdf = (invoiceToDownload: Invoice) => {
    if (!invoiceToDownload) {
      toast({
        title: 'Error',
        description: 'No invoice selected to download.',
        variant: 'destructive',
      });
      return;
    }

    const doc = new jsPDF();
    
    const currencyPrefix = '₹';

    // --- Header ---
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 14, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let rightColY = 22;
    if (adminProfile?.gymName) {
      doc.text(adminProfile.gymName, 196, rightColY, { align: 'right' });
      rightColY += 6;
    }
    if (adminProfile?.gymAddress) {
      doc.text(adminProfile.gymAddress, 196, rightColY, { align: 'right' });
      rightColY += 6;
    }
    if (adminProfile?.gymEmail) {
      doc.text(adminProfile.gymEmail, 196, rightColY, { align: 'right' });
      rightColY += 6;
    }
    if (adminProfile?.gymContactNumber) {
      doc.text(adminProfile.gymContactNumber, 196, rightColY, { align: 'right' });
    }

    // --- Line Separator ---
    doc.setLineWidth(0.5);
    doc.line(14, 48, 196, 48);

    // --- Bill To & Invoice Details ---
    let detailsY = 58;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', 14, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceToDownload.memberName || 'N/A', 14, detailsY + 6);
    doc.text(invoiceToDownload.memberEmail || 'N/A', 14, detailsY + 12);
    if (invoiceToDownload.memberPhone) {
      doc.text(invoiceToDownload.memberPhone, 14, detailsY + 18);
    }
    
    const detailsX = 130;
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Number:', detailsX, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceToDownload.invoiceNumber, 196, detailsY, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('Issue Date:', detailsX, detailsY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceToDownload.issueDate, 196, detailsY + 6, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('Due Date:', detailsX, detailsY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceToDownload.dueDate, 196, detailsY + 12, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('Status:', detailsX, detailsY + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceToDownload.status, 196, detailsY + 18, { align: 'right' });

    // --- Table ---
    autoTable(doc, {
      startY: detailsY + 30,
      head: [['Description', 'Amount']],
      body: [
        [`${invoiceToDownload.planName || 'Unknown Plan'} Membership`, `${currencyPrefix}${invoiceToDownload.totalAmount.toFixed(2)}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [20, 20, 20], fontStyle: 'bold' },
      didDrawPage: (data) => {
        // --- Totals Section ---
        const finalY = (data.cursor?.y || 0) + 10;
        doc.setFontSize(10);
        
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal', 150, finalY, { align: 'right' });
        doc.text(`${currencyPrefix}${invoiceToDownload.totalAmount.toFixed(2)}`, 196, finalY, { align: 'right' });
        
        doc.setFont('helvetica', 'bold');
        doc.text('Total', 150, finalY + 7, { align: 'right' });
        doc.text(`${currencyPrefix}${invoiceToDownload.totalAmount.toFixed(2)}`, 196, finalY + 7, { align: 'right' });
        
        // --- Footer ---
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text('Thanks for joining! Let’s make every workout count.', 105, pageHeight - 20, { align: 'center' });
        if (adminProfile?.gymEmail) {
            doc.text(`For any questions, please contact us at ${adminProfile.gymEmail}.`, 105, pageHeight - 15, { align: 'center' });
        }
      },
    });

    doc.save(`invoice-${invoiceToDownload.invoiceNumber}.pdf`);
  };

  const filteredInvoices = useMemo(() => {
    if (!searchQuery) return processedInvoices;
    const lowercasedQuery = searchQuery.toLowerCase();
    return processedInvoices.filter(
      (invoice) =>
        invoice.memberName?.toLowerCase().includes(lowercasedQuery) ||
        invoice.invoiceNumber.toLowerCase().includes(lowercasedQuery)
    );
  }, [processedInvoices, searchQuery]);

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
              {isDataLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-36" /></TableCell>
                  </TableRow>
                ))
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    <div>{invoice.memberName}</div>
                    {invoice.memberPhone && <div className="text-sm text-muted-foreground">{invoice.memberPhone}</div>}
                  </TableCell>
                  <TableCell>{invoice.issueDate}</TableCell>
                  <TableCell>{invoice.dueDate}</TableCell>
                  <TableCell>₹{invoice.totalAmount.toFixed(2)}</TableCell>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog('edit', invoice)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit Invoice</span>
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
                      <div className="h-10 w-40" />
                    )}
                  </TableCell>
                </TableRow>
              ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              Page {page} of {totalPages > 0 ? totalPages : 1}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevPage}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      <Dialog
        open={activeDialog === 'add' || activeDialog === 'edit'}
        onOpenChange={(isOpen) => !isOpen && closeDialogs()}
      >
        <DialogContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveInvoice)}>
              <DialogHeader>
                <DialogTitle>{activeDialog === 'edit' ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
                <DialogDescription>
                  {activeDialog === 'edit' ? 'Update the details for this invoice.' : 'Select a member and plan to generate an invoice.'}
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
                          {plans?.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - ₹{plan.price}
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
                <Button type="submit">{activeDialog === 'edit' ? 'Save Changes' : 'Create Invoice'}</Button>
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
                  <div className="text-right max-w-[50%]">
                    <h2 className="text-2xl font-semibold text-gray-800 break-words">{adminProfile?.gymName}</h2>
                    {adminProfile?.gymAddress && <p className="text-gray-500 break-words">{adminProfile.gymAddress}</p>}
                    {adminProfile?.gymEmail && <p className="text-gray-500 break-words">{adminProfile.gymEmail}</p>}
                    {adminProfile?.gymContactNumber && <p className="text-gray-500">{adminProfile.gymContactNumber}</p>}
                  </div>
                </div>
                <Separator className="my-8" />
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="font-semibold text-gray-600 mb-2">BILL TO</h3>
                    <p className="font-bold text-gray-800">{selectedInvoice.memberName}</p>
                    <p className="text-gray-600 break-words">{selectedInvoice.memberEmail}</p>
                    {selectedInvoice.memberPhone && <p className="text-gray-600">{selectedInvoice.memberPhone}</p>}
                  </div>
                  <div className="text-right space-y-2">
                    <div className="flex justify-between items-center gap-4">
                      <p className="font-semibold text-gray-600 text-nowrap">Issue Date:</p>
                      <p className="text-gray-800">{selectedInvoice.issueDate}</p>
                    </div>
                     <div className="flex justify-between items-center gap-4">
                      <p className="font-semibold text-gray-600 text-nowrap">Due Date:</p>
                      <p className="text-gray-800">{selectedInvoice.dueDate}</p>
                    </div>
                     <div className="flex justify-between items-center gap-4">
                      <p className="font-semibold text-gray-600">Status:</p>
                       <Badge variant={statusVariant[selectedInvoice.status]} className="text-white">
                        {selectedInvoice.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Table className="mb-8">
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-semibold text-gray-800">Description</TableHead>
                      <TableHead className="text-right font-semibold text-gray-800">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-gray-700">{selectedInvoice.planName} Membership</TableCell>
                      <TableCell className="text-right text-gray-700">₹{selectedInvoice.totalAmount.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="flex justify-end">
                    <div className="w-64">
                        <div className="flex justify-between text-gray-700">
                            <p>Subtotal</p>
                            <p>₹{selectedInvoice.totalAmount.toFixed(2)}</p>
                        </div>
                        <Separator className="my-2"/>
                         <div className="flex justify-between font-bold text-gray-800 text-lg">
                            <p>Total</p>
                            <p>₹{selectedInvoice.totalAmount.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                 <div className="mt-12 text-center text-gray-500 text-sm">
                    <p>Thanks for joining! Let’s make every workout count.</p>
                    <p>If you have any questions, please contact us at {adminProfile?.gymEmail || 'support@gymtrack.pro'}.</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Close</Button>
            <Button onClick={() => handleDownloadPdf(selectedInvoice!)}>
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
