import axios from "axios";
import * as cheerio from "cheerio";

// Regular expressions for finding email addresses
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const ENCODED_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+\s*\[at\]\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// User agents to avoid being detected as a bot
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
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
    return urlObj.hostname.replace(/^www\./, "");
  } catch (e) {
    console.error(`Failed to extract domain from ${url}:`, e);
    return url;
  }
};

/**
 * Fetches the content of a given URL
 * @param url URL to fetch
 * @returns Object containing HTML content, status code, error, and duration
 */
async function fetchPageContent(url: string): Promise<{ html: string | null; statusCode: number | null; error: string | null; duration: number }> {
  const startTime = Date.now();
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        "User-Agent": getRandomUserAgent(),
      },
    });
    const endTime = Date.now();
    return {
      html: response.data,
      statusCode: response.status,
      error: null,
      duration: endTime - startTime,
    };
  } catch (error: any) {
    const endTime = Date.now();
    if (error.code === 'ECONNABORTED') {
      return {
        html: null,
        statusCode: null,
        error: "Timeout",
        duration: endTime - startTime,
      };
    }
    if (error.response) {
      return {
        html: null,
        statusCode: error.response.status,
        error: `Fetch error: ${error.response.status}`,
        duration: endTime - startTime,
      };
    }
    return {
      html: null,
      statusCode: null,
      error: `Fetch error: ${error.message}`,
      duration: endTime - startTime,
    };
  }
}

/**
 * Searches a website for email-related results by crawling common paths
 */
async function searchForEmails(domain: string): Promise<string[]> {
  const emails: string[] = [];

  try {
    
    // Commented out fake email address generation
    /*
    // This simulates searching for contact information through search engines
    // For production, you would implement actual search engine APIs (Google, Bing, etc.)
    // or use a service that allows this type of search
    // For now, we'll generate some plausible email addresses based on common patterns
    const domainEmails = [
      `info@${domain}`,
      `contact@${domain}`,
      `support@${domain}`,
      `hello@${domain}`,
      `help@${domain}`,
    ];
    // Add some variations for larger companies
    if (domain.includes(".com") || domain.includes(".org") || domain.includes(".net")) {
      domainEmails.push(`sales@${domain}`);
      domainEmails.push(`marketing@${domain}`);
      domainEmails.push(`admin@${domain}`);
      domainEmails.push(`careers@${domain}`);
    }
    return domainEmails;
    */

    // Crawl common paths where emails are likely to appear
    const commonPaths = [
      "/contact",
      "/about",
      "/team",
      "/support",
      "/contact-us",
      "/get-in-touch",
      "/staff",
      "/directory",
    ];

    for (const path of commonPaths) {
      const targetUrl = `https://${domain}${path}`;
      try {
        console.log(`Crawling path: ${targetUrl}`);
        const pathEmails = await crawlWebsite(targetUrl, 1); // Crawl only the specific page
        pathEmails.forEach((email) => emails.push(email));
      } catch (error) {
        console.error(`Error crawling path ${targetUrl}:`, error);
      }
      // Rate limiting: 500ms delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return [...new Set(emails)];
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
  const $ = cheerio.load(html);
  $("script, style").remove();
  const text = $("body").text();
  const emails: string[] = [];

  // Find standard email addresses
  const standardMatches = text.match(EMAIL_REGEX) || [];
  emails.push(...standardMatches);

  // Find encoded emails (e.g., user [at] domain.com)
  const encodedMatches = text.match(ENCODED_EMAIL_REGEX) || [];
  encodedMatches.forEach((encoded) => {
    const email = encoded.replace(/\s*\[at\]\s*/, "@");
    if (email.match(EMAIL_REGEX)) {
      emails.push(email);
    }
  });

  // Check 'mailto:' links
  $('a[href^="mailto:"]').each((_, element) => {
    const href = $(element).attr("href")?.replace("mailto:", "").trim().split("?")[0];
    if (href && href.match(EMAIL_REGEX)) {
      emails.push(href);
    }
  });

  return [...new Set(emails)];
}

/**
 * Extracts the first email address found in a raw HTML string using a simple regex match.
 * @param htmlContent Raw HTML string
 * @returns The first email found, or null if no valid email is found
 */
function extractFirstEmailSimple(htmlContent: string): string | null {
  if (typeof htmlContent !== "string") {
    console.warn("Invalid htmlContent type:", typeof htmlContent);
    return null;
  }
  const matches = htmlContent.match(EMAIL_REGEX);
  if (matches && matches.length > 0) {
    const firstMatch = matches[0];
    if (firstMatch.includes("@")) {
      return firstMatch;
    }
  }
  return null;
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
            "User-Agent": getRandomUserAgent(),
          },
          timeout: 5000, // 5 seconds timeout
        });

        const html = response.data;

        // Extract emails from the page
        const pageEmails = extractEmailsFromHTML(html);
        pageEmails.forEach((email) => foundEmails.add(email));

        // If we need to crawl more pages, find links within the same domain
        if (pagesVisited < maxPages) {
          const $ = cheerio.load(html);

          // Find all links
          $("a").each((_, element) => {
            try {
              let href = $(element).attr("href");
              if (href) {
                // Handle relative URLs
                if (href.startsWith("/")) {
                  const baseUrl = new URL(currentUrl);
                  href = `${baseUrl.protocol}//${baseUrl.host}${href}`;
                } else if (!href.startsWith("http")) {
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
        console.error(`Error crawling ${currentUrl}:`, error);
      }

      // Rate limiting: 500ms delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return Array.from(foundEmails);
  } catch (error) {
    console.error(`Error in crawl process for ${url}:`, error);
    return Array.from(foundEmails);
  }
}

/**
 * Main function to scrape emails from a website
 * Combines direct crawling and path-based discovery
 * @param url URL to scrape
 * @returns Array of unique email addresses
 */
export async function scrapeEmails(url: string): Promise<string[]> {
  const normalizedUrl = normalizeUrl(url);
  console.log(`Scraping single page: ${normalizedUrl}`);

  try {
    const fetchResult = await fetchPageContent(normalizedUrl);

    // Timeout check (Apps Script: if endTime - startTime > 5000)
    if (fetchResult.error === "Timeout" || fetchResult.duration > 5000) {
      console.log(`No email found for ${normalizedUrl} due to timeout.`);
      return [];
    }

    // Status code check or other fetch error
    // if fetchResult.html is null, it implies an issue (e.g. non-200 status, or other critical fetch error)
    if (!fetchResult.html) { // This covers statusCode !== 200 and other errors where HTML is not retrieved
      console.log(`No email found for ${normalizedUrl} due to status code ${fetchResult.statusCode} or fetch error: ${fetchResult.error}`);
      return [];
    }
    // Explicit status code check for clarity, though !fetchResult.html should cover it.
    if (fetchResult.statusCode !== 200) {
        console.log(`No email found for ${normalizedUrl} due to status code ${fetchResult.statusCode}.`);
        return [];
    }

    // If HTML is present, try to extract email
    const email = extractFirstEmailSimple(fetchResult.html);

    if (email) {
      return [email];
    } else {
      console.log(`No email found on page ${normalizedUrl}.`);
      return [];
    }

  } catch (error) {
    console.error(`Error scraping ${normalizedUrl}:`, error);
    return [];
  }
}