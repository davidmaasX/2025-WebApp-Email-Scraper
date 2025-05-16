import axios from "axios";
import * as cheerio from "cheerio";

// Regular expression for finding email addresses
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Scrapes a website to extract email addresses
 * @param url URL to scrape
 * @returns Array of unique email addresses
 */
export async function scrapeEmails(url: string): Promise<string[]> {
  try {
    // Normalize URL (ensure it has protocol)
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    
    // Fetch HTML content
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      },
      timeout: 10000 // 10 seconds timeout
    });
    
    const html = response.data;
    
    // Extract emails from HTML content
    const emails = extractEmailsFromHTML(html);
    
    // Extract links for potential future crawling (out of scope for now)
    const $ = cheerio.load(html);
    
    // Return unique emails
    return [...new Set(emails)];
    
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return [];
  }
}

/**
 * Extracts email addresses from HTML content
 * @param html HTML content
 * @returns Array of email addresses
 */
function extractEmailsFromHTML(html: string): string[] {
  // Load HTML with cheerio
  const $ = cheerio.load(html);
  
  // Remove script and style elements
  $("script, style").remove();
  
  // Get text content
  const text = $("body").text();
  
  // Find email addresses using regex
  const emails = text.match(EMAIL_REGEX) || [];
  
  // Also check 'mailto:' links
  $('a[href^="mailto:"]').each((_, element) => {
    const href = $(element).attr("href");
    if (href) {
      const email = href.replace("mailto:", "").trim().split("?")[0];
      if (email.match(EMAIL_REGEX)) {
        emails.push(email);
      }
    }
  });
  
  // Filter out duplicates and return
  return [...new Set(emails)];
}
