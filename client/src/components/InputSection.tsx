import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { InstructionsCard } from "@/components/InstructionsCard";
import { ProcessingStatus as ProcessingStatusType } from "@/lib/types";
import { EmailResult, urlInputSchema } from "@shared/schema";

interface InputSectionProps {
  onResults: (results: EmailResult[]) => void;
  processingStatus: ProcessingStatusType;
  setProcessingStatus: (status: ProcessingStatusType) => void;
  setToast: (message: string, type: "success" | "error") => void;
}

export function InputSection({ 
  onResults, 
  processingStatus, 
  setProcessingStatus,
  setToast 
}: InputSectionProps) {
  const [urlInput, setUrlInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { mutate: scrapeEmails, isPending } = useMutation({
    mutationFn: async (urls: string[]) => {
      const response = await apiRequest("POST", "/api/scrape", { urls });
      return response.json() as Promise<EmailResult[]>;
    },
    onSuccess: (data) => {
      onResults(data);
      setProcessingStatus({
        isProcessing: false,
        current: 0,
        total: 0,
        currentWebsite: "",
      });
      setIsProcessing(false);
      setToast("Email scraping completed!", "success");
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setProcessingStatus({
        isProcessing: false,
        current: 0,
        total: 0,
        currentWebsite: "",
      });
      setIsProcessing(false);
      setToast("Error: " + error.message, "error");
    },
  });
  
  // We don't need this effect as the server handles the processing now
  // and the component was going into an infinite loop
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    
    try {
      // Process URLs - split by newline or tab
      const urlsList = urlInput
        .split(/[\n\t]/)
        .map(url => url.trim())
        .filter(url => url.length > 0);
      
      if (urlsList.length === 0) {
        setErrorMessage("Please enter at least one URL");
        return;
      }
      
      // Set the processed URLs
      setUrls(urlsList);
      
      // Initialize processing status
      setProcessingStatus({
        isProcessing: true,
        current: 0,
        total: urlsList.length,
        currentWebsite: urlsList[0],
      });
      
      // Start scraping
      scrapeEmails(urlsList);
      
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      }
    }
  };
  
  const handleClear = () => {
    setUrlInput("");
    setErrorMessage("");
    setUrls([]);
    onResults([]);
  };
  
  return (
    <section className="w-full lg:w-1/2">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-medium mb-4">Enter URLs</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label htmlFor="urlInput" className="block text-sm font-medium text-slate-700 mb-1">
              Website URLs (one per line or tab separated)
            </Label>
            <Textarea
              id="urlInput"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full h-56 px-3 py-2 text-slate-700 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="https://example.com&#10;https://another-site.com"
            />
            <p className="mt-1 text-sm text-slate-500">Enter full URLs including http:// or https://</p>
          </div>
          
          <div className="flex justify-between items-center">
            <Button
              type="submit"
              disabled={isPending || processingStatus.isProcessing}
              className="px-4 py-2 bg-blue-800 text-white font-medium rounded-md hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 transition-colors"
            >
              {isPending || processingStatus.isProcessing ? "Processing..." : "Start Scraping"}
            </Button>
            
            <Button
              type="button"
              onClick={handleClear}
              variant="outline"
              className="px-4 py-2 text-slate-700 bg-slate-100 font-medium rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors"
            >
              Clear
            </Button>
          </div>
        </form>
        
        <ProcessingStatus status={processingStatus} />
        
        {errorMessage && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </div>
      
      <InstructionsCard />
    </section>
  );
}
