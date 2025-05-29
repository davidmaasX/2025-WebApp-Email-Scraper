import React, { useState, useEffect, useCallback } from "react";
// import { useMutation } from "@tanstack/react-query"; // Removed
import { apiRequest } from "@/lib/queryClient"; // Still useful for POST
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
// ProcessingStatus is a component, ProcessingStatusType is the type
import { ProcessingStatus as ProcessingStatusComponent } from "@/components/ProcessingStatus"; // Renamed import
import { InstructionsCard } from "@/components/InstructionsCard";
import { ProcessingStatus as ProcessingStatusType, EmailResult } from "@/lib/types"; // EmailResult is also in types.ts
// import { EmailResult, urlInputSchema } from "@shared/schema"; // Using local type for now

interface InputSectionProps {
  onResults: (results: EmailResult[]) => void;
  processingStatus: ProcessingStatusType;
  setProcessingStatus: React.Dispatch<React.SetStateAction<ProcessingStatusType>>;
  setToast: (message: string, type: "success" | "error") => void;
}

export function InputSection({
  onResults,
  processingStatus,
  setProcessingStatus,
  setToast,
}: InputSectionProps) {
  const [urlInput, setUrlInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  // const [urls, setUrls] = useState<string[]>([]); // Not strictly needed if not used elsewhere
  const [eventSourceInstance, setEventSourceInstance] = useState<EventSource | null>(null);
  const [currentResults, setCurrentResults] = useState<EmailResult[]>([]);
  const [sseStreamSuccessfullyCompleted, setSseStreamSuccessfullyCompleted] = useState<boolean>(false);

  // Cleanup EventSource on component unmount
  useEffect(() => {
    return () => {
      if (eventSourceInstance) {
        console.log("Closing EventSource connection on component unmount.");
        eventSourceInstance.close();
        setEventSourceInstance(null);
      }
    };
  }, [eventSourceInstance]);

  const closeEventSource = useCallback(() => {
    if (eventSourceInstance) {
      console.log("Closing EventSource connection explicitly.");
      eventSourceInstance.close();
      setEventSourceInstance(null);
    }
  }, [eventSourceInstance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSseStreamSuccessfullyCompleted(false); // Reset the flag for the new session
    setErrorMessage("");
    setCurrentResults([]); // Reset results for a new submission
    onResults([]); // Clear results in parent as well

    // Process URLs - split by newline or tab
    const urlsList = urlInput
      .split(/[\n\t]/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urlsList.length === 0) {
      setErrorMessage("Please enter at least one URL");
      return;
    }

    // Set initial processing status
    setProcessingStatus({
      isProcessing: true,
      current: 0,
      total: urlsList.length,
      currentWebsite: urlsList[0] || "", // Handle empty list case
    });

    try {
      // Step A: Initiate Scrape (POST request)
      const initiateResponse = await apiRequest("POST", "/api/initiate-scrape", { urls: urlsList });
      
      if (!initiateResponse.ok) {
        const errorData = await initiateResponse.json().catch(() => ({ message: "Failed to initiate scraping job. Server returned an error." }));
        throw new Error(errorData.message || `Server error: ${initiateResponse.status}`);
      }

      const { jobId } = await initiateResponse.json();

      if (!jobId) {
        throw new Error("Failed to get Job ID from server.");
      }

      // Step B: Start EventSource (GET request)
      const es = new EventSource(`/api/scrape-stream?jobId=${jobId}`);
      setEventSourceInstance(es); // Store the instance

      es.onopen = () => {
        console.log("SSE connection established with /api/scrape-stream");
        setToast("Scraping process started...", "success");
      };

      es.onmessage = (event) => {
        try {
          const eventData = JSON.parse(event.data);
          
          // Update processing status
          setProcessingStatus({
            isProcessing: true, // Stays true until 'done' or 'error'
            current: eventData.processedCount,
            total: eventData.totalCount,
            currentWebsite: eventData.currentWebsite || "",
          });

          // Accumulate results and update parent
          const newSingleResult: EmailResult = { 
            website: eventData.website, 
            emails: eventData.emails,
            // error: eventData.error // Assuming EmailResult can have an error field
          };
          if(eventData.error) {
            console.warn(`Error for ${eventData.website}: ${eventData.error}`);
            // Optionally add error to newSingleResult if your type supports it
            // newSingleResult.error = eventData.error; 
          }

          setCurrentResults(prevResults => {
            const updatedResults = [...prevResults, newSingleResult];
            onResults(updatedResults); // Pass the full accumulated list
            return updatedResults;
          });

        } catch (parseError) {
          console.error("Failed to parse SSE message data:", event.data, parseError);
        }
      };

      es.addEventListener('done', (event) => {
        setSseStreamSuccessfullyCompleted(true); // Set the flag on successful completion
        console.log("SSE stream finished:", event);
        let doneMessage = "Scraping completed!";
        try {
            const doneData = JSON.parse((event as MessageEvent).data);
            if(doneData.message) doneMessage = doneData.message;
        } catch(e) {/* use default message */}

        setToast(doneMessage, "success");
        setProcessingStatus(prev => ({ ...prev, isProcessing: false, current: prev.total })); // Ensure current shows total
        closeEventSource();
      });

      es.onerror = (errorEvent) => {
        if (sseStreamSuccessfullyCompleted) {
          console.log('onerror triggered after successful completion, ignoring.');
          // It's also good practice to ensure the EventSource is closed here too,
          // just in case it wasn't closed by the 'done' event for some reason,
          // though the 'done' event handler should already be closing it.
          // However, the main purpose here is to prevent the error toast.
          // The closeEventSource() call later in the original error handler will be skipped if we return.
          // Let's ensure it's closed if we are ignoring the error:
          closeEventSource(); // Assuming closeEventSource is accessible and idempotent.
          return;
        }
        console.error("EventSource failed:", errorEvent);
        setToast("Error during scraping. Connection closed.", "error");
        setProcessingStatus(prev => ({ ...prev, isProcessing: false }));
        closeEventSource();
      };

    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      setErrorMessage(error.message || "An unexpected error occurred.");
      setProcessingStatus(prev => ({ ...prev, isProcessing: false }));
      setToast(error.message || "Failed to start scraping.", "error");
      closeEventSource(); // Ensure ES is closed if it was setup before error
    }
  };

  const handleClear = () => {
    setUrlInput("");
    setErrorMessage("");
    setCurrentResults([]);
    onResults([]);
    setProcessingStatus({ isProcessing: false, current: 0, total: 0, currentWebsite: "" });
    if (eventSourceInstance) {
      closeEventSource();
    }
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
              placeholder="example.com&#10;another-site.org"
            />
            <p className="mt-1 text-sm text-slate-500">
              Enter hostnames (e.g., example.com) or full URLs.
            </p>
          </div>

          <div className="flex justify-between items-center">
            <Button
              type="submit"
              disabled={processingStatus.isProcessing}
              className="px-4 py-2 bg-blue-800 text-white font-medium rounded-md hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 transition-colors"
            >
              {processingStatus.isProcessing ? "Processing..." : "Start Scraping"}
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

        <ProcessingStatusComponent status={processingStatus} />

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
