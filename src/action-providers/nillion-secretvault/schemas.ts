import { z } from "zod";

// Configuration schemas
export const ConfigureNodesSchema = z
  .object({
    nodes: z.array(
      z.object({
        url: z.string().url(),
        did: z.string(),
      })
    ),
    credentials: z.object({
      secretKey: z.string(),
      orgDid: z.string(),
    }),
  })
  .strip();

export const CreateSchemaSchema = z
  .object({
    schemaType: z.enum(["SERVICE_LISTING", "BOOKING", "FEEDBACK"]),
    title: z.string().optional(),
  })
  .strip();

// Service listing schemas
export const CreateServiceListingSchema = z
  .object({
    provider_name: z.string().describe("Name of the service provider (will be encrypted)"),
    provider_id: z.string().describe("ID of the service provider (will be encrypted)"),
    service_type: z.string().describe("Type of service offered (e.g., 'language_lesson', 'tutoring', 'consulting')"),
    service_details: z.object({
      title: z.string().describe("Title of the service"),
      description: z.string().describe("Description of the service"),
      duration_minutes: z.number().min(15).describe("Duration of the service in minutes"),
    }),
    availability: z.object({
      date: z.string().describe("Date of availability (YYYY-MM-DD)"),
      start_time: z.string().describe("Start time (HH:MM)"),
      end_time: z.string().describe("End time (HH:MM)"),
      timezone: z.string().describe("Timezone (e.g., 'America/Mexico_City')"),
    }),
    price: z.object({
      amount: z.number().positive(),
      currency: z.string(),
    }),
    contact_info: z.string().describe("Contact information for the provider (will be encrypted)"),
  })
  .strip();

export const QueryServiceListingsSchema = z
  .object({
    service_type: z.string().optional(),
    date: z.string().optional(),
    price_max: z.number().optional(),
  })
  .strip();

// Booking schemas
export const CreateBookingSchema = z
  .object({
    service_id: z.string().describe("ID of the service being booked"),
    customer_id: z.string().describe("ID of the customer (will be encrypted)"),
    customer_name: z.string().describe("Name of the customer (will be encrypted)"),
    meeting_link: z.string().optional().describe("Meeting link (will be encrypted)"),
  })
  .strip();

export const UpdateBookingStatusSchema = z
  .object({
    booking_id: z.string().describe("ID of the booking to update"),
    service_status: z.enum([
      "scheduled", 
      "in_progress", 
      "completed", 
      "cancelled", 
      "no_show"
    ]),
    payment_status: z.enum([
      "pending", 
      "paid", 
      "refunded", 
      "disputed"
    ]).optional(),
    notes: z.string().optional(),
    meeting_link: z.string().optional().describe("Meeting link (will be encrypted)"),
  })
  .strip();

export const GetBookingDetailsSchema = z
  .object({
    booking_id: z.string().describe("ID of the booking to retrieve"),
  })
  .strip();

// Feedback schemas
export const CreateFeedbackSchema = z
  .object({
    booking_id: z.string().describe("ID of the booking to provide feedback for"),
    provider_rating: z.number().min(1).max(5).optional().describe("Rating from 1-5 given by the provider"),
    customer_rating: z.number().min(1).max(5).optional().describe("Rating from 1-5 given by the customer"),
    provider_feedback: z.string().optional().describe("Feedback text from the provider"),
    customer_feedback: z.string().optional().describe("Feedback text from the customer"),
    agent_notes: z.string().optional().describe("Notes from the AI agent about the session (will be encrypted)"),
  })
  .strip();

export const ResolveFeedbackSchema = z
  .object({
    feedback_id: z.string().describe("ID of the feedback to resolve"),
    resolution_status: z.enum([
      "pending", 
      "resolved", 
      "disputed", 
      "refunded"
    ]),
    resolution_notes: z.string().optional(),
  })
  .strip();

export const GetFeedbackSchema = z
  .object({
    feedback_id: z.string().describe("ID of the feedback to retrieve"),
  })
  .strip(); 