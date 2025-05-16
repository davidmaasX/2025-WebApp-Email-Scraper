import React from "react";
import { ProcessingStatus as ProcessingStatusType } from "@/lib/types";

interface ProcessingStatusProps {
  status: ProcessingStatusType;
}

export function ProcessingStatus({ status }: ProcessingStatusProps) {
  const { isProcessing, current, total, currentWebsite } = status;
  
  if (!isProcessing) return null;
  
  const progressPercentage = (current / total) * 100;
  
  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-slate-700">Processing URLs...</h3>
        <span className="text-sm text-slate-500">{current} of {total}</span>
      </div>
      
      <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2">
        <div 
          className="bg-primary h-2.5 rounded-full" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      <div className="flex items-center">
        <span className="text-sm text-slate-600">Processing: {currentWebsite}</span>
      </div>
    </div>
  );
}
