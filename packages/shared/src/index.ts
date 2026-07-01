import { z } from "zod";

export const serverNameSchema = z.literal("Zero");
export const campSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5)
]);

export const listingTypeSchema = z.union([
  z.literal("auction"),
  z.literal("buy_now")
]);

export type ListingType = z.infer<typeof listingTypeSchema>;
