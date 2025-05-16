import React from "react";

export function InstructionsCard() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <h2 className="text-xl font-medium mb-4">How it works</h2>
      <ol className="list-decimal list-inside space-y-2 text-slate-700">
        <li>Enter one or more website URLs (one per line)</li>
        <li>Click "Start Scraping" to begin the process</li>
        <li>Our service will crawl each website and search for email addresses</li>
        <li>Results will appear in the table on the right</li>
        <li>Download your results as a CSV file when complete</li>
      </ol>
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
        <p className="text-sm text-amber-700">
          <strong>Note:</strong> Processing time depends on the number of URLs and website complexity. Please be patient.
        </p>
      </div>
    </div>
  );
}
