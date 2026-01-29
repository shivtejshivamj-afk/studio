'use client';

import { payments as initialPayments } from '@/lib/data';
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
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const statusVariant = {
  Paid: 'default',
  Pending: 'secondary',
  Failed: 'destructive',
} as const;

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPayments = initialPayments.filter((payment) =>
    payment.memberName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Payments</CardTitle>
            <CardDescription>
              View and manage recent transactions.
            </CardDescription>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Input
              placeholder="Search by member name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:max-w-xs"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="hidden sm:table-cell">Plan</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <div className="font-medium">{payment.memberName}</div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {payment.planName}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {payment.date}
                </TableCell>
                <TableCell className="text-right">
                  ${payment.amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={statusVariant[payment.status]}>
                    {payment.status}
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
