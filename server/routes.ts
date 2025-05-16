import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { urlInputSchema, emailResultSchema, csvResultSchema } from "@shared/schema";
import { z } from "zod";
import { scrapeEmails } from "./scraper";

/**
 * Process a URL with timeout protection
 */
async function processUrlWithTimeout(url: string, timeoutMs = 6000): Promise<{website: string, emails: string[]}> {
  return new Promise(async (resolve) => {
    let isResolved = false;
    let website = "";
    
    try {
      // Extract domain from URL
      website = new URL(url).hostname;
    } catch {
      // If URL parsing fails, use the raw URL
      website = url;
    }

    // Set timeout to ensure we don't wait too long
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        console.log(`Timeout exceeded for ${url}, moving to next URL`);
        isResolved = true;
        resolve({ website, emails: [] });
      }
    }, timeoutMs);

    try {
      // Scrape emails from the URL
      const emails = await scrapeEmails(url);
      
      // Limit to 15 emails per website
      const limitedEmails = emails.slice(0, 15);
      
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
  // API endpoint for scraping emails from URLs
  app.post("/api/scrape", async (req, res) => {
    try {
      // Validate input
      const schema = z.object({
        urls: z.array(z.string())
      });
      
      const { urls } = schema.parse(req.body);
      
      if (!urls || urls.length === 0) {
        return res.status(400).json({ message: "Please provide at least one valid URL" });
      }
      
      // Process each URL and collect results
      const results = [];
      
      // Process URLs with timeout protection
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        try {
          // Basic URL validation
          new URL(url.startsWith('http') ? url : `https://${url}`);
          
          const result = await processUrlWithTimeout(url);
          results.push(result);
          
        } catch (urlError) {
          // If URL is invalid, add it with empty emails
          console.error(`Invalid URL format: ${url}`);
          results.push({
            website: url,
            emails: []
          });
        }
      }
      
      return res.status(200).json(results);
      
    } catch (error) {
      console.error("Error processing request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input format provided" });
      }
      return res.status(500).json({ message: "An error occurred while processing your request" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
