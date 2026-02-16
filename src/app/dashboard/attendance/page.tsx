'use client';

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
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  useUser,
  useDoc,
} from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { type Attendance, type Member } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, Download, Trash2 } from 'lucide-react';
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
  date: string;
  checkInTime: string;
  status: 'Checked-in';
};

export default function AttendancePage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const adminProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );
  const { data: adminProfile, isLoading: isLoadingAdminProfile } =
    useDoc<{ gymName: string }>(adminProfileRef);

  const attendanceQuery = useMemoFirebase(
    () =>
      firestore && adminProfile?.gymName
        ? query(
            collection(firestore, 'attendance'),
            where('gymName', '==', adminProfile.gymName)
          )
        : null,
    [firestore, adminProfile]
  );
  const { data: attendanceData, isLoading: isLoadingAttendance } =
    useCollection<Attendance>(attendanceQuery);

  const membersQuery = useMemoFirebase(
    () =>
      firestore && adminProfile?.gymName
        ? query(
            collection(firestore, 'members'),
            where('gymName', '==', adminProfile.gymName)
          )
        : null,
    [firestore, adminProfile]
  );
  const { data: members, isLoading: isLoadingMembers } =
    useCollection<Member>(membersQuery);

  const form = useForm<z.infer<typeof checkInSchema>>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      memberId: '',
    },
  });

  async function handleCheckIn(values: z.infer<typeof checkInSchema>) {
    if (!firestore || !adminProfile?.gymName) {
      toast({
        title: 'Check-in Error',
        description: 'Could not determine your gym. Please sign in again.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const membersRef = collection(firestore, 'members');
      const q = query(
        membersRef,
        where('gymName', '==', adminProfile.gymName),
        where('gymId', '==', values.memberId.toUpperCase())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          title: 'Check-in Failed',
          description: `Member ID "${values.memberId}" not found in this gym. Please try again.`,
          variant: 'destructive',
        });
        return;
      }

      const memberDoc = querySnapshot.docs[0];
      const member = { ...memberDoc.data(), id: memberDoc.id } as Member;

      const attendanceRef = collection(
        firestore,
        'attendance'
      );
      addDocumentNonBlocking(attendanceRef, {
        memberId: member.id,
        checkInTime: serverTimestamp(),
        gymName: adminProfile.gymName,
      });

      toast({
        title: 'Check-in Successful!',
        description: `Welcome back, ${member.firstName} ${member.lastName}!`,
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
          date: format(checkInDate, 'yyyy-MM-dd'),
          checkInTime: format(checkInDate, 'hh:mm a'),
          status: 'Checked-in',
        };
      })
      .filter((rec): rec is AttendanceRecord => rec !== null)
      .sort(
        (a, b) =>
          new Date(b.date + ' ' + b.checkInTime).getTime() -
          new Date(a.date + ' ' + a.checkInTime).getTime()
      );
  }, [attendanceData, members]);

  const handleDownloadPdf = () => {
    if (attendanceRecords.length === 0) {
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
      head: [['Member Name', 'Member ID', 'Date', 'Check-in Time', 'Status']],
      body: attendanceRecords.map(rec => [rec.memberName, rec.memberId, rec.date, rec.checkInTime, rec.status]),
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

    if (!attendanceData) {
      toast({
        title: 'Data Not Ready',
        description: 'Attendance data is still loading. Please try again in a moment.',
        variant: 'destructive',
      });
      setIsDeleteDialogOpen(false);
      return;
    }

    // Set 'to' date to the end of the day to include all records on that day
    const fromDate = dateRange.from;
    const toDate = new Date(dateRange.to);
    toDate.setHours(23, 59, 59, 999);

    const recordsToDelete = attendanceData.filter(att => {
      const checkInDate = (att.checkInTime as Timestamp)?.toDate();
      return checkInDate && checkInDate >= fromDate && checkInDate <= toDate;
    });

    if (recordsToDelete.length === 0) {
      toast({
        title: 'No Records Found',
        description: 'There are no attendance records in the selected date range to delete.',
      });
      setIsDeleteDialogOpen(false);
      return;
    }

    try {
      const batch = writeBatch(firestore);
      recordsToDelete.forEach(record => {
        const docRef = doc(firestore, 'attendance', record.id);
        batch.delete(docRef);
      });

      await batch.commit();

      toast({
        title: 'Deletion Successful',
        description: `${recordsToDelete.length} attendance records have been permanently deleted.`,
      });
    } catch (error) {
      console.error("Error deleting attendance records:", error);
      toast({
        title: 'Deletion Failed',
        description: 'An unexpected error occurred. Please check console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDateRange(undefined);
    }
  };


  const isLoading = isLoadingAttendance || isLoadingMembers || isLoadingAdminProfile;

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
                <Button type="submit" disabled={isLoading}>Check In</Button>
              </form>
            </Form>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:gap-4">
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
              Download PDF
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
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">
                  Check-in Time
                </TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : attendanceRecords.length > 0 ? (
                attendanceRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="font-medium">{record.memberName}</div>
                    </TableCell>
                    <TableCell>{record.memberId}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {record.date}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {record.checkInTime}
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
                  <TableCell colSpan={5} className="text-center">
                    No attendance records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all attendance records from <strong>{dateRange?.from ? format(dateRange.from, 'PPP') : ''}</strong> to <strong>{dateRange?.to ? format(dateRange.to, 'PPP') : ''}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteByDateRange}>
              Yes, delete records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
