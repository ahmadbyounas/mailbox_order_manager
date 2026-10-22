import { Provider } from "@/types/domain";
import { IMailboxProvider } from "./types";
import { GoogleMailboxProvider } from "./google-provider";
import { MicrosoftMailboxProvider } from "./microsoft-provider";

export class MailboxProviderFactory {
  private static googleProviderInstance = new GoogleMailboxProvider();
  private static microsoftProviderInstance = new MicrosoftMailboxProvider();

  public static getProvider(provider: Provider): IMailboxProvider {
    switch (provider) {
      case Provider.GOOGLE:
        return this.googleProviderInstance;
      case Provider.MICROSOFT:
        return this.microsoftProviderInstance;
      default:
        throw new Error(`Unsupported mailbox provider: ${String(provider)}`);
    }
  }
}
