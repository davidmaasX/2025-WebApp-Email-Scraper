import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Custom schema for URL validation
export const urlInputSchema = z.object({
  urls: z.string().min(1, "Please enter at least one URL")
});

export type UrlInput = z.infer<typeof urlInputSchema>;

// Email results schema
export const emailResultSchema = z.object({
  website: z.string(),
  emails: z.array(z.string()).max(15)
});

export type EmailResult = z.infer<typeof emailResultSchema>;

// Schema for CSV download
export const csvResultSchema = z.array(emailResultSchema);

export type CSVResult = z.infer<typeof csvResultSchema>;

// Website Lookup results schema
export const websiteLookupResultSchema = z.object({
  originalInput: z.string(),
  foundWebsite: z.string().nullable(), // URL or null if not found
  error: z.string().optional(),    // Optional error message
});

export type WebsiteLookupResult = z.infer<typeof websiteLookupResultSchema>;

// Schema for an array of website lookup results (e.g. for API response)
export const websiteLookupResultsListSchema = z.array(websiteLookupResultSchema);
