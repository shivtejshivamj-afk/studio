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
} from 'firebase/firestore';
import { type Attendance, type Member } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

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

  const isLoading = isLoadingAttendance || isLoadingMembers || isLoadingAdminProfile;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
  );
}

    