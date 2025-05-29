import type { Express, Request, Response } from "express"; // Added Request, Response
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { v4 as uuidv4 } from 'uuid'; // Added uuid
import { urlInputSchema, emailResultSchema, csvResultSchema } from "@shared/schema";
import { z } from "zod";
import { scrapeEmails } from "./scraper";

// Job store for the two-step SSE pattern
const jobStore = new Map<string, string[]>();

/**
 * Process a URL with timeout protection
 * Uses advanced web scraping with multiple strategies
 */
async function processUrlWithTimeout(url: string, timeoutMs = 15000): Promise<{website: string, emails: string[]}> {
  return new Promise(async (resolve) => {
    let isResolved = false;
    let website = "";
    
    try {
      // Extract domain from URL
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }
      const urlObj = new URL(url);
      website = urlObj.hostname;
    } catch {
      // If URL parsing fails, use the raw URL
      website = url;
    }

    // Set timeout to ensure we don't wait too long for a single URL
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        console.log(`Timeout exceeded for ${url}, moving to next URL`);
        isResolved = true;
        resolve({ website, emails: [] });
      }
    }, timeoutMs);

    try {
      console.log(`Starting advanced scraping for: ${url}`);
      
      // Use the advanced scraping function
      const emails = await scrapeEmails(url);
      
      // Limit to 15 emails per website
      const limitedEmails = emails.slice(0, 15);
      
      // Log successful scraping
      console.log(`Found ${limitedEmails.length} emails for ${website}`);
      
      // Clear timeout and resolve if not already resolved
      clearTimeout(timeoutId);
      if (!isResolved) {
        isResolved = true;
        resolve({
          website,
          emails: limitedEmails
        });
      }
    } catch (error) {
      console.error(`Error processing URL ${url}:`, error);
      // Clear timeout and resolve if not already resolved
      clearTimeout(timeoutId);
      if (!isResolved) {
        isResolved = true;
        resolve({
          website,
          emails: []
        });
      }
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {

  // Zod schema for URL list input
  const urlListSchema = z.object({
    urls: z.array(z.string().url().or(z.string().refine(s => !s.startsWith('http'), { message: "Should be a valid hostname or URL" }))).min(1, "Please provide at least one URL")
  });

  // POST /api/initiate-scrape
  app.post("/api/initiate-scrape", async (req: Request, res: Response) => {
    try {
      const validationResult = urlListSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.error("Input validation error for /api/initiate-scrape:", validationResult.error.format());
        return res.status(400).json({ message: "Invalid input format provided", errors: validationResult.error.format() });
      }
      
      const { urls } = validationResult.data;
      const jobId = uuidv4();
      jobStore.set(jobId, urls);

      // Optional: Cleanup job after 1 hour
      setTimeout(() => {
        if (jobStore.has(jobId)) {
          jobStore.delete(jobId);
          console.log(`Job ${jobId} expired and was deleted from store.`);
        }
      }, 3600000); // 1 hour in milliseconds

      return res.status(200).json({ jobId });

    } catch (error) {
      console.error("Error in /api/initiate-scrape:", error);
      return res.status(500).json({ message: "An unexpected server error occurred while initiating scraping job." });
    }
  });

  // GET /api/scrape-stream
  app.get("/api/scrape-stream", async (req: Request, res: Response) => {
    const jobId = req.query.jobId as string;

    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required." });
    }

    const urls = jobStore.get(jobId);

    if (!urls) {
      return res.status(404).json({ message: "Job not found or has expired." });
    }

    try {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders(); // Send headers immediately

      const totalCount = urls.length;

      for (let i = 0; i < urls.length; i++) {
        const currentUrl = urls[i]; // This is the original URL from input
        let dataObject;
        try {
          // processUrlWithTimeout expects a full URL or at least a hostname
          const normalizedProcessingUrl = currentUrl.startsWith('http') ? currentUrl : `https://${currentUrl}`;
          
          const result = await processUrlWithTimeout(normalizedProcessingUrl);
          
          dataObject = {
            website: result.website, // This is the processed hostname
            emails: result.emails,
            processedCount: i + 1,
            totalCount: totalCount,
            currentWebsite: currentUrl // Original URL for client reference
          };
          
        } catch (urlProcessingError: any) {
          console.error(`Error processing URL ${currentUrl} for job ${jobId}:`, urlProcessingError);
          dataObject = {
            website: currentUrl, 
            emails: [],
            error: `Failed to process this URL: ${urlProcessingError.message || 'Unknown error'}`,
            processedCount: i + 1,
            totalCount: totalCount,
            currentWebsite: currentUrl
          };
        }
        res.write(`data: ${JSON.stringify(dataObject)}\n\n`);
      }

      // After the loop completes, send a custom "done" event
      res.write('event: done\ndata: {"message": "Scraping complete"}\n\n');
      res.end(); // Close the connection

    } catch (error) { // This is the top-level try-catch for the streaming logic
      console.error(`Critical error in /api/scrape-stream for job ${jobId}:`, error);
      // If headers have already been sent, we can't send a normal HTTP error response.
      // We attempt to send an SSE error event.
      if (res.headersSent && !res.writableEnded) {
        try {
          res.write('event: error\ndata: {"message": "A critical server error occurred during streaming."}\n\n');
          res.end();
        } catch (sseError) {
          console.error(`Failed to send SSE error event for job ${jobId}:`, sseError);
          if (!res.writableEnded) res.end(); // Ensure connection is closed
        }
      } else if (!res.headersSent) {
         // Should not happen if jobId and urls checks passed, but as a fallback
        return res.status(500).json({ message: "An unexpected server error occurred before streaming could start." });
      }
    } finally {
      // Crucial: Delete the job from the store after stream, regardless of success or failure
      if (jobStore.has(jobId)) {
        jobStore.delete(jobId);
        console.log(`Job ${jobId} completed and was deleted from store.`);
      }
    }
  });

  // Original POST /api/scrape (reverted to non-SSE, batch processing)
  app.post("/api/scrape", async (req: Request, res: Response) => {
    try {
      const validationResult = urlListSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.error("Input validation error for /api/scrape:", validationResult.error.format());
        return res.status(400).json({ message: "Invalid input format provided", errors: validationResult.error.format() });
      }
      
      const { urls } = validationResult.data;
      const results = [];
      
      for (let i = 0; i < urls.length; i++) {
        const currentUrl = urls[i];
        try {
          // processUrlWithTimeout expects a full URL or at least a hostname
          const normalizedProcessingUrl = currentUrl.startsWith('http') ? currentUrl : `https://${currentUrl}`;
          const result = await processUrlWithTimeout(normalizedProcessingUrl);
          results.push(result);
        } catch (urlError: any) {
          console.error(`Error processing URL ${currentUrl} in batch mode:`, urlError);
          results.push({
            website: currentUrl, // Use original URL
            emails: [],
            error: `Failed to process this URL: ${urlError.message || 'Unknown error'}`
          });
        }
      }
      
      return res.status(200).json(results);
      
    } catch (error) {
      console.error("Error in batch /api/scrape:", error);
      // This handles other unexpected errors before streaming starts.
      return res.status(500).json({ message: "An unexpected server error occurred" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
