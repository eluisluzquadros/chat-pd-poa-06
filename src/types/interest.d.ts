
export type OrganizationSize = 'ate_10' | 'ate_50' | 'ate_100' | 'ate_500' | 'mais_500';

export interface InterestFormValues {
  fullName: string;
  email: string;
  newsletter: boolean;
}

export interface InterestManifestation {
  id: string;
  full_name: string;
  email: string;
  cpf: string;
  city: string;
  organization: string;
  organization_size: OrganizationSize;
  newsletter_opt_in: boolean;
  status: string;
  account_created: boolean;
  created_at: string;
  updated_at: string;
}

export type InterestUser = InterestManifestation;
