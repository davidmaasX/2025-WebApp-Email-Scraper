import React from "react";

function AddressLookupPage() { // Component name matches default export expected by App.tsx router
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-900">
      <main className="container mx-auto px-4 py-8 text-center"> {/* Using py-8 for consistency */}
        <h1 className="text-3xl font-bold mb-4 text-slate-700 dark:text-slate-200">Address Lookup Page</h1>
        <p className="text-xl text-slate-500 dark:text-slate-400">Content Coming Soon!</p>
      </main>
    </div>
  );
}

export default AddressLookupPage;
