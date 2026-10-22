import { Provider } from "@/types/domain";

export interface ProvisionMailboxInput {
  orderId: string;
  domain: string;
  index: number;
  email: string;
}

export interface ProvisionMailboxResult {
  success: boolean;
  externalId?: string;
  errorMessage?: string;
}

export interface IMailboxProvider {
  readonly provider: Provider;
  provisionMailbox(input: ProvisionMailboxInput): Promise<ProvisionMailboxResult>;
}
