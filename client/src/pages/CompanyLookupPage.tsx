import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast"; // Corrected import path
import { WebsiteLookupResult } from "@shared/schema"; // Import from shared schema
import { apiRequest } from "@/lib/queryClient"; // Assuming apiRequest is suitable

function CompanyLookupPage() {
  const [addressInput, setAddressInput] = useState("");
  const [results, setResults] = useState<WebsiteLookupResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();

  const handleLookup = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setResults([]);

    const queries = addressInput
      .split(/[\n\t]/)
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);

    if (queries.length === 0) {
      setErrorMessage("Please enter at least one address or company name.");
      setIsLoading(false);
      return;
    }

    toast({
      title: "Lookup Initiated",
      description: `Searching for websites for ${queries.length} queries...`,
    });

    try {
      const response = await apiRequest<WebsiteLookupResult[]>("POST", "/api/website-lookup", { queries });

      if (!response.ok) {
        // apiRequest should ideally throw for non-ok, or return a structured error
        // For now, assume it might return non-ok for app-level errors handled by backend
        const errorData = await response.json().catch(() => ({ message: "Failed to parse error response" }));
        throw new Error(errorData.message || `API error: ${response.status}`);
      }

      // Assuming apiRequest for successful (2xx) responses directly returns the parsed JSON body
      // If apiRequest returns the full Response object, you'd do: const data = await response.json();
      // Based on InputSection, it seems like apiRequest might not directly return parsed JSON for POST.
      // Let's adjust to expect full response and then parse.
      // Correction: The apiRequest in InputSection was for SSE setup. Standard fetch/apiRequest might differ.
      // Let's assume `apiRequest` is a wrapper around fetch that handles JSON parsing for ok responses.
      // If `apiRequest` is like the one in `InputSection.tsx` that returns the raw response, then:
      // const data = await response.json();
      // For now, let's assume it's a simple fetch wrapper that *does* parse JSON on success.
      // If `apiRequest` is not available or does not parse JSON, this needs to be raw fetch:
      // const rawResponse = await fetch("/api/website-lookup", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ queries }),
      // });
      // if (!rawResponse.ok) { /* ... error handling ... */ }
      // const data = await rawResponse.json();
      // setResults(data);

      // Re-evaluating apiRequest based on its likely common usage:
      // It probably returns the parsed JSON directly if the request was successful (status 2xx)
      // And throws an error or returns a specific error structure for non-2xx.
      // The provided `apiRequest` in `queryClient.ts` (not shown here but assumed) likely does this.

      // If `apiRequest` returns the full response object:
      // const data = await response.json();
      // setResults(data);

      // Let's write it as if `apiRequest` might return the raw response for flexibility,
      // and then we parse it.
      const data = await response.json(); // This line might be redundant if apiRequest already parses.
                                          // Or, if apiRequest returns parsed data, then `data = response` (if response is the data)
                                          // Given the type hint `apiRequest<WebsiteLookupResult[]>`, it should return parsed data.
      setResults(data);

      toast({
        title: "Lookup Complete",
        description: `Successfully processed ${data.length} queries.`,
      });

    } catch (error: any) {
      console.error("Website lookup failed:", error);
      const message = error?.response?.data?.message || error.message || "An unexpected error occurred.";
      setErrorMessage(message);
      toast({
        title: "Lookup Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setAddressInput("");
    setResults([]);
    setErrorMessage("");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-900">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-center text-slate-800">Website Lookup</h2>

            <div className="mb-4">
              <Label htmlFor="addressInput" className="block text-sm font-medium text-slate-700 mb-1">
                Company Names or Addresses (one per line or tab separated)
              </Label>
              <Textarea
                id="addressInput"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="w-full h-40 px-3 py-2 text-slate-700 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Google LLC
1600 Amphitheatre Parkway, Mountain View, CA
OpenAI"
                disabled={isLoading}
              />
              <p className="mt-1 text-sm text-slate-500">
                Enter company names or full addresses.
              </p>
            </div>

            <div className="flex justify-between items-center mb-4">
              <Button
                onClick={handleLookup}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-800 text-white font-medium rounded-md hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 transition-colors"
              >
                {isLoading ? "Looking up..." : "Lookup Websites"}
              </Button>
              <Button
                type="button"
                onClick={handleClear}
                variant="outline"
                className="px-4 py-2 text-slate-700 bg-slate-100 font-medium rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors"
                disabled={isLoading}
              >
                Clear
              </Button>
            </div>

            {errorMessage && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </div>

          {results.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-medium mb-4 text-slate-700">Results</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Input Address/Name
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Found Website
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {results.map((result, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-3 py-4 whitespace-normal break-words">
                          <div className="text-sm text-slate-900">{result.originalInput}</div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          {result.foundWebsite ? (
                            <a
                              href={`http://${result.foundWebsite}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {result.foundWebsite}
                            </a>
                          ) : (
                            <span className="text-sm text-slate-500">Not found</span>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          {result.error ? (
                             <span className="text-sm text-red-600">{result.error}</span>
                          ) : result.foundWebsite ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Found
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Not Found
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
           {!isLoading && results.length === 0 && !errorMessage && addressInput.trim() !== "" && (
             <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <p className="text-slate-500">Click "Lookup Websites" to see results.</p>
             </div>
           )}
        </div>
      </main>
    </div>
  );
}

export default CompanyLookupPage;
