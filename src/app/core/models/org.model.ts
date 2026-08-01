export type OrgStatus = 'pending' | 'validated' | 'rejected';

export interface Org {
  id: string;
  name: string;
  description: string;
  address: string;
  contact: string;
  status: OrgStatus;
  rejectReason: string | null;
}
