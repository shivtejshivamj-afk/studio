export type Member = {
  id: string; // Firestore document ID
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  joinDate: string;
  isActive: boolean;
  gymId: string;
  gymName: string;
  membershipEndDate?: string;
  activePlanId?: string;
};

export type PublicMemberProfile = {
  memberDocId: string;
  gymName: string;
  gymIdentifier: string;
  isActive: boolean;
  firstName: string;
  lastName: string;
}

export type MembershipPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationInDays: number;
  isAvailable: boolean;
};

export type Trainer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  hireDate: string;
  bio?: string;
  isActive: boolean;
  gymName: string;
};

export type Attendance = {
  id: string;
  memberId: string; // The private member document ID
  checkInTime: any;
  checkOutTime?: any;
  gymName: string;
  gymIdentifier: string;
  memberGymId: string; // The public member check-in ID
};

export type Invoice = {
  id: string; // Firestore document ID
  memberId: string; // Member document ID
  membershipId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  gymName: string;

  // These are for UI display and will be added after fetching
  memberName?: string;
  memberEmail?: string;
  planName?: string;
};
