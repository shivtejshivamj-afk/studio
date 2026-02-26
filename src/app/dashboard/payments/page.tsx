
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useState, useMemo, useEffect } from 'react';
import { format, parseISO, addDays, isPast, startOfDay, endOfDay } from 'date-fns';
import jsPDF from 'jspdf';
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

  const { user } = useAuthUser();
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

  useEffect(() => {
    if (selectedPlanId && plans) {
      const plan = plans.find(p => p.id === selectedPlanId);
      if (plan) {
        form.setValue('totalAmount', plan.price);
      }
    }
  }, [selectedPlanId, plans, form]);

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
    const today = startOfDay(new Date());

    return invoicesData.map(inv => {
      const member = members.find(m => m.id === inv.memberId);
      const plan = plans.find(p => p.id === inv.membershipId || p.id === (inv as any).planId);
      
      let displayStatus = inv.status;
      if (inv.status === 'Pending' && inv.dueDate && isPast(endOfDay(parseISO(inv.dueDate)))) {
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
        planId: invoice.membershipId || (invoice as any).planId || '',
        status: invoice.status,
        totalAmount: invoice.totalAmount,
      });
    } else if (dialog === 'add') {
      form.reset({
        memberId: '',
        planId: '',
        status: 'Pending',
        totalAmount: 0,
      });
    }
  };

  const closeDialogs = () => {
    setActiveDialog(null);
    setSelectedInvoice(null);
  };

  const processPaidInvoice = (member: Member, plan: MembershipPlan, existingMembershipId?: string) => {
    if (!firestore) return null;
    
    let startDate = startOfDay(new Date());
    if (member.membershipEndDate) {
      const currentExpiry = parseISO(member.membershipEndDate);
      // If the current expiry is in the future, start the new duration from then (renewal)
      if (!isPast(endOfDay(currentExpiry))) {
        startDate = currentExpiry;
      }
    }

    const endDate = addDays(startDate, plan.durationInDays);
    const membershipId = existingMembershipId || doc(collection(firestore, 'members', member.id, 'memberships')).id;
    const membershipRef = doc(firestore, 'members', member.id, 'memberships', membershipId);

    const membershipData: Membership = {
      id: membershipId,
      memberId: member.id,
      planId: plan.id,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      status: 'active',
      priceAtPurchase: plan.price,
      autoRenew: false,
    };

    setDocumentNonBlocking(membershipRef, membershipData, { merge: true });

    const memberDocRef = doc(firestore, 'members', member.id);
    updateDocumentNonBlocking(memberDocRef, {
      membershipEndDate: format(endDate, 'yyyy-MM-dd'),
      activePlanId: plan.id,
      isActive: true,
    });

    return membershipId;
  };

  const handleSaveInvoice = (values: InvoiceFormValues) => {
    if (!firestore || !members || !adminProfile?.gymName || !adminProfile.gymIdentifier || !plans) {
        toast({
            title: 'Cannot Create Invoice',
            description: "Could not determine your gym.",
            variant: 'destructive',
        });
        return;
    }
    
    const member = members.find((m) => m.id === values.memberId);
    const plan = plans.find((p) => p.id === values.planId);

    if (!member || !plan) return;
    
    if (activeDialog === 'add') {
      const newDocRef = doc(collection(firestore, 'invoices'));
      const issueDate = format(new Date(), 'yyyy-MM-dd');
      const dueDate = format(addDays(new Date(), 15), 'yyyy-MM-dd');

      let membershipId = '';
      if (values.status === 'Paid') {
        membershipId = processPaidInvoice(member, plan) || '';
      }

      const newInvoiceData: Invoice = {
        id: newDocRef.id,
        invoiceNumber: `INV-${String((totalRecords || 0) + 1).padStart(3, '0')}`,
        memberId: member.id,
        membershipId: membershipId || plan.id, 
        totalAmount: values.totalAmount,
        issueDate: issueDate,
        dueDate: dueDate,
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
      
      const becomingPaid = values.status === 'Paid' && selectedInvoice.status !== 'Paid';
      const correctingPaid = values.status === 'Paid' && selectedInvoice.status === 'Paid' && (values.planId !== selectedInvoice.membershipId);

      let membershipId = selectedInvoice.membershipId;
      if (becomingPaid || correctingPaid) {
        membershipId = processPaidInvoice(member, plan, selectedInvoice.membershipId) || '';
      }

      const updatedData: Partial<Invoice> = {
        memberId: values.memberId,
        membershipId: membershipId || values.planId,
        status: values.status,
        totalAmount: values.totalAmount,
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
    
    if (status === 'Paid' && invoice.status !== 'Paid') {
      const member = members.find(m => m.id === invoice.memberId);
      const plan = plans.find(p => p.id === invoice.membershipId || p.id === (invoice as any).planId);
      if (member && plan) {
          const membershipId = processPaidInvoice(member, plan);
          updateDocumentNonBlocking(doc(firestore, 'invoices', invoice.id), { 
            status, 
            membershipId: membershipId || invoice.membershipId 
          });
      }
    } else {
      updateDocumentNonBlocking(doc(firestore, 'invoices', invoice.id), { status });
    }

    toast({
      title: 'Invoice Status Updated',
      description: `Invoice ${invoice.invoiceNumber} has been marked as ${status}.`,
    });
  };

  const handleDownloadPdf = (invoiceToDownload: Invoice) => {
    if (!invoiceToDownload) return;

    const doc = new jsPDF();
    const currencyPrefix = 'INR ';
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const primaryColor = [48, 213, 118];
    const lightGrayColor = [240, 240, 240];
    const darkGrayColor = [50, 50, 50];
    const grayColor = [128, 128, 128];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('INVOICE', margin, 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(darkGrayColor[0], darkGrayColor[1], darkGrayColor[2]);
    let rightColY = 20;
    if (adminProfile?.gymName) {
      doc.setFont('helvetica', 'bold');
      const nameLines = doc.splitTextToSize(adminProfile.gymName, 70);
      doc.text(nameLines, pageWidth - margin, rightColY, { align: 'right' });
      rightColY += (nameLines.length * 5);
      doc.setFont('helvetica', 'normal');
    }
    if (adminProfile?.gymAddress) {
       const addressLines = doc.splitTextToSize(adminProfile.gymAddress, 70);
      doc.text(addressLines, pageWidth - margin, rightColY, { align: 'right' });
      rightColY += (addressLines.length * 5);
    }
    if (adminProfile?.gymEmail) {
      doc.text(adminProfile.gymEmail, pageWidth - margin, rightColY, { align: 'right' });
      rightColY += 5;
    }
    if (adminProfile?.gymContactNumber) {
      doc.text(adminProfile.gymContactNumber, pageWidth - margin, rightColY, { align: 'right' });
    }

    const headerBottomY = Math.max(rightColY, 30) + 15;
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.8);
    doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);

    let detailsY = headerBottomY + 12;
    doc.setFontSize(10);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('BILL TO', margin, detailsY);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGrayColor[0], darkGrayColor[1], darkGrayColor[2]);
    const memberNameLines = doc.splitTextToSize(invoiceToDownload.memberName || 'N/A', 80);
    doc.text(memberNameLines, margin, detailsY + 7);
    let memberDetailsY = detailsY + 7 + (memberNameLines.length * 5);
    
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceToDownload.memberEmail || 'N/A', margin, memberDetailsY);
    memberDetailsY += 5;
    if (invoiceToDownload.memberPhone) {
      doc.text(invoiceToDownload.memberPhone, margin, memberDetailsY);
    }
    
    const detailsRightX = pageWidth - margin;
    const detailsLeftX = pageWidth - 70;

    const drawDetailRow = (y: number, label: string, value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(darkGrayColor[0], darkGrayColor[1], darkGrayColor[2]);
        doc.text(label, detailsLeftX, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text(value, detailsRightX, y, { align: 'right' });
    };
    
    drawDetailRow(detailsY, 'Invoice Number:', invoiceToDownload.invoiceNumber);
    drawDetailRow(detailsY + 7, 'Issue Date:', invoiceToDownload.issueDate);
    drawDetailRow(detailsY + 14, 'Due Date:', invoiceToDownload.dueDate);
    drawDetailRow(detailsY + 21, 'Status:', invoiceToDownload.status);

    const tableStartY = Math.max(memberDetailsY, detailsY + 21) + 20;
    autoTable(doc, {
      startY: tableStartY,
      head: [['Description', 'Amount']],
      body: [
        [`${invoiceToDownload.planName || 'Unknown Plan'} Membership`, `${currencyPrefix}${invoiceToDownload.totalAmount.toFixed(2)}`],
      ],
      theme: 'grid',
      styles: { font: 'helvetica', textColor: darkGrayColor, lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: lightGrayColor, textColor: darkGrayColor, fontStyle: 'bold', fontSize: 10 },
      didDrawPage: (data) => {
        const finalY = (data.cursor?.y || 0) + 10;
        const totalX = pageWidth - margin;
        doc.setFontSize(10);
        doc.text('Subtotal', totalX - 40, finalY + 5, { align: 'right' });
        doc.text(`${currencyPrefix}${invoiceToDownload.totalAmount.toFixed(2)}`, totalX, finalY + 5, { align: 'right' });
        doc.setFillColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2]);
        doc.rect(pageWidth / 2 - 1, finalY + 10, pageWidth / 2 + 1, 12, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Total Due', totalX - 40, finalY + 17.5, { align: 'right' });
        doc.text(`${currencyPrefix}${invoiceToDownload.totalAmount.toFixed(2)}`, totalX, finalY + 17.5, { align: 'right' });
        const footerY = pageHeight - 20;
        doc.setDrawColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2]);
        doc.line(margin, footerY, pageWidth - margin, footerY);
        doc.setFontSize(9);
        doc.text('Thanks for joining! Let’s make every workout count.', pageWidth / 2, footerY + 8, { align: 'center' });
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
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Amount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" readOnly {...field} />
                      </FormControl>
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
        <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh] bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>Review the invoice details below.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2">
            {selectedInvoice && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">INVOICE</h1>
                    <p className="text-muted-foreground">{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <h2 className="text-2xl font-semibold text-foreground break-words max-w-full">{adminProfile?.gymName}</h2>
                    {adminProfile?.gymAddress && <p className="text-muted-foreground break-words max-w-xs">{adminProfile.gymAddress}</p>}
                    {adminProfile?.gymEmail && <p className="text-muted-foreground break-words max-w-full">{adminProfile.gymEmail}</p>}
                    {adminProfile?.gymContactNumber && <p className="text-muted-foreground">{adminProfile.gymContactNumber}</p>}
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold text-muted-foreground mb-2">BILL TO</h3>
                    <p className="font-bold text-foreground">{selectedInvoice.memberName}</p>
                    <p className="text-muted-foreground break-words">{selectedInvoice.memberEmail}</p>
                    {selectedInvoice.memberPhone && <p className="text-muted-foreground">{selectedInvoice.memberPhone}</p>}
                  </div>
                  <div className="space-y-2 text-left sm:text-right">
                    <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center sm:gap-4">
                      <p className="font-semibold text-muted-foreground text-nowrap">Invoice Number:</p>
                      <p className="text-foreground">{selectedInvoice.invoiceNumber}</p>
                    </div>
                     <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center sm:gap-4">
                      <p className="font-semibold text-muted-foreground text-nowrap">Issue Date:</p>
                      <p className="text-foreground">{selectedInvoice.issueDate}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center sm:gap-4">
                      <p className="font-semibold text-muted-foreground text-nowrap">Due Date:</p>
                      <p className="text-foreground">{selectedInvoice.dueDate}</p>
                    </div>
                     <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center sm:gap-4">
                      <p className="font-semibold text-muted-foreground">Status:</p>
                       <Badge variant={statusVariant[selectedInvoice.status]}>
                        {selectedInvoice.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="text-right font-semibold">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">{selectedInvoice.planName} Membership</TableCell>
                      <TableCell className="text-right">₹{selectedInvoice.totalAmount.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="flex justify-end">
                    <div className="w-full sm:w-64">
                        <div className="flex justify-between text-muted-foreground">
                            <p>Subtotal</p>
                            <p>₹{selectedInvoice.totalAmount.toFixed(2)}</p>
                        </div>
                        <Separator className="my-2"/>
                         <div className="flex justify-between font-bold text-foreground text-lg">
                            <p>Total</p>
                            <p>₹{selectedInvoice.totalAmount.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="pt-4 border-t">
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
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function useAuthUser() {
  const { user, isUserLoading, userError } = useUser();
  return { user, isUserLoading, userError };
}
