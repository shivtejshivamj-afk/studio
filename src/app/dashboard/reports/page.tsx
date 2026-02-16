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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileText } from 'lucide-react';
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
  useDoc,
} from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Invoice, Member } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

const statusVariant = {
  Paid: 'default',
} as const;

export default function ReportsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const adminProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );
  const { data: adminProfile, isLoading: isLoadingAdminProfile } =
    useDoc<{ gymName: string }>(adminProfileRef);

  const invoicesQuery = useMemoFirebase(
    () =>
      firestore && adminProfile?.gymName
        ? query(
            collection(firestore, 'invoices'),
            where('gymName', '==', adminProfile.gymName),
            where('status', '==', 'Paid')
          )
        : null,
    [firestore, adminProfile]
  );
  const { data: paidInvoices, isLoading: isLoadingInvoices } =
    useCollection<Invoice>(invoicesQuery);

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

  const { totalRevenue, invoicesWithMemberNames, monthlyRevenue } =
    useMemo(() => {
      if (!paidInvoices || !members) {
        return {
          totalRevenue: 0,
          invoicesWithMemberNames: [],
          monthlyRevenue: [],
        };
      }

      const total = paidInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);

      const invoices = paidInvoices.map((inv) => {
        const member = members.find((m) => m.id === inv.memberId);
        return {
          ...inv,
          memberName: member
            ? `${member.firstName} ${member.lastName}`
            : 'Unknown Member',
        };
      });

      const revenueByMonth: { [key: string]: number } = {};
      paidInvoices.forEach((invoice) => {
        try {
          const month = format(parseISO(invoice.issueDate), 'MMM yyyy');
          if (revenueByMonth[month]) {
            revenueByMonth[month] += invoice.totalAmount;
          } else {
            revenueByMonth[month] = invoice.totalAmount;
          }
        } catch (e) {
          console.error(`Invalid date format for invoice ${invoice.id}: ${invoice.issueDate}`);
        }
      });

      const chartData = Object.entries(revenueByMonth)
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => (new Date(a.name) > new Date(b.name) ? 1 : -1));

      return {
        totalRevenue: total,
        invoicesWithMemberNames: invoices,
        monthlyRevenue: chartData,
      };
    }, [paidInvoices, members]);

  const isLoading =
    isLoadingAdminProfile || isLoadingInvoices || isLoadingMembers;

  const chartConfig = {
    revenue: {
      label: 'Revenue',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Financial Reports</CardTitle>
          <CardDescription>
            An overview of your gym's income for{' '}
            {adminProfile?.gymName || 'your gym'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <div className="text-2xl font-bold">
                    ${totalRevenue.toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Paid Invoices
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">
                    {paidInvoices?.length || 0}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue</CardTitle>
          <CardDescription>
            A summary of revenue collected per month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : monthlyRevenue.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <BarChart
                data={monthlyRevenue}
                margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(value) => `$${value}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[350px] items-center justify-center text-muted-foreground">
              No revenue data available to display.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paid Invoices Details</CardTitle>
          <CardDescription>
            A detailed list of all paid invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : invoicesWithMemberNames.length > 0 ? (
                invoicesWithMemberNames.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>{invoice.memberName}</TableCell>
                    <TableCell>{invoice.issueDate}</TableCell>
                    <TableCell>${invoice.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={statusVariant[invoice.status]}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No paid invoices found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
