import React from "react";
import { Link } from "wouter";

export function Header() {
  return (
    <header className="mb-8 p-4 bg-slate-100 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Email Scraper Tool</h1>
          <p className="text-slate-600">Extract email addresses from multiple websites and download as CSV</p>
        </div>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <Link href="/website-lookup" className="text-slate-700 hover:text-slate-900">
                Website Lookup
              </Link>
            </li>
            <li>
              <Link href="/lead-scraper" className="text-slate-700 hover:text-slate-900">
                Lead Scraper
              </Link>
            </li>
            <li>
              <Link href="/test-function" className="text-slate-700 hover:text-slate-900">
                Test Function
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
