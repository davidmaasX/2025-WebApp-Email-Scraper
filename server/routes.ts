import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { urlInputSchema, emailResultSchema, csvResultSchema } from "@shared/schema";
import { z } from "zod";
import { scrapeEmails } from "./scraper";

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint for scraping emails from URLs
  app.post("/api/scrape", async (req, res) => {
    try {
      // Validate input
      const schema = z.object({
        urls: z.array(z.string().url())
      });
      
      const { urls } = schema.parse(req.body);
      
      if (!urls || urls.length === 0) {
        return res.status(400).json({ message: "Please provide at least one valid URL" });
      }
      
      // Process each URL and collect results
      const results = [];
      
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        
        try {
          // Extract domain from URL
          const domain = new URL(url).hostname;
          
          // Scrape emails from the URL
          const emails = await scrapeEmails(url);
          
          // Limit to 15 emails per website
          const limitedEmails = emails.slice(0, 15);
          
          results.push({
            website: domain,
            emails: limitedEmails
          });
          
        } catch (error) {
          console.error(`Error processing URL ${url}:`, error);
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
        return res.status(400).json({ message: "Invalid URL format provided" });
      }
      return res.status(500).json({ message: "An error occurred while processing your request" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
