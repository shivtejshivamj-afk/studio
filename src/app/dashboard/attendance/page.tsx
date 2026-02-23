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
  setDocumentNonBlocking,
  useUser,
  useDoc,
} from '@/firebase';
import {
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp,
  doc,
  writeBatch,
  getDoc,
  getCountFromServer,
  onSnapshot,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { type Attendance, type Member, type PublicMemberProfile } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    CalendarIcon, 
    Download, 
    Trash2,
    ChevronLeft,
    ChevronRight,
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
  const { data: members, isLoading: isLoadingMembers } =
    useMemoFirebase(() => useCollection<Member>(membersQuery), [membersQuery]);

  useEffect(() => {
    if (!firestore || !adminProfile?.gymIdentifier) return;

    const fetchCount = async () => {
        let countQuery = query(
            collection(firestore, 'attendance'),
            where('gymIdentifier', '==', adminProfile.gymIdentifier)
        );
        // Apply date range filter to count query as well
        if (dateRange?.from) {
            countQuery = query(countQuery, where('checkInTime', '>=', dateRange.from));
        }
        if (dateRange?.to) {
            countQuery = query(countQuery, where('checkInTime', '<=', dateRange.to));
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

    if (dateRange?.from) {
      q = query(q, where('checkInTime', '>=', dateRange.from));
    }
    if (dateRange?.to) {
        // To include the whole day, set time to end of day
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        q = query(q, where('checkInTime', '<=', toDate));
    }

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
            description: "The query for attendance records needs a database index. Please check the developer console for a direct link to create it in Firebase.",
            variant: "destructive",
            duration: 15000,
          });
      } else {
        toast({ title: "Error", description: `Could not fetch attendance records. ${error.message}`, variant: "destructive"});
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, adminProfile, dateRange, page, pageCursors]);

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
        description: 'Could not determine your gym. Please sign in again.',
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
          description: `Member ID "${values.memberId}" not found. Please try again.`,
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
          description: `The membership for ${publicProfile.firstName} ${publicProfile.lastName} is inactive. Please contact the front desk.`,
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
        description: `Welcome back, ${publicProfile.firstName} ${publicProfile.lastName}!`,
      });
    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: 'Check-in Error',
        description:
          'An error occurred while checking in the member. Please try again.',
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
    // This will only download the current page. A full report download would require fetching all data.
    if (filteredAttendanceRecords.length === 0) {
      toast({
        title: 'No Data',
        description: 'There are no attendance records to download on the current page.',
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

  const handleDeleteByDateRange = async () => {
    if (!firestore || !adminProfile?.gymName || !dateRange?.from || !dateRange?.to) {
      toast({
        title: 'Deletion Error',
        description: 'Please select a valid date range to delete records.',
        variant: 'destructive',
      });
      return;
    }

    // Logic to delete documents in a range requires a backend function for safety and scale.
    // The current client-side implementation can timeout or fail on large datasets.
    // For now, we are warning the user.
    toast({
        title: "Deletion Not Implemented",
        description: "Bulk deletion from the client is disabled for security and performance reasons. Please contact support for bulk data operations.",
        variant: "destructive",
    });
    setIsDeleteDialogOpen(false);
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
            <Button variant="outline" size="sm" className="gap-1" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4" />
              Download Page
            </Button>
            <Button variant="destructive" size="sm" className="gap-1" onClick={() => setIsDeleteDialogOpen(true)} disabled={!dateRange?.from || !dateRange?.to}>
              <Trash2 className="h-4 w-4" />
              Delete Range
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Member ID</TableHead>
                <TableHead>Check-in Time</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDataLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredAttendanceRecords.length > 0 ? (
                filteredAttendanceRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="font-medium">{record.memberName}</div>
                    </TableCell>
                    <TableCell>{record.memberId}</TableCell>
                    <TableCell>
                      {record.checkIn}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={statusVariant[record.status]}>
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
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
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Bulk deletion has been disabled on the client. Please contact support for this functionality.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setIsDeleteDialogOpen(false)}>
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
