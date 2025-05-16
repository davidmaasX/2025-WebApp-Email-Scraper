import React from "react";
import { CSVLink } from "react-csv";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { EmailResult } from "@shared/schema";

interface ResultsSectionProps {
  results: EmailResult[];
  onDownload: () => void;
}

export function ResultsSection({ results, onDownload }: ResultsSectionProps) {
  const hasResults = results.length > 0;
  
  // Prepare data for CSV download
  const csvData = [
    // Header row with 15 email columns
    ["website", ...Array.from({ length: 15 }, (_, i) => `email${i + 1}`)],
    // Data rows
    ...results.map(result => {
      const { website, emails } = result;
      // Fill remaining columns with empty strings if fewer than 15 emails
      const emailColumns = [...emails, ...Array.from({ length: 15 - emails.length }, () => "")];
      return [website, ...emailColumns];
    })
  ];
  
  const handleDownload = () => {
    onDownload();
  };
  
  return (
    <section className="w-full lg:w-1/2">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium">Results</h2>
          
          {hasResults && (
            <CSVLink
              data={csvData}
              filename="email_results.csv"
              onClick={handleDownload}
              className="hidden"
              id="csvDownloadLink"
            >
              Download CSV
            </CSVLink>
          )}
          
          <Button
            id="downloadBtn"
            onClick={() => {
              // Trigger the hidden CSVLink click
              document.getElementById("csvDownloadLink")?.click();
            }}
            disabled={!hasResults}
            className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            <span>Download CSV</span>
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Website
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Email Addresses
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {!hasResults ? (
                <tr id="noResultsRow">
                  <td colSpan={2} className="px-3 py-8 text-center text-slate-500">
                    No results yet. Enter URLs and click "Start Scraping".
                  </td>
                </tr>
              ) : results.length > 0 ? (
                results.map((result, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-slate-900">{result.website}</div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      {result.emails.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {result.emails.map((email, emailIndex) => (
                            <span 
                              key={emailIndex} 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {email}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">No emails found</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-3 py-8 text-center">
                    <div className="py-12 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-slate-900">No emails found</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        We couldn't find any email addresses for the provided URLs.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
