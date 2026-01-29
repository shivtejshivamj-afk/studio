export type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  status: 'Active' | 'Inactive' | 'Expiring Soon';
  joinDate: string;
  expiryDate: string;
  avatar: string;
};

export type Trainer = {
  id: string;
  name: string;
  specialization: string;
  phone: string;
  email: string;
  avatar: string;
};

export type Plan = {
  id: string;
  name: string;
  price: number;
  duration: number; // in days
};

export type Payment = {
  id: string;
  memberName: string;
  planName: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Failed';
};

export const members: Member[] = [
  { id: 'm001', name: 'Alicia Keys', email: 'alicia@example.com', phone: '123-456-7890', plan: 'Annual', status: 'Active', joinDate: '2023-01-15', expiryDate: '2024-01-14', avatar: 'member-1' },
  { id: 'm002', name: 'Ben Affleck', email: 'ben@example.com', phone: '234-567-8901', plan: 'Monthly', status: 'Expiring Soon', joinDate: '2023-06-20', expiryDate: '2024-07-19', avatar: 'member-2' },
  { id: 'm003', name: 'Catherine Zeta', email: 'catherine@example.com', phone: '345-678-9012', plan: 'Quarterly', status: 'Active', joinDate: '2023-04-10', expiryDate: '2024-07-09', avatar: 'member-3' },
  { id: 'm004', name: 'Denzel Washington', email: 'denzel@example.com', phone: '456-789-0123', plan: 'Annual', status: 'Inactive', joinDate: '2022-11-05', expiryDate: '2023-11-04', avatar: 'member-4' },
  { id: 'm005', name: 'Eva Mendes', email: 'eva@example.com', phone: '567-890-1234', plan: 'Monthly', status: 'Expiring Soon', joinDate: '2023-06-25', expiryDate: '2024-07-24', avatar: 'member-5' },
  { id: 'm006', name: 'Frank Grillo', email: 'frank@example.com', phone: '678-901-2345', plan: 'Quarterly', status: 'Active', joinDate: '2023-05-30', expiryDate: '2024-08-29', avatar: 'member-6' },
];

export const trainers: Trainer[] = [
  { id: 't01', name: 'Jane Fonda', specialization: 'Yoga & Pilates', phone: '123-456-7890', email: 'jane.f@gymtrack.pro', avatar: 'trainer-1' },
  { id: 't02', name: 'Arnold Schwarzenegger', specialization: 'Bodybuilding', phone: '123-456-7891', email: 'arnold.s@gymtrack.pro', avatar: 'trainer-2' },
  { id: 't03', name: 'Jillian Michaels', specialization: 'HIIT & Cardio', phone: '123-456-7892', email: 'jillian.m@gymtrack.pro', avatar: 'trainer-3' },
];

export const plans: Plan[] = [
  { id: 'p01', name: 'Monthly', price: 50, duration: 30 },
  { id: 'p02', name: 'Quarterly', price: 135, duration: 90 },
  { id: 'p03', name: 'Annual', price: 500, duration: 365 },
];

export const payments: Payment[] = [
  { id: 'pay01', memberName: 'Alicia Keys', planName: 'Annual', amount: 500, date: '2023-01-15', status: 'Paid' },
  { id: 'pay02', memberName: 'Ben Affleck', planName: 'Monthly', amount: 50, date: '2023-06-20', status: 'Paid' },
  { id: 'pay03', memberName: 'Catherine Zeta', planName: 'Quarterly', amount: 135, date: '2023-04-10', status: 'Paid' },
  { id: 'pay04', memberName: 'Eva Mendes', planName: 'Monthly', amount: 50, date: '2023-06-25', status: 'Paid' },
  { id: 'pay05', memberName: 'Frank Grillo', planName: 'Quarterly', amount: 135, date: '2023-05-30', status: 'Paid' },
];

export const dashboardStats = {
  totalMembers: members.length,
  activeMembers: members.filter(m => m.status === 'Active' || m.status === 'Expiring Soon').length,
  totalRevenue: payments.reduce((acc, p) => acc + p.amount, 0),
  expiringSoon: members.filter(m => m.status === 'Expiring Soon').length,
};
