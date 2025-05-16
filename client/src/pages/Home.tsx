import React, { useState } from "react";
import { Header } from "@/components/Header";
import { InputSection } from "@/components/InputSection";
import { ResultsSection } from "@/components/ResultsSection";
import { Toast } from "@/components/Toast";
import { ProcessingStatus, ToastState } from "@/lib/types";
import { EmailResult } from "@shared/schema";

export default function Home() {
  const [results, setResults] = useState<EmailResult[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    current: 0,
    total: 0,
    currentWebsite: "",
  });
  
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });
  
  const handleResults = (newResults: EmailResult[]) => {
    setResults(newResults);
  };
  
  const handleToast = (message: string, type: "success" | "error") => {
    setToast({
      message,
      type,
      visible: true,
    });
  };
  
  const handleCloseToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };
  
  const handleDownload = () => {
    handleToast("CSV downloaded successfully!", "success");
  };
  
  const updateProcessingStatus = (status: ProcessingStatus) => {
    setProcessingStatus(status);
  };
  
  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Header />
        
        <main className="flex flex-col lg:flex-row gap-8">
          <InputSection 
            onResults={handleResults}
            processingStatus={processingStatus}
            setProcessingStatus={updateProcessingStatus}
            setToast={handleToast}
          />
          
          <ResultsSection 
            results={results}
            onDownload={handleDownload}
          />
        </main>
        
        <Toast 
          toast={toast}
          onClose={handleCloseToast}
        />
      </div>
    </div>
  );
}
