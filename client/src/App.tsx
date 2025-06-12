import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
// import Home from "@/pages/Home"; // Home will be replaced by LeadScraper as the default
import CompanyLookupPage from "@/pages/CompanyLookupPage"; // Updated import
import NewWebsiteLookupPage from "@/pages/NewWebsiteLookupPage"; // Updated import
import AddressLookupPage from "@/pages/AddressLookupPage"; // Updated import
import { Header } from "@/components/Header"; // Import Header

function Router() {
  return (
    <Switch>
      <Route path="/company-lookup" component={CompanyLookupPage} /> {/* Updated component */}
      <Route path="/website-lookup" component={NewWebsiteLookupPage} /> {/* Updated component */}
      <Route path="/address-lookup" component={AddressLookupPage} /> {/* Updated component */}
      <Route path="/">
        <Redirect to="/website-lookup" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Header /> {/* Add Header here */}
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
