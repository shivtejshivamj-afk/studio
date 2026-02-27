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
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import {
  useFirestore,
  useMemoFirebase,
  useUser,
  useDoc,
  useCollection,
  deleteDocumentNonBlocking,
  setDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp,
  doc,
  orderBy,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { type Attendance, type Member, type PublicMemberProfile } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Download, 
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Trash2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
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
  rawTime: Date;
};

const ATTENDANCE_PER_PAGE = 10;

export default function AttendancePage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSingleDeleteDialogOpen, setIsSingleDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  const attendanceQuery = useMemoFirebase(
    () =>
      firestore && adminProfile?.gymIdentifier
        ? query(
            collection(firestore, 'attendance'),
            where('gymIdentifier', '==', adminProfile.gymIdentifier),
            orderBy('checkInTime', 'desc')
          )
        : null,
    [firestore, adminProfile]
  );
  const { data: allAttendance, isLoading: isLoadingAttendance } = useCollection<Attendance>(attendanceQuery);

  const form = useForm<z.infer<typeof checkInSchema>>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      memberId: '',
    },
  });

  const attendanceRecords: AttendanceRecord[] = useMemo(() => {
    if (!allAttendance || !members) return [];

    return allAttendance
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
          rawTime: checkInDate,
        };
      })
      .filter((rec): rec is AttendanceRecord => rec !== null);
  }, [allAttendance, members]);

  const filteredAttendanceRecords = useMemo(() => {
    let filtered = attendanceRecords;

    // Filter by Date Range
    if (date?.from && date?.to) {
      filtered = filtered.filter(rec => 
        isWithinInterval(rec.rawTime, { 
          start: startOfDay(date.from!), 
          end: endOfDay(date.to!) 
        })
      );
    } else if (date?.from) {
      filtered = filtered.filter(rec => rec.rawTime >= startOfDay(date.from!));
    }

    // Filter by Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(rec => 
        rec.memberName.toLowerCase().includes(q) || 
        rec.memberId.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [attendanceRecords, date, searchQuery]);

  const totalPages = Math.ceil(filteredAttendanceRecords.length / ATTENDANCE_PER_PAGE);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ATTENDANCE_PER_PAGE;
    return filteredAttendanceRecords.slice(start, start + ATTENDANCE_PER_PAGE);
  }, [filteredAttendanceRecords, currentPage]);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
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
      
      if (!publicProfile.isActive) {
        toast({
          title: 'Check-in Failed',
          description: `Membership for ${publicProfile.firstName} is inactive.`,
          variant: 'destructive',
        });
        return;
      }

      const checkInDateStr = format(new Date(), 'yyyy-MM-dd');
      const attendanceDocId = `${publicProfile.memberDocId}_${checkInDateStr}`;
      const attendanceDocRef = doc(firestore, 'attendance', attendanceDocId);

      // Check if already checked in
      const existingSnap = await getDoc(attendanceDocRef);
      if (existingSnap.exists()) {
        toast({
          title: 'Already Checked In',
          description: `${publicProfile.firstName} is already checked in for today.`,
          variant: 'destructive',
        });
        return;
      }

      const attendanceRecord: Attendance = {
        id: attendanceDocId,
        memberId: publicProfile.memberDocId, 
        checkInTime: serverTimestamp(),
        gymName: publicProfile.gymName,
        gymIdentifier: publicProfile.gymIdentifier,
        memberGymId: publicProfileSnap.id,
      };

      setDocumentNonBlocking(attendanceDocRef, attendanceRecord, {});

      toast({
        title: 'Check-in Successful!',
        description: `Welcome, ${publicProfile.firstName}!`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Check-in Error',
        description: 'An error occurred while checking in.',
        variant: 'destructive',
      });
    }

    form.reset();
  }

  const handleDeleteSingle = (record: AttendanceRecord) => {
    setRecordToDelete(record);
    setIsSingleDeleteDialogOpen(true);
  };

  const handleConfirmSingleDelete = () => {
    if (recordToDelete && firestore) {
      deleteDocumentNonBlocking(doc(firestore, 'attendance', recordToDelete.id));
      toast({
        title: 'Record Deleted',
        description: `Attendance record for ${recordToDelete.memberName} has been deleted.`,
      });
      setIsSingleDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  async function handleDeleteRange() {
    if (!firestore || !adminProfile?.gymIdentifier || !date?.from || !date?.to) return;

    setIsDeleting(true);
    try {
      const q = query(
        collection(firestore, 'attendance'),
        where('gymIdentifier', '==', adminProfile.gymIdentifier),
        where('checkInTime', '>=', Timestamp.fromDate(startOfDay(date.from))),
        where('checkInTime', '<=', Timestamp.fromDate(endOfDay(date.to)))
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast({
          title: 'No Records Found',
          description: 'No attendance records found for the selected range.',
        });
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
        return;
      }

      snapshot.docs.forEach((doc) => {
        deleteDocumentNonBlocking(doc.ref);
      });

      toast({
        title: 'Deletion Started',
        description: `Successfully started deleting ${snapshot.size} records.`,
      });
      
      setCurrentPage(1);
    } catch (error) {
      console.error('Error deleting range:', error);
      toast({
        title: 'Deletion Failed',
        description: 'An error occurred while deleting the records.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  }

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    doc.text(`Attendance Report`, 14, 16);
    autoTable(doc, {
      startY: 20,
      head: [['Member Name', 'Member ID', 'Check-in Time', 'Status']],
      body: filteredAttendanceRecords.map(rec => [rec.memberName, rec.memberId, rec.checkIn, rec.status]),
    });
    doc.save(`attendance.pdf`);
  };

  const isDataLoading = isLoadingAttendance || isLoadingAdminProfile || isLoadingMembers;

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
            <div className="grid gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={'outline'}
                    className={cn(
                      'w-full sm:w-[260px] justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, 'LLL dd, y')} -{' '}
                          {format(date.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(date.from, 'LLL dd, y')
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
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={(val) => {
                      setDate(val);
                      setCurrentPage(1);
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Input
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:max-w-xs"
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4" />
                  Download
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                className="gap-1" 
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={!date?.from || !date?.to}
              >
                  <Trash2 className="h-4 w-4" />
                  Delete Range
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
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
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedRecords.length > 0 ? (
                paginatedRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="font-medium">{record.memberName}</div>
                    </TableCell>
                    <TableCell>{record.memberId}</TableCell>
                    <TableCell>{record.checkIn}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[record.status]}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSingle(record)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
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
                    Showing {paginatedRecords.length} of {filteredAttendanceRecords.length} records (Page {currentPage} of {totalPages || 1})
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPrevPage}
                        disabled={currentPage <= 1}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage >= totalPages}
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
              This will permanently delete all attendance records from{' '}
              <span className="font-bold">
                {date?.from ? format(date.from, 'PPP') : ''}
              </span>{' '}
              to{' '}
              <span className="font-bold">
                {date?.to ? format(date.to, 'PPP') : ''}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteRange();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Range'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isSingleDeleteDialogOpen} onOpenChange={setIsSingleDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attendance Record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the check-in record for{' '}
              <span className="font-bold">{recordToDelete?.memberName}</span> at{' '}
              <span className="font-bold">{recordToDelete?.checkIn}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSingleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
