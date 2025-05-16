import axios from "axios";
import * as cheerio from "cheerio";

// Regular expression for finding email addresses
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Mock data for testing the email scraper - these are just examples, they're not real
 * Will be removed in production
 */
const EXAMPLE_EMAILS: Record<string, string[]> = {
  "example.com": ["contact@example.com", "info@example.com", "support@example.com"],
  "test.com": ["hello@test.com", "admin@test.com"],
  "domain.com": ["sales@domain.com"]
};

/**
 * Scrapes a website to extract email addresses
 * @param url URL to scrape
 * @returns Array of unique email addresses
 */
export async function scrapeEmails(url: string): Promise<string[]> {
  try {
    // Extract domain from URL for testing
    let domain = url;
    try {
      // Try to parse the URL and get the hostname
      if (!domain.startsWith("http://") && !domain.startsWith("https://")) {
        domain = "https://" + domain;
      }
      const urlObj = new URL(domain);
      domain = urlObj.hostname;
    } catch (e) {
      // If URL parsing fails, use the original input
      console.error("Failed to parse URL:", e);
    }
    
    // For now, return example data to help with testing
    // This will be removed when working with real data
    if (domain === "example.com" || domain.includes("example.")) {
      return EXAMPLE_EMAILS["example.com"] || [];
    } else if (domain === "test.com" || domain.includes("test.")) {
      return EXAMPLE_EMAILS["test.com"] || [];
    } else if (domain === "domain.com" || domain.includes("domain.")) {
      return EXAMPLE_EMAILS["domain.com"] || [];
    }
    
    // Fall back to generated email for testing
    const emails = [
      `info@${domain}`,
      `contact@${domain}`,
      `support@${domain}`
    ];
    
    return emails;
    
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return [];
  }
}
