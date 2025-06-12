// Helper function to extract a plausible domain from DuckDuckGo HTML
// This is a very basic heuristic and might not be accurate.
export const extractDomainFromHtml = (html: string, query: string): string | null => {
  try {
    // DuckDuckGo HTML results often have links like:
    // <a class="result__a" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.example.com&amp;rut=...">Example Domain</a>
    // Or direct links in some cases. We need to be flexible.
    // Let's prioritize result__a which seems common for organic results.
    const linkRegex = /<a\s+[^>]*?class="(?:result__a|result__url)"\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
    let match;
    const MAX_LINKS_TO_CHECK = 5;
    let linksChecked = 0;
    let potentialDomains: { domain: string, text: string }[] = [];

    while ((match = linkRegex.exec(html)) !== null && linksChecked < MAX_LINKS_TO_CHECK) {
      linksChecked++;
      let rawUrl = match[1];
      const linkText = match[2].replace(/<[^>]+>/g, ''); // Strip HTML from link text

      if (rawUrl.startsWith("/l/") || rawUrl.includes("duckduckgo.com/l/")) { // Handle DuckDuckGo redirect links
        const uddgParam = rawUrl.match(/[?&]uddg=([^&]+)/);
        if (uddgParam && uddgParam[1]) {
          try {
            rawUrl = decodeURIComponent(uddgParam[1]);
          } catch (e) {
            console.warn(`Failed to decode URL component: ${uddgParam[1]}`, e);
            continue;
          }
        } else {
          continue;
        }
      }

      if (!rawUrl.startsWith("http")) {
        if (rawUrl.startsWith("//")) {
          rawUrl = "https:" + rawUrl;
        } else if (rawUrl.startsWith("/")) {
          continue; // Skip relative paths on duckduckgo.com itself
        } else {
          rawUrl = "https://" + rawUrl; // Assume https if no protocol for external links
        }
      }

      try {
        const urlObj = new URL(rawUrl);
        // Normalize hostname by removing 'www.' prefix for consistency
        const domain = urlObj.hostname.startsWith("www.") ? urlObj.hostname.substring(4) : urlObj.hostname;

        // Skip social media, pdfs, images, etc. This list can be expanded.
        const commonNonMainDomains = ["facebook.com", "twitter.com", "linkedin.com", "youtube.com", "instagram.com", "pinterest.com", "tiktok.com", "wikipedia.org", "amazon.com", "ebay.com"];
        const fileExtensions = [".pdf", ".jpg", ".png", ".gif", ".zip", ".mp4", ".mp3"];
        if (commonNonMainDomains.some(d => domain.includes(d)) || fileExtensions.some(ext => urlObj.pathname.endsWith(ext))) {
          continue;
        }
        potentialDomains.push({ domain, text: linkText });
      } catch (e) {
        console.warn(`Invalid URL encountered during parsing: ${rawUrl}`, e);
        // Continue to the next match if current URL is invalid
      }
    }

    // Basic scoring: prefer domains where the link text or domain itself closely matches the query
    if (potentialDomains.length > 0) {
      const lowerQuery = query.toLowerCase();
      potentialDomains.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        // Prioritize matches in domain name
        if (a.domain.includes(lowerQuery)) scoreA += 3;
        if (b.domain.includes(lowerQuery)) scoreB += 3;
        // Then matches in link text
        if (a.text.toLowerCase().includes(lowerQuery)) scoreA += 2;
        if (b.text.toLowerCase().includes(lowerQuery)) scoreB += 2;
        // Slight preference for domain starting with query (more specific)
        if (a.domain.startsWith(lowerQuery)) scoreA += 1;
        if (b.domain.startsWith(lowerQuery)) scoreB += 1;

        // Add a small penalty for generic terms in domain if query is specific
        // (This is a placeholder for more advanced logic)
        if (a.domain.match(/generic|platform|service/i) && !lowerQuery.match(/generic|platform|service/i)) scoreA -=1;
        if (b.domain.match(/generic|platform|service/i) && !lowerQuery.match(/generic|platform|service/i)) scoreB -=1;

        return scoreB - scoreA; // Sort descending by score
      });
      return potentialDomains[0].domain; // Return the highest scored domain
    }

  } catch (e) {
    console.error("Error during HTML parsing for domain extraction:", e);
  }
  return null; // No plausible domain found
};
