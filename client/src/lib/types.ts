import { EmailResult as SharedEmailResult } from "@shared/schema"; // Import with an alias

export type EmailResult = SharedEmailResult; // Define EmailResult as an alias for the imported type and export it

export interface ProcessingStatus {
  isProcessing: boolean;
  current: number;
  total: number;
  currentWebsite: string;
}

export interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

export interface ApiErrorResponse {
  message: string;
}

export interface EmailScraperState {
  urlInput: string;
  results: EmailResult[];
  processingStatus: ProcessingStatus;
  errorMessage: string;
  toast: ToastState;
}
