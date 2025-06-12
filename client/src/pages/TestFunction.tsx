import React from "react";

function TestFunction() { // Component name matches default export expected by App.tsx router
  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-3xl font-bold mb-4 text-slate-700">Test Function Page</h1>
      <p className="text-xl text-slate-500">Content Coming Soon!</p>
    </div>
  );
}

export default TestFunction;
