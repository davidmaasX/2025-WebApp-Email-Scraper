import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProcessingStatus as ProcessingStatusComponent } from "@/components/ProcessingStatus";
import { InstructionsCard } from "@/components/InstructionsCard";
import { ProcessingStatus as ProcessingStatusType, EmailResult } from "@/lib/types";

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
  const [eventSourceInstance, setEventSourceInstance] = useState<EventSource | null>(null);
  const [currentResults, setCurrentResults] = useState<EmailResult[]>([]);
  const [sseStreamSuccessfullyCompleted, setSseStreamSuccessfullyCompleted] = useState<boolean>(false);
  const [messageQueue, setMessageQueue] = useState<any[]>([]);
  const [processedEventIds, setProcessedEventIds] = useState<Set<string>>(new Set());

  // Cleanup EventSource
  useEffect(() => {
    return () => {
      if (eventSourceInstance) {
        console.log("Closing EventSource connection on unmount.");
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

  // Process queued onmessage updates
  useEffect(() => {
    if (messageQueue.length === 0) {
      return;
    }

    const processMessage = () => {
      const eventData = messageQueue[0];
      console.log("Processing message from queue:", eventData);
      // Only update isProcessing if not completed
      setProcessingStatus({
        isProcessing: !sseStreamSuccessfullyCompleted,
        current: eventData.processedCount,
        total: eventData.totalCount,
        currentWebsite: eventData.currentWebsite || "",
      });

      const newSingleResult: EmailResult = {
        website: eventData.website,
        emails: eventData.emails,
      };

      if (eventData.error) {
        console.warn(`Error for ${eventData.website}: ${eventData.error}`);
      }

      setCurrentResults((prevResults) => {
        const updatedResults = [...prevResults, newSingleResult];
        console.log("Updating results:", updatedResults);
        onResults(updatedResults);
        return updatedResults;
      });

      setMessageQueue((prev) => prev.slice(1));
    };

    const timeoutId = setTimeout(processMessage, 0);
    return () => clearTimeout(timeoutId);
  }, [messageQueue, onResults, setProcessingStatus, sseStreamSuccessfullyCompleted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSseStreamSuccessfullyCompleted(false);
    setErrorMessage("");
    setCurrentResults([]);
    onResults([]);
    setProcessedEventIds(new Set());
    setMessageQueue([]);

    const urlsList = urlInput
      .split(/[\n\t]/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urlsList.length === 0) {
      setErrorMessage("Please enter at least one URL");
      return;
    }

    setProcessingStatus({
      isProcessing: true,
      current: 0,
      total: urlsList.length,
      currentWebsite: urlsList[0] || "",
    });

    try {
      const initiateResponse = await apiRequest("POST", "/api/initiate-scrape", { urls: urlsList });

      if (!initiateResponse.ok) {
        const errorData = await initiateResponse.json().catch(() => ({ message: "Failed to initiate scraping job. Server returned an error." }));
        throw new Error(errorData.message || `Server error: ${initiateResponse.status}`);
      }

      const { jobId } = await initiateResponse.json();

      if (!jobId) {
        throw new Error("Failed to get Job ID from server.");
      }

      const es = new EventSource(`/api/scrape-stream?jobId=${jobId}`);
      setEventSourceInstance(es);

      es.onopen = () => {
        console.log("SSE connection established with /api/scrape-stream");
        setToast("Scraping process started...", "success");
      };

      es.onmessage = (event: MessageEvent) => {
        try {
          const eventData = JSON.parse(event.data);
          setMessageQueue((prev) => [...prev, eventData]);
        } catch (parseError) {
          console.error("Failed to parse SSE message data:", event.data, parseError);
        }
      };

      es.addEventListener("done", (event: MessageEvent) => {
        console.log("Received 'done' event:", event);
        setSseStreamSuccessfullyCompleted(true);
        let doneMessage = "Scraping completed!";
        try {
          const doneData = JSON.parse(event.data);
          if (doneData.message) doneMessage = doneData.message;
        } catch (e) {
          console.warn("Failed to parse 'done' event data, using default message:", e);
        }

        setToast(doneMessage, "success");
        console.log("Setting processingStatus to completed:", {
          isProcessing: false,
          current: urlsList.length,
          total: urlsList.length,
          currentWebsite: "",
        });
        setProcessingStatus({
          isProcessing: false,
          current: urlsList.length,
          total: urlsList.length,
          currentWebsite: "",
        });
        // Wait for queue to process before closing
        setTimeout(() => {
          setMessageQueue([]); // Clear queue after processing
          closeEventSource();
        }, 500); // Increased delay to ensure all messages are processed
      });

      es.addEventListener("error", (event: MessageEvent) => {
        console.log("Received server-sent 'error' event:", event);
        if (!event.data || (event.lastEventId && processedEventIds.has(event.lastEventId))) {
          console.log("Ignoring server-sent 'error' event with no data or duplicate ID:", event.lastEventId);
          return;
        }

        try {
          const errorData = JSON.parse(event.data);
          if (event.lastEventId) {
            setProcessedEventIds((prev) => new Set([...prev, event.lastEventId]));
          }
          setToast(errorData.message || "Error during scraping.", "error");
          setProcessingStatus((prev) => ({ ...prev, isProcessing: false }));
          closeEventSource();
        } catch (e) {
          console.error("Failed to parse server-sent error data:", e);
          setProcessingStatus((prev) => ({ ...prev, isProcessing: false }));
          closeEventSource();
        }
      });

      es.onerror = (errorEvent: Event) => {
        console.log("EventSource onerror triggered:", {
          errorEvent,
          sseStreamSuccessfullyCompleted,
          eventSourceInstance: !!eventSourceInstance,
          timestamp: new Date().toISOString(),
        });
        if (sseStreamSuccessfullyCompleted || !eventSourceInstance) {
          console.log("Ignoring onerror: Stream completed or EventSource closed.");
          closeEventSource();
          return;
        }
        console.error("Unexpected connection error:", errorEvent);
        setToast("Error during scraping. Connection closed.", "error");
        setProcessingStatus((prev) => ({ ...prev, isProcessing: false }));
        closeEventSource();
      };
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      setErrorMessage(error.message || "An unexpected error occurred.");
      setProcessingStatus(prev => ({ ...prev, isProcessing: false }));
      setToast(error.message || "Failed to start scraping.", "error");
      closeEventSource();
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
              placeholder="example.com
another-site.org"
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