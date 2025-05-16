import { EmailResult } from "@shared/schema";

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
