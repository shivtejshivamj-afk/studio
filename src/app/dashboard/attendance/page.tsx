'use client';

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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useState, useMemo, useEffect } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import {
  useFirestore,
  useMemoFirebase,
  useUser,
  useDoc,
  useCollection,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp,
  doc,
  getCountFromServer,
  onSnapshot,
  orderBy,
  limit,
  startAfter,
  getDoc,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { type Attendance, type Member, type PublicMemberProfile } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    CalendarIcon, 
    Download, 
    ChevronLeft,
    ChevronRight,
    Trash2,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
import { Checkbox } from '@/components/ui/checkbox';
import { type DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const statusVariant = {
  'Checked-in': 'default',
} as const;

const checkInSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required.'),
});

type AttendanceRecord = {
  id: string;
  memberId: string;
  memberName: string;
  checkIn: string;
  status: 'Checked-in';
};

const ATTENDANCE_PER_PAGE = 10;

export default function AttendancePage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  // Pagination State
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<(QueryDocumentSnapshot | null)[]>([null]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);

  const adminProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );
  const { data: adminProfile, isLoading: isLoadingAdminProfile } =
    useDoc<{ gymName: string, gymIdentifier: string }>(adminProfileRef);

  const membersQuery = useMemoFirebase(
    () =>
      firestore && adminProfile?.gymIdentifier
        ? query(
            collection(firestore, 'members'),
            where('gymIdentifier', '==', adminProfile.gymIdentifier)
          )
        : null,
    [firestore, adminProfile]
  );
  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersQuery);

  useEffect(() => {
    if (!firestore || !adminProfile?.gymIdentifier) return;

    const fetchCount = async () => {
        let countQuery = query(
            collection(firestore, 'attendance'),
            where('gymIdentifier', '==', adminProfile.gymIdentifier)
        );
        if (dateRange?.from) {
            countQuery = query(countQuery, where('checkInTime', '>=', startOfDay(dateRange.from)));
        }
        if (dateRange?.to) {
            countQuery = query(countQuery, where('checkInTime', '<=', endOfDay(dateRange.to)));
        }
        const snapshot = await getCountFromServer(countQuery);
        setTotalRecords(snapshot.data().count);
    };

    fetchCount();
  }, [firestore, adminProfile, dateRange]);


  useEffect(() => {
    if (!firestore || !adminProfile?.gymIdentifier) return;
    
    setIsLoading(true);
    const cursor = pageCursors[page - 1];

    let q = query(
      collection(firestore, 'attendance'),
      where('gymIdentifier', '==', adminProfile.gymIdentifier),
      orderBy('checkInTime', 'desc')
    );

    if (cursor) {
      q = query(q, startAfter(cursor), limit(ATTENDANCE_PER_PAGE));
    } else {
      q = query(q, limit(ATTENDANCE_PER_PAGE));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Attendance));
      setAttendanceData(data);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setIsLoading(false);
    }, (error) => {
      console.error('Failed to fetch attendance data:', error);
      if (error.code === 'failed-precondition') {
          toast({
            title: "Database Index Required",
            description: "The query for attendance records needs a database index.",
            variant: "destructive",
            duration: 15000,
          });
      } else {
        toast({ title: "Error", description: `Could not fetch attendance records. ${error.message}`, variant: "destructive"});
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, adminProfile, dateRange, page, pageCursors, toast]);

  const form = useForm<z.infer<typeof checkInSchema>>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      memberId: '',
    },
  });

  const totalPages = Math.ceil(totalRecords / ATTENDANCE_PER_PAGE);

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

  async function handleCheckIn(values: z.infer<typeof checkInSchema>) {
    if (!firestore || !adminProfile?.gymName || !adminProfile?.gymIdentifier) {
      toast({
        title: 'Check-in Error',
        description: 'Could not determine your gym.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const memberPublicId = values.memberId.toUpperCase();
      const publicProfileRef = doc(firestore, 'member_profiles_public', memberPublicId);
      const publicProfileSnap = await getDoc(publicProfileRef);

      if (!publicProfileSnap.exists()) {
        toast({
          title: 'Check-in Failed',
          description: `Member ID "${values.memberId}" not found.`,
          variant: 'destructive',
        });
        return;
      }

      const publicProfile = publicProfileSnap.data() as PublicMemberProfile;
      
      if (publicProfile.gymIdentifier !== adminProfile.gymIdentifier) {
          toast({
              title: 'Check-in Failed',
              description: `This member does not belong to your gym.`,
              variant: 'destructive',
          });
          return;
      }
      
      if (!publicProfile.isActive) {
        toast({
          title: 'Check-in Failed',
          description: `Membership for ${publicProfile.firstName} ${publicProfile.lastName} is inactive.`,
          variant: 'destructive',
        });
        return;
      }

      const checkInDateStr = format(new Date(), 'yyyy-MM-dd');
      const attendanceDocId = `${publicProfile.memberDocId}_${checkInDateStr}`;
      const attendanceDocRef = doc(firestore, 'attendance', attendanceDocId);
      const attendanceDocSnap = await getDoc(attendanceDocRef);

      if (attendanceDocSnap.exists()) {
        toast({
          title: 'Already Checked In',
          description: `${publicProfile.firstName} ${publicProfile.lastName} has already checked in today.`,
        });
        form.reset();
        return;
      }

      setDocumentNonBlocking(attendanceDocRef, {
        id: attendanceDocId,
        memberId: publicProfile.memberDocId, 
        checkInTime: serverTimestamp(),
        gymName: publicProfile.gymName,
        gymIdentifier: publicProfile.gymIdentifier,
        memberGymId: publicProfileSnap.id,
      }, {});

      toast({
        title: 'Check-in Successful!',
        description: `Welcome, ${publicProfile.firstName} ${publicProfile.lastName}!`,
      });
    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: 'Check-in Error',
        description: 'An error occurred while checking in.',
        variant: 'destructive',
      });
    }

    form.reset();
  }

  const attendanceRecords: AttendanceRecord[] = useMemo(() => {
    if (!attendanceData || !members) return [];

    return attendanceData
      .map((att) => {
        const member = members.find((m) => m.id === att.memberId);
        if (!member) return null;

        const checkInDate = (att.checkInTime as Timestamp)?.toDate();
        if (!checkInDate) return null;

        return {
          id: att.id,
          memberId: member.gymId,
          memberName: `${member.firstName} ${member.lastName}`,
          checkIn: format(checkInDate, 'PP, p'),
          status: 'Checked-in',
        };
      })
      .filter((rec): rec is AttendanceRecord => rec !== null);
  }, [attendanceData, members]);

  const filteredAttendanceRecords = useMemo(() => {
    if (!searchQuery) return attendanceRecords;
    const lowercasedQuery = searchQuery.toLowerCase();
    return attendanceRecords.filter(record =>
      record.memberName.toLowerCase().includes(lowercasedQuery) ||
      record.memberId.toLowerCase().includes(lowercasedQuery)
    );
  }, [attendanceRecords, searchQuery]);

  const handleDownloadPdf = () => {
    if (filteredAttendanceRecords.length === 0) {
      toast({
        title: 'No Data',
        description: 'There are no attendance records to download.',
      });
      return;
    }

    const doc = new jsPDF();
    doc.text(`Attendance Report - ${adminProfile?.gymName || 'GymTrack Pro'}`, 14, 16);
    
    autoTable(doc, {
      startY: 20,
      head: [['Member Name', 'Member ID', 'Check-in Time', 'Status']],
      body: filteredAttendanceRecords.map(rec => [rec.memberName, rec.memberId, rec.checkIn, rec.status]),
    });

    doc.save(`attendance-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDeleteRecord = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'attendance', id);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: 'Record Deleted',
      description: 'The attendance record has been deleted.',
      variant: 'destructive',
    });
    setRecordToDelete(null);
  };

  const handleBulkDelete = () => {
    if (!firestore || selectedRecords.length === 0) return;
    
    selectedRecords.forEach(id => {
      const docRef = doc(firestore, 'attendance', id);
      deleteDocumentNonBlocking(docRef);
    });

    toast({
      title: 'Records Deleted',
      description: `${selectedRecords.length} attendance records have been deleted.`,
      variant: 'destructive',
    });
    setSelectedRecords([]);
    setIsBulkDeleteDialogOpen(false);
  };

  const toggleSelectAll = () => {
    if (selectedRecords.length === filteredAttendanceRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredAttendanceRecords.map(r => r.id));
    }
  };

  const toggleSelectRecord = (id: string) => {
    setSelectedRecords(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isDataLoading = isLoading || isLoadingAdminProfile || isLoadingMembers;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Attendance</CardTitle>
              <CardDescription>
                View and manage member attendance records for {adminProfile?.gymName || 'your gym'}.
              </CardDescription>
            </div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleCheckIn)}
                className="flex w-full max-w-sm items-start gap-2"
              >
                <FormField
                  control={form.control}
                  name="memberId"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Enter Member ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isDataLoading}>Check In</Button>
              </form>
            </Form>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:gap-4">
            <Input
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:max-w-xs"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[260px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={handleDownloadPdf}>
                    <Download className="h-4 w-4" />
                    Download Page
                </Button>
                {selectedRecords.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="gap-1"
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected ({selectedRecords.length})
                  </Button>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={selectedRecords.length > 0 && selectedRecords.length === filteredAttendanceRecords.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Member ID</TableHead>
                <TableHead>Check-in Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDataLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-8 ml-auto rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredAttendanceRecords.length > 0 ? (
                filteredAttendanceRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedRecords.includes(record.id)}
                        onCheckedChange={() => toggleSelectRecord(record.id)}
                        aria-label={`Select ${record.memberName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{record.memberName}</div>
                    </TableCell>
                    <TableCell>{record.memberId}</TableCell>
                    <TableCell>
                      {record.checkIn}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[record.status]}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRecordToDelete(record.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No attendance records found.
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

      {/* Bulk Delete Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You are about to delete {selectedRecords.length} attendance records permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Delete Dialog */}
      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attendance Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this check-in record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => recordToDelete && handleDeleteRecord(recordToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}