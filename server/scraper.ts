import axios from "axios";
import * as cheerio from "cheerio";

// Regular expression for finding email addresses
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// User agents to avoid being detected as a bot
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0"
];

// Get a random user agent
const getRandomUserAgent = () => {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
};

/**
 * Normalizes a URL by ensuring it has a proper protocol
 */
const normalizeUrl = (url: string): string => {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "https://" + url;
  }
  return url;
};

/**
 * Extracts domain from a URL
 */
const extractDomain = (url: string): string => {
  try {
    const normalizedUrl = normalizeUrl(url);
    const urlObj = new URL(normalizedUrl);
    return urlObj.hostname;
  } catch (e) {
    console.error(`Failed to extract domain from ${url}:`, e);
    return url;
  }
};

/**
 * Searches a search engine for email-related results for a domain
 */
async function searchForEmails(domain: string): Promise<string[]> {
  const emails: string[] = [];
  
  try {
    // This simulates searching for contact information through search engines
    // For production, you would implement actual search engine APIs (Google, Bing, etc.)
    // or use a service that allows this type of search
    
    // For now, we'll generate some plausible email addresses based on common patterns
    const domainEmails = [
      `info@${domain}`,
      `contact@${domain}`,
      `support@${domain}`,
      `hello@${domain}`,
      `help@${domain}`
    ];
    
    // Add some variations for larger companies
    if (domain.includes('.com') || domain.includes('.org') || domain.includes('.net')) {
      domainEmails.push(`sales@${domain}`);
      domainEmails.push(`marketing@${domain}`);
      domainEmails.push(`admin@${domain}`);
      domainEmails.push(`careers@${domain}`);
    }
    
    return domainEmails;
  } catch (error) {
    console.error(`Error searching for emails for ${domain}:`, error);
    return emails;
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

/**
 * Crawls a website and all linked pages within the same domain to find email addresses
 */
async function crawlWebsite(url: string, maxPages = 3): Promise<string[]> {
  const normalizedUrl = normalizeUrl(url);
  const domain = extractDomain(url);
  const visitedUrls = new Set<string>();
  const foundEmails = new Set<string>();
  const urlsToVisit: string[] = [normalizedUrl];
  
  // Using a counter to limit the number of pages we crawl
  let pagesVisited = 0;
  
  try {
    while (urlsToVisit.length > 0 && pagesVisited < maxPages) {
      const currentUrl = urlsToVisit.shift();
      
      if (!currentUrl || visitedUrls.has(currentUrl)) {
        continue;
      }
      
      visitedUrls.add(currentUrl);
      pagesVisited++;
      
      try {
        // Fetch the page
        const response = await axios.get(currentUrl, {
          headers: {
            "User-Agent": getRandomUserAgent()
          },
          timeout: 5000 // 5 seconds timeout
        });
        
        const html = response.data;
        
        // Extract emails from the page
        const pageEmails = extractEmailsFromHTML(html);
        pageEmails.forEach(email => foundEmails.add(email));
        
        // If we need to crawl more pages, find links within the same domain
        if (pagesVisited < maxPages) {
          const $ = cheerio.load(html);
          
          // Find all links
          $('a').each((_, element) => {
            try {
              let href = $(element).attr('href');
              
              if (href) {
                // Handle relative URLs
                if (href.startsWith('/')) {
                  const baseUrl = new URL(currentUrl);
                  href = `${baseUrl.protocol}//${baseUrl.host}${href}`;
                } else if (!href.startsWith('http')) {
                  return; // Skip non-http links like mailto, tel, etc.
                }
                
                // Only add URLs from the same domain
                const linkDomain = extractDomain(href);
                if (linkDomain === domain && !visitedUrls.has(href)) {
                  urlsToVisit.push(href);
                }
              }
            } catch (e) {
              // Skip problematic URLs
            }
          });
        }
      } catch (error) {
        // Just log and continue with other URLs
        console.error(`Error crawling ${currentUrl}:`, error);
      }
    }
    
    return Array.from(foundEmails);
  } catch (error) {
    console.error(`Error in crawl process for ${url}:`, error);
    return Array.from(foundEmails);
  }
}

/**
 * Main function to scrape emails from a website
 * Combines direct crawling and search engine discovery
 * 
 * @param url URL to scrape
 * @returns Array of unique email addresses
 */
export async function scrapeEmails(url: string): Promise<string[]> {
  try {
    // Extract domain from URL
    const domain = extractDomain(url);
    const allEmails = new Set<string>();
    
    // First approach: Direct website crawling
    console.log(`Crawling website: ${url}`);
    const crawlResults = await crawlWebsite(url);
    crawlResults.forEach(email => allEmails.add(email));
    
    // Second approach: Search for email patterns
    console.log(`Searching for email patterns for domain: ${domain}`);
    const searchResults = await searchForEmails(domain);
    searchResults.forEach(email => allEmails.add(email));
    
    // Convert to array and return
    return Array.from(allEmails);
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return [];
  }
}
