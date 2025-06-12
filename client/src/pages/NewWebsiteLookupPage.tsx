import React, { useState } from "react";
import { InputSection } from "@/components/InputSection";
import { ResultsSection } from "@/components/ResultsSection";
import { useToast } from "@/hooks/use-toast"; // For setToast
import { ProcessingStatus, EmailResult } from "@/lib/types"; // Ensure these types are available

function NewWebsiteLookupPage() {
  const [results, setResults] = useState<EmailResult[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    current: 0,
    total: 0,
    currentWebsite: "",
  });
  const { toast } = useToast();

  const handleResults = (newResults: EmailResult[]) => {
    setResults(newResults);
  };

  const handleDownload = () => {
    // You can add any download tracking logic here if needed
    toast({
      title: "Download Started",
      description: "Your CSV file download has started.",
    });
  };

  const setToast = (message: string, type: "success" | "error") => {
    toast({
      title: type === "success" ? "Success!" : "Error",
      description: message,
      variant: type === "error" ? "destructive" : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header is now in App.tsx */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <InputSection
            onResults={handleResults}
            processingStatus={processingStatus}
            setProcessingStatus={setProcessingStatus}
            setToast={setToast}
          />
          <ResultsSection results={results} onDownload={handleDownload} />
        </div>
      </main>
    </div>
  );
}

export default NewWebsiteLookupPage;
