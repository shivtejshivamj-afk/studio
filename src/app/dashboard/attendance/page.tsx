'use client';

import {
  attendance as initialAttendance,
  members,
  type Attendance,
} from '@/lib/data';
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
import { useState } from 'react';
import { format } from 'date-fns';

const statusVariant = {
  'Checked-in': 'default',
  Absent: 'secondary',
} as const;

const checkInSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required.'),
});

export default function AttendancePage() {
  const [attendanceRecords, setAttendanceRecords] =
    useState<Attendance[]>(initialAttendance);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof checkInSchema>>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      memberId: '',
    },
  });

  function handleCheckIn(values: z.infer<typeof checkInSchema>) {
    const member = members.find(
      (m) => m.memberId.toUpperCase() === values.memberId.toUpperCase()
    );

    if (member) {
      const now = new Date();
      const newRecord: Attendance = {
        id: `att${Date.now()}`,
        memberId: member.memberId,
        memberName: member.name,
        date: format(now, 'yyyy-MM-dd'),
        checkInTime: format(now, 'hh:mm a'),
        status: 'Checked-in',
      };
      setAttendanceRecords((prev) => [newRecord, ...prev]);
      toast({
        title: 'Check-in Successful!',
        description: `Welcome back, ${member.name}!`,
      });
    } else {
      toast({
        title: 'Check-in Failed',
        description: `Member ID "${values.memberId}" not found. Please try again.`,
        variant: 'destructive',
      });
    }
    form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>
              View and manage member attendance records.
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
              <Button type="submit">Check In</Button>
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
            {attendanceRecords.map((record) => (
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
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
