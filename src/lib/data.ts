export type Plan = {
  id: string;
  name: string;
  price: number;
  duration: number; // in days
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
};

// Mock data is removed as we are now using Firestore for most entities.
// Plans are kept as static data for now.
export const plans: Plan[] = [
  { id: 'p01', name: 'Monthly', price: 50, duration: 30 },
  { id: 'p02', name: 'Quarterly', price: 135, duration: 90 },
  { id: 'p03', name: 'Annual', price: 500, duration: 365 },
];
