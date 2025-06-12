import React from "react";
import { Link, useRoute } from "wouter";
import useTheme from '@/hooks/useTheme'; // Added import

export function Header() {
  const baseStyle = "px-4 py-2 rounded-md text-sm font-medium transition-colors";
  const inactiveStyle = `${baseStyle} bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-600`;
  const activeStyle = `${baseStyle} bg-slate-50 text-primary dark:bg-neutral-900 dark:text-primary-foreground`;

  const [isCompanyLookupActive] = useRoute("/company-lookup");
  const [isWebsiteLookupActive] = useRoute("/website-lookup"); // Renamed from isEmailLookupActive
  const [isAddressLookupActive] = useRoute("/address-lookup");
  const { theme, toggleTheme } = useTheme(); // Call the hook

  return (
    <header className="p-4 bg-slate-100 dark:bg-neutral-800 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Beluga Lead Scraper</h1>
          <p className="text-slate-600 dark:text-slate-300">Extract contact info from multiple companies and download as CSV</p>
        </div>
        <nav>
          <ul className="flex space-x-4 items-center"> {/* Added items-center */}
            <li>
              <Link href="/company-lookup" className={isCompanyLookupActive ? activeStyle : inactiveStyle}>
                Company Lookup
              </Link>
            </li>
            <li>
              <Link href="/website-lookup" className={isWebsiteLookupActive ? activeStyle : inactiveStyle}>
                Website Lookup
              </Link>
            </li>
            <li>
              <Link href="/address-lookup" className={isAddressLookupActive ? activeStyle : inactiveStyle}>
                Address Lookup
              </Link>
            </li>
            <li className="ml-4"> {/* Added margin-left to separate from nav links */}
              <button
                onClick={toggleTheme} // Use toggleTheme function
                className="p-2 rounded-full text-lg text-slate-700 hover:bg-slate-300 dark:text-slate-200 dark:hover:bg-slate-600"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? '☀️' : '🌙'} {/* Dynamic icon */}
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
