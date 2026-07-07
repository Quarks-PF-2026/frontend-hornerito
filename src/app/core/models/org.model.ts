export type OrgStatus = 'pendiente' | 'validada' | 'rechazada';

export interface Org {
  name: string;
  desc: string;
  address: string;
  contact: string;
  status: OrgStatus;
  rejectReason: string;
}
