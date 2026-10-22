import { Provider } from "@/types/domain";
import { IMailboxProvider, ProvisionMailboxInput, ProvisionMailboxResult } from "./types";

export class GoogleMailboxProvider implements IMailboxProvider {
  public readonly provider: Provider = Provider.GOOGLE;
  private readonly failureRate: number;
  private readonly simulatedDelayMs: number;

  constructor(failureRate = 0.2, simulatedDelayMs = 2000) {
    this.failureRate = failureRate;
    this.simulatedDelayMs = simulatedDelayMs;
  }

  public async provisionMailbox(input: ProvisionMailboxInput): Promise<ProvisionMailboxResult> {
    // Simulate real-world external API latency (2-3 seconds per call)
    const jitter = Math.floor(Math.random() * 1000);
    await new Promise((resolve) => setTimeout(resolve, this.simulatedDelayMs + jitter));

    // Simulate ~20% random failure
    const shouldFail = Math.random() < this.failureRate;
    if (shouldFail) {
      return {
        success: false,
        errorMessage: `Google Workspace API error: 429 ResourceExhausted - Unable to create mailbox for '${input.email}' on domain '${input.domain}'.`,
      };
    }

    const randomHash = Math.random().toString(36).substring(2, 10);
    return {
      success: true,
      externalId: `goog-ws-${input.domain}-${randomHash}`,
    };
  }
}
