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
import { type Member, type Invoice, type MembershipPlan, type Membership } from '@/lib/data';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useState, useMemo, useEffect } from 'react';
import { format, parseISO, addDays, isPast, startOfDay, endOfDay, isValid } from 'date-fns';
import jsPDF from 'jsPDF';
import autoTable from 'jspdf-autotable';
import {
  useFirestore,
  useMemoFirebase,
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
  totalAmount: z.coerce.number().positive(),
  issueDate: z.string().min(1, 'Issue date is required.'),
  expiryDate: z.string().min(1, 'Expiry date is required.'),
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
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, adminProfile, page, pageCursors]);

  const isDataLoading = isLoading || isLoadingAdminProfile || isLoadingMembers || isLoadingPlans;

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
  });

  const selectedPlanId = form.watch('planId');
  const selectedMemberId = form.watch('memberId');

  useEffect(() => {
    if (activeDialog === 'add' && selectedPlanId && plans && members && selectedMemberId) {
      const plan = plans.find(p => p.id === selectedPlanId);
      const member = members.find(m => m.id === selectedMemberId);
      if (plan && member) {
        form.setValue('totalAmount', plan.price);
        let startDate = startOfDay(new Date());
        if (member.membershipEndDate) {
          const currentExpiry = parseISO(member.membershipEndDate);
          if (isValid(currentExpiry) && !isPast(endOfDay(currentExpiry))) {
            startDate = currentExpiry;
          }
        }
        const newExpiry = format(addDays(startDate, plan.durationInDays), 'yyyy-MM-dd');
        form.setValue('expiryDate', newExpiry);
      }
    }
  }, [selectedPlanId, selectedMemberId, plans, members, form, activeDialog]);

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
    return invoicesData.map(inv => {
      const member = members.find(m => m.id === inv.memberId);
      const plan = plans.find(p => p.id === inv.planId);
      let displayStatus = inv.status;
      if (inv.status === 'Pending' && inv.dueDate) {
        const due = parseISO(inv.dueDate);
        if (isValid(due) && isPast(endOfDay(due))) {
          displayStatus = 'Overdue';
        }
      }
      return {
        ...inv,
        status: displayStatus as 'Paid' | 'Pending' | 'Overdue',
        memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown Member',
        memberEmail: member?.email,
        memberPhone: member?.phone,
        memberGymId: member?.gymId,
        planName: plan?.name || 'Standard',
      };
    });
  }, [invoicesData, members, plans]);

  const handleOpenDialog = (dialog: DialogType, invoice?: Invoice) => {
    setSelectedInvoice(invoice || null);
    setActiveDialog(dialog);
    if (dialog === 'edit' && invoice) {
      form.reset({
        memberId: invoice.memberId,
        planId: invoice.planId || '',
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        issueDate: invoice.issueDate,
        expiryDate: invoice.dueDate,
      });
    } else if (dialog === 'add') {
      form.reset({
        memberId: '',
        planId: '',
        status: 'Pending',
        totalAmount: 0,
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        expiryDate: '', 
      });
    }
  };

  const closeDialogs = () => {
    setActiveDialog(null);
    setSelectedInvoice(null);
  };

  const syncMemberWithInvoice = (memberId: string, planId: string, expiryDate: string, status: 'Paid' | 'Pending' | 'Overdue', existingMembershipId?: string) => {
    if (!firestore || !members || !plans) return null;
    const member = members.find(m => m.id === memberId);
    const plan = plans.find(p => p.id === planId);
    if (!member || !plan) return null;

    const membershipId = existingMembershipId || doc(collection(firestore, 'members', member.id, 'memberships')).id;
    const membershipRef = doc(firestore, 'members', member.id, 'memberships', membershipId);

    // Sync membership details immediately regardless of status
    const membershipData: Membership = {
      id: membershipId, 
      memberId: member.id, 
      planId: plan.id, 
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: expiryDate, 
      status: status === 'Paid' ? 'active' : 'pending', 
      priceAtPurchase: plan.price, 
      autoRenew: false,
    };
    setDocumentNonBlocking(membershipRef, membershipData, { merge: true });

    // Sync member profile
    const memberDocRef = doc(firestore, 'members', member.id);
    updateDocumentNonBlocking(memberDocRef, { 
      membershipEndDate: expiryDate, 
      activePlanId: plan.id, 
      isActive: status === 'Paid' 
    });

    // Sync public profile
    const publicProfileRef = doc(firestore, 'member_profiles_public', member.gymId);
    updateDocumentNonBlocking(publicProfileRef, { isActive: status === 'Paid' });

    return membershipId;
  };

  const handleSaveInvoice = (values: InvoiceFormValues) => {
    if (!firestore || !members || !adminProfile?.gymName || !adminProfile.gymIdentifier || !plans) return;
    const member = members.find((m) => m.id === values.memberId);
    const plan = plans.find((p) => p.id === values.planId);
    if (!member || !plan) return;
    
    if (activeDialog === 'add') {
      const newDocRef = doc(collection(firestore, 'invoices'));
      const membershipId = syncMemberWithInvoice(member.id, plan.id, values.expiryDate, values.status) || '';
      const newInvoiceData: Invoice = {
        id: newDocRef.id, 
        invoiceNumber: `INV-${String((totalRecords || 0) + 1).padStart(3, '0')}`,
        memberId: member.id, 
        planId: plan.id, 
        membershipId: membershipId, 
        totalAmount: values.totalAmount,
        issueDate: values.issueDate, 
        dueDate: values.expiryDate, 
        status: values.status,
        gymName: adminProfile.gymName, 
        gymIdentifier: adminProfile.gymIdentifier,
      };
      setDocumentNonBlocking(newDocRef, newInvoiceData, {});
      toast({ title: 'Invoice Created' });
    } else if (activeDialog === 'edit' && selectedInvoice) {
      const docRef = doc(firestore, 'invoices', selectedInvoice.id);
      const membershipId = syncMemberWithInvoice(member.id, plan.id, values.expiryDate, values.status, selectedInvoice.membershipId) || '';
      updateDocumentNonBlocking(docRef, { ...values, dueDate: values.expiryDate, membershipId });
      toast({ title: 'Invoice Updated' });
    }
    closeDialogs();
  };

  const handleDeleteConfirm = () => {
    if (selectedInvoice && firestore) {
      deleteDocumentNonBlocking(doc(firestore, 'invoices', selectedInvoice.id));
      toast({ title: 'Invoice Deleted', variant: 'destructive' });
      closeDialogs();
    }
  };
  
  const handleUpdateStatus = (invoice: Invoice, status: 'Paid' | 'Pending' | 'Overdue') => {
    if (!firestore || !members || !plans) return;
    const membershipId = syncMemberWithInvoice(invoice.memberId, invoice.planId, invoice.dueDate, status, invoice.membershipId);
    updateDocumentNonBlocking(doc(firestore, 'invoices', invoice.id), { status, membershipId: membershipId || invoice.membershipId });
    toast({ title: `Status updated to ${status}` });
  };

  const handleDownloadPdf = (invoice: any) => {
    const doc = new jsPDF();
    const primaryColor = [16, 185, 129]; // #10b981
    
    // Header
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(30);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 14, 25);
    
    // Gym Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(adminProfile?.gymName || 'SJ fit', 196, 15, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(adminProfile?.gymAddress || 'Ghansoli', 196, 20, { align: 'right' });
    doc.text(adminProfile?.gymEmail || 'warlucifer87@gmail.com', 196, 25, { align: 'right' });
    doc.text(adminProfile?.gymContactNumber || '1234567890', 196, 30, { align: 'right' });
    
    // Separator line
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(1);
    doc.line(14, 35, 196, 35);
    
    // Bill To & Metadata
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('BILL TO', 14, 45);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.memberName || 'Member', 14, 52);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.memberEmail || '', 14, 57);
    doc.text(invoice.memberPhone || '', 14, 62);
    
    // Metadata block
    let metaX = 130;
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Number:', metaX, 45);
    doc.text('Issue Date:', metaX, 50);
    doc.text('Plan Expiry:', metaX, 55);
    doc.text('Status:', metaX, 60);
    
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.invoiceNumber, 196, 45, { align: 'right' });
    doc.text(invoice.issueDate, 196, 50, { align: 'right' });
    doc.text(invoice.dueDate, 196, 55, { align: 'right' });
    doc.text(invoice.status, 196, 60, { align: 'right' });
    
    // Table
    autoTable(doc, {
      startY: 70,
      head: [['Description', 'Amount']],
      body: [[`${invoice.planName} Membership`, `INR ${invoice.totalAmount.toFixed(2)}` ]],
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0] },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: { 1: { halign: 'right' } }
    });
    
    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text('Subtotal', 150, finalY);
    doc.text(`INR ${invoice.totalAmount.toFixed(2)}`, 196, finalY, { align: 'right' });
    
    doc.setFillColor(240, 240, 240);
    doc.rect(130, finalY + 5, 66, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Total Due', 135, finalY + 13);
    doc.text(`INR ${invoice.totalAmount.toFixed(2)}`, 196, finalY + 13, { align: 'right' });
    
    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text("Thanks for joining! Let's make every workout count.", 105, 285, { align: 'center' });
    doc.line(14, 280, 196, 280);
    
    doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
  };

  const filteredInvoices = useMemo(() => {
    if (!searchQuery) return processedInvoices;
    const q = searchQuery.toLowerCase();
    return processedInvoices.filter(i => i.memberName?.toLowerCase().includes(q) || i.invoiceNumber.toLowerCase().includes(q));
  }, [processedInvoices, searchQuery]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle>Invoicing</CardTitle><CardDescription>Manage billing and plans.</CardDescription></div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:max-w-xs" />
              <Button size="sm" className="gap-1" onClick={() => handleOpenDialog('add')}><PlusCircle className="h-4 w-4" /> Create</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Member</TableHead><TableHead>Expiry</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isDataLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              )) : filteredInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium text-xs">{inv.invoiceNumber}</TableCell>
                  <TableCell><div><p className="font-bold">{inv.memberName}</p><p className="text-[10px] text-muted-foreground">{inv.planName}</p></div></TableCell>
                  <TableCell className="text-xs">{inv.dueDate}</TableCell>
                  <TableCell className="font-semibold">₹{inv.totalAmount}</TableCell>
                  <TableCell><Badge variant={statusVariant[inv.status]}>{inv.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('view', inv)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('edit', inv)}><Pencil className="h-4 w-4" /></Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleUpdateStatus(inv, 'Paid')}><CheckCircle className="mr-2 h-4 w-4" /> Paid</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(inv, 'Pending')}><Clock className="mr-2 h-4 w-4" /> Pending</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(inv, 'Overdue')}><AlertCircle className="mr-2 h-4 w-4" /> Overdue</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter><div className="flex items-center justify-between w-full text-xs text-muted-foreground">Page {page} of {totalPages || 1}<div className="flex gap-2"><Button variant="outline" size="sm" onClick={goToPrevPage} disabled={page <= 1}>Prev</Button><Button variant="outline" size="sm" onClick={goToNextPage} disabled={page >= totalPages}>Next</Button></div></div></CardFooter>
      </Card>

      <Dialog open={activeDialog === 'view'} onOpenChange={(isOpen) => !isOpen && closeDialogs()}>
        <DialogContent className="sm:max-w-2xl bg-white text-black p-0 overflow-hidden border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="p-10 space-y-8 font-sans">
              <div className="flex justify-between items-start">
                <h1 className="text-4xl font-bold text-[#10b981]">INVOICE</h1>
                <div className="text-right text-sm space-y-0.5">
                  <p className="font-bold">{adminProfile?.gymName || 'SJ fit'}</p>
                  <p>{adminProfile?.gymAddress || 'Ghansoli'}</p>
                  <p>{adminProfile?.gymEmail || 'warlucifer87@gmail.com'}</p>
                  <p>{adminProfile?.gymContactNumber || '1234567890'}</p>
                </div>
              </div>

              <div className="h-0.5 bg-[#10b981] w-full" />

              <div className="flex justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">BILL TO</p>
                  <p className="font-bold text-lg">{processedInvoices.find(i => i.id === selectedInvoice.id)?.memberName}</p>
                  <p className="text-sm">{processedInvoices.find(i => i.id === selectedInvoice.id)?.memberEmail}</p>
                  <p className="text-sm">{processedInvoices.find(i => i.id === selectedInvoice.id)?.memberPhone}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <p className="font-bold">Invoice Number:</p>
                  <p className="text-right">{selectedInvoice.invoiceNumber}</p>
                  <p className="font-bold">Issue Date:</p>
                  <p className="text-right">{selectedInvoice.issueDate}</p>
                  <p className="font-bold">Plan Expiry:</p>
                  <p className="text-right">{selectedInvoice.dueDate}</p>
                  <p className="font-bold">Status:</p>
                  <p className="text-right">{selectedInvoice.status}</p>
                </div>
              </div>

              <div className="border rounded-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-100">
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="text-black font-bold py-2">Description</TableHead>
                      <TableHead className="text-black font-bold text-right py-2">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-transparent border-none">
                      <TableCell className="py-4 text-black">{processedInvoices.find(i => i.id === selectedInvoice.id)?.planName} Membership</TableCell>
                      <TableCell className="text-right py-4 font-medium text-black">INR {selectedInvoice.totalAmount.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-end space-y-2">
                <div className="flex justify-between w-48 text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>INR {selectedInvoice.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-full bg-gray-100 p-3 mt-4">
                  <span className="font-bold">Total Due</span>
                  <span className="font-bold">INR {selectedInvoice.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-20 text-center border-t border-gray-100">
                <p className="text-xs text-gray-500 italic">Thanks for joining! Let's make every workout count.</p>
              </div>

              <div className="flex justify-end gap-2 pt-4 no-print bg-white p-4 border-t sticky bottom-0">
                <Button variant="outline" onClick={closeDialogs} className="text-black border-gray-200">Close</Button>
                <Button onClick={() => handleDownloadPdf(processedInvoices.find(i => i.id === selectedInvoice.id))} className="bg-[#10b981] hover:bg-[#059669] text-white">
                  <Download className="mr-2 h-4 w-4" /> PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'add' || activeDialog === 'edit'} onOpenChange={(isOpen) => !isOpen && closeDialogs()}><DialogContent><Form {...form}><form onSubmit={form.handleSubmit(handleSaveInvoice)} className="space-y-4"><DialogHeader><DialogTitle>{activeDialog === 'edit' ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle></DialogHeader><div className="grid gap-4"><FormField control={form.control} name="memberId" render={({ field }) => (<FormItem><FormLabel>Member</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger></FormControl><SelectContent>{members?.map((m) => <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.gymId})</SelectItem>)}</SelectContent></Select></FormItem>)} /><FormField control={form.control} name="planId" render={({ field }) => (<FormItem><FormLabel>Plan</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger></FormControl><SelectContent>{plans?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} - ₹{p.price}</SelectItem>)}</SelectContent></Select></FormItem>)} /><div className="grid grid-cols-2 gap-4"><FormField control={form.control} name="totalAmount" render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} /><FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Paid">Paid</SelectItem><SelectItem value="Overdue">Overdue</SelectItem></SelectContent></Select></FormItem>)} /></div><div className="grid grid-cols-2 gap-4"><FormField control={form.control} name="issueDate" render={({ field }) => (<FormItem><FormLabel>Issue Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} /><FormField control={form.control} name="expiryDate" render={({ field }) => (<FormItem><FormLabel>Plan Expiry</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} /></div></div><DialogFooter><Button variant="outline" onClick={closeDialogs} type="button">Cancel</Button><Button type="submit">Save</Button></DialogFooter></form></Form></DialogContent></Dialog>
    </>
  );
}
