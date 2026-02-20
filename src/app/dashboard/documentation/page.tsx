'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BookOpenCheck } from 'lucide-react';

export default function DocumentationPage() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <BookOpenCheck className="h-10 w-10 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Documentation & Help
          </h1>
          <p className="text-muted-foreground">
            Your guide to mastering GymTrack Pro. Find tutorials, tips, and
            answers to your questions.
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="p-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg font-semibold">
                Dashboard Overview
              </AccordionTrigger>
              <AccordionContent className="prose prose-invert max-w-none">
                <p>
                  The main dashboard gives you a real-time snapshot of your
                  gym's key metrics. Here's what you'll find:
                </p>
                <ul>
                  <li>
                    <strong>Gym Identifier:</strong> A unique ID for your gym used
                    in the public member check-in process. Members will need
                    this ID to check in.
                  </li>
                  <li>
                    <strong>Stat Cards:</strong> Quick counts of your total,
                    active, and inactive members.
                  </li>
                  <li>
                    <strong>Memberships Expiring Soon:</strong> A crucial table
                    listing members whose subscriptions are ending within the
                    next 7 days. You can send them a reminder email directly
                    from this table.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-semibold">
                Member Management
              </AccordionTrigger>
              <AccordionContent className="prose prose-invert max-w-none">
                <p>
                  The Members page is where you manage all your member profiles.
                </p>
                <ul>
                  <li>
                    <strong>Adding Members:</strong> Click "Add Member" to open a
                    form. When you add a new member, a unique, human-readable
                    "Member ID" (e.g., JANE1234) is automatically generated.
                    This is the ID members use to check in.
                  </li>
                  <li>
                    <strong>Public vs. Private Profiles:</strong> For security,
                    GymTrack Pro creates two profiles for each member. The main
                    profile with all their details is private. A second, public
                    profile contains only non-sensitive information (name,
                    status, gym ID) and is used for the check-in process.
                  </li>
                  <li>
                    <strong>Actions:</strong> You can view detailed information,
                    edit profiles, or delete members using the action buttons in
                    each row.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg font-semibold">
                Attendance & Check-in
              </AccordionTrigger>
              <AccordionContent className="prose prose-invert max-w-none">
                <p>
                  Track who comes to your gym with two simple check-in methods.
                </p>
                <ul>
                  <li>
                    <strong>Admin Check-in:</strong> On the Attendance page, you
                    can manually check a member in by entering their Member ID.
                    The system prevents duplicate check-ins on the same day.
                  </li>
                  <li>
                    <strong>Public Check-in:</strong> Members can check
                    themselves in at a kiosk or public device by navigating to
                    the "Member Check-in" page from the home screen. They'll
                    need the Gym Identifier and their personal Member ID.
                  </li>
                   <li>
                    <strong>Attendance Log:</strong> The page displays a complete
                    history of all check-ins. You can search for specific
                    members, filter records by date, and delete records within a
                    selected date range.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg font-semibold">
                Invoicing & Payments
              </AccordionTrigger>
              <AccordionContent className="prose prose-invert max-w-none">
                <p>
                  The Invoicing page helps you manage billing for your members.
                </p>
                <ul>
                  <li>
                    <strong>Creating Invoices:</strong> Click "Create Invoice",
                    select a member and a membership plan. The system will
                    automatically fill in the price.
                  </li>
                  <li>
                    <strong>Managing Status:</strong> You can update an invoice's
                    status to "Paid," "Pending," or "Overdue." When an invoice
                    is marked as "Paid," the system automatically updates the
                    corresponding member's profile to "Active" and sets their
                    membership end date based on the plan's duration.
                  </li>
                  <li>
                    <strong>Downloading PDFs:</strong> You can view and download
                    a professional PDF of any invoice for your records or to
                    send to members.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            
             <AccordionItem value="item-5">
              <AccordionTrigger className="text-lg font-semibold">
                Settings
              </AccordionTrigger>
              <AccordionContent className="prose prose-invert max-w-none">
                <p>
                  Configure your gym's details and manage what you offer to members.
                </p>
                <ul>
                  <li>
                    <strong>Profile Settings:</strong> Update your gym's contact
                    information, such as the owner's name, email, address, and
                    phone number. This information is used on generated
                    invoices.
                  </li>
                  <li>
                    <strong>Membership Plans:</strong> This is where you define
                    all the membership packages your gym offers. You can add new
                    plans, edit existing ones (name, price, duration), or
                    delete them. You can also toggle a plan's availability.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
