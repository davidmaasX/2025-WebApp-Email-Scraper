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
    
    // Fetch HTML content with a shorter timeout
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      },
      timeout: 5000 // 5 seconds timeout
    });
    
    const html = response.data;
    
    // Extract emails from HTML content
    const emails = extractEmailsFromHTML(html);
    
    // Return the emails (already deduped in extractEmailsFromHTML)
    return emails;
    
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return [];
  }
}

/**
 * Extracts email addresses from HTML content
 * @param html HTML content
 * @returns Array of unique email addresses
 */
function extractEmailsFromHTML(html: string): string[] {
  // Load HTML with cheerio
  const $ = cheerio.load(html);
  
  // Remove script and style elements
  $("script, style").remove();
  
  // Get text content
  const text = $("body").text();
  
  // Find email addresses using regex
  const emailsMatches = text.match(EMAIL_REGEX) || [];
  
  // Convert to regular array
  const emails: string[] = [];
  for (let i = 0; i < emailsMatches.length; i++) {
    emails.push(emailsMatches[i]);
  }
  
  // Also check 'mailto:' links
  $('a[href^="mailto:"]').each((_, element) => {
    const href = $(element).attr("href");
    if (href) {
      const email = href.replace("mailto:", "").trim().split("?")[0];
      const match = email.match(EMAIL_REGEX);
      if (match && match.length > 0) {
        emails.push(email);
      }
    }
  });
  
  // Filter out duplicates
  const uniqueEmailsSet = new Set<string>();
  for (const email of emails) {
    uniqueEmailsSet.add(email);
  }
  
  // Convert set back to array
  const uniqueEmails: string[] = [];
  uniqueEmailsSet.forEach(email => {
    uniqueEmails.push(email);
  });
  
  return uniqueEmails;
}
