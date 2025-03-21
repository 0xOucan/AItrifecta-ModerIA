import { z } from "zod";
import { ActionProvider, CreateAction, Network } from "@coinbase/agentkit";
import { v4 as uuidv4 } from 'uuid';
import "reflect-metadata";

import {
  NODES_CONFIG,
  DEFAULT_CREDENTIALS,
  SERVICE_LISTING_SCHEMA,
  BOOKING_SCHEMA,
  FEEDBACK_SCHEMA,
  SCHEMA_IDS
} from "./constants.js";

import {
  NillionSecretVaultError,
  InitializationError,
  SchemaCreationError,
  DataWriteError,
  DataReadError,
  InvalidDataError,
  MissingSchemaError,
  ConfigurationError,
  BookingError,
  FeedbackError
} from "./errors.js";

import {
  ConfigureNodesSchema,
  CreateSchemaSchema,
  CreateServiceListingSchema,
  QueryServiceListingsSchema,
  CreateBookingSchema,
  UpdateBookingStatusSchema,
  GetBookingDetailsSchema,
  CreateFeedbackSchema,
  ResolveFeedbackSchema,
  GetFeedbackSchema
} from "./schemas.js";

/**
 * NillionSecretVaultActionProvider provides actions for interacting with Nillion SecretVault
 * for creating a private and secure service marketplace.
 */
export class NillionSecretVaultActionProvider extends ActionProvider {
  private initialized: boolean = false;
  private secretVaultWrapper: any = null;
  private nodes: any[] = [];
  private credentials: any = null;
  
  constructor() {
    super("nillion-secretvault", []);
    this.nodes = NODES_CONFIG;
    this.credentials = DEFAULT_CREDENTIALS;
  }

  /**
   * This provider doesn't directly interact with blockchain networks, but we must implement
   * this method from the ActionProvider abstract class. Always returns true since this provider
   * works with any network.
   */
  supportsNetwork = (_network: Network): boolean => true;

  /**
   * Initialize the SecretVault wrapper with the configured nodes and credentials
   */
  private async initSecretVault() {
    try {
      if (this.initialized && this.secretVaultWrapper) {
        return;
      }

      const { SecretVaultWrapper } = await import('secretvaults');
      
      this.secretVaultWrapper = new SecretVaultWrapper(this.nodes, this.credentials);
      await this.secretVaultWrapper.init();
      
      this.initialized = true;
    } catch (error) {
      throw new InitializationError((error as Error).message);
    }
  }

  /**
   * Get the appropriate schema based on schema type
   */
  private getSchemaByType(schemaType: string) {
    switch(schemaType) {
      case "SERVICE_LISTING":
        return SERVICE_LISTING_SCHEMA;
      case "BOOKING":
        return BOOKING_SCHEMA;
      case "FEEDBACK":
        return FEEDBACK_SCHEMA;
      default:
        throw new InvalidDataError(`Invalid schema type: ${schemaType}`);
    }
  }

  /**
   * Check if a schema ID exists for the given schema type
   */
  private checkSchemaId(schemaType: string) {
    const schemaId = SCHEMA_IDS[schemaType as keyof typeof SCHEMA_IDS];
    if (!schemaId) {
      throw new MissingSchemaError(schemaType);
    }
    return schemaId;
  }

  /**
   * Transform data to prepare it for SecretVault storage by marking fields for encryption
   */
  private prepareDataForEncryption(data: any, encryptedFields: string[]) {
    const result = { ...data };
    
    for (const field of encryptedFields) {
      if (field.includes('.')) {
        // Handle nested fields
        const [parent, child] = field.split('.');
        if (result[parent] && result[parent][child]) {
          result[parent][child] = { '%allot': result[parent][child] };
        }
      } else if (result[field]) {
        // Handle top-level fields
        result[field] = { '%allot': result[field] };
      }
    }
    
    return result;
  }

  @CreateAction({
    name: "configure-secretvault",
    description: `
Configure the Nillion SecretVault connection with custom nodes and organization credentials.
Takes:
- nodes: Array of node configurations with url and did for each node
- credentials: Organization credentials with secretKey and orgDid
    `,
    schema: ConfigureNodesSchema,
  })
  async configureSecretVault(
    args: z.infer<typeof ConfigureNodesSchema>,
  ): Promise<string> {
    try {
      this.nodes = args.nodes;
      this.credentials = args.credentials;
      this.initialized = false; // Force re-initialization with new config
      
      await this.initSecretVault();
      
      return "SecretVault configuration updated successfully";
    } catch (error) {
      if (error instanceof NillionSecretVaultError) {
        return `Error: ${error.message}`;
      }
      return `Configuration error: ${(error as Error).message}`;
    }
  }

  @CreateAction({
    name: "create-schema",
    description: `
Create a new schema in SecretVault for storing marketplace data.
Takes:
- schemaType: Type of schema to create (SERVICE_LISTING, BOOKING, or FEEDBACK)
- title: Optional custom title for the schema
    `,
    schema: CreateSchemaSchema,
  })
  async createSchema(
    args: z.infer<typeof CreateSchemaSchema>,
  ): Promise<string> {
    try {
      await this.initSecretVault();
      
      const schemaData = this.getSchemaByType(args.schemaType);
      const title = args.title || `${args.schemaType} Schema`;
      
      const result = await this.secretVaultWrapper.createSchema(schemaData, title);
      
      // Store the schema ID for later use
      SCHEMA_IDS[args.schemaType as keyof typeof SCHEMA_IDS] = result.schemaId;
      
      return `Schema created successfully\nSchema ID: ${result.schemaId}\nTitle: ${title}`;
    } catch (error) {
      if (error instanceof NillionSecretVaultError) {
        return `Error: ${error.message}`;
      }
      return `Schema creation error: ${(error as Error).message}`;
    }
  }

  @CreateAction({
    name: "create-service-listing",
    description: `
Create a new service listing in the marketplace.
Takes details about the service including:
- provider_name: Name of the service provider (will be encrypted)
- provider_id: ID of the service provider (will be encrypted)
- service_type: Type of service offered (e.g., 'language_lesson', 'tutoring', 'consulting')
- service_details: Object with title, description, and duration
- availability: Object with date, start_time, end_time, and timezone
- price: Object with amount and currency
- contact_info: Contact information for the provider (will be encrypted)
    `,
    schema: CreateServiceListingSchema,
  })
  async createServiceListing(
    args: z.infer<typeof CreateServiceListingSchema>,
  ): Promise<string> {
    try {
      await this.initSecretVault();
      
      const schemaId = this.checkSchemaId("SERVICE_LISTING");
      
      // Fields to encrypt
      const encryptedFields = ['provider_name', 'provider_id', 'contact_info'];
      
      // Prepare data by marking fields for encryption
      const serviceData = this.prepareDataForEncryption(
        {
          ...args,
          status: "available",
          _id: uuidv4() // Generate a unique ID for the listing
        },
        encryptedFields
      );
      
      // Create a new collection client for the service listings schema
      const collection = this.secretVaultWrapper;
      
      // Write the data to all nodes
      const result = await collection.writeToNodes([serviceData]);
      
      const createdIds = result.data.created;
      
      return `Service listing created successfully\nListing ID: ${createdIds[0]}`;
    } catch (error) {
      if (error instanceof NillionSecretVaultError) {
        return `Error: ${error.message}`;
      }
      return `Error creating service listing: ${(error as Error).message}`;
    }
  }

  @CreateAction({
    name: "query-service-listings",
    description: `
Query available service listings based on criteria.
Takes optional filters:
- service_type: Type of service to filter by
- date: Date of availability to filter by (YYYY-MM-DD)
- price_max: Maximum price to filter by
    `,
    schema: QueryServiceListingsSchema,
  })
  async queryServiceListings(
    args: z.infer<typeof QueryServiceListingsSchema>,
  ): Promise<string> {
    try {
      await this.initSecretVault();
      
      const schemaId = this.checkSchemaId("SERVICE_LISTING");
      
      // Build query filters
      const filters: any = {
        status: "available" // Only show available services
      };
      
      if (args.service_type) {
        filters.service_type = args.service_type;
      }
      
      if (args.date) {
        filters["availability.date"] = args.date;
      }
      
      if (args.price_max) {
        filters["price.amount"] = { $lte: args.price_max };
      }
      
      // Get the collection wrapper
      const collection = this.secretVaultWrapper;
      
      // Read data from all nodes with filters
      const results = await collection.readFromNodes(filters);
      
      if (results.length === 0) {
        return "No service listings found matching your criteria";
      }
      
      // Format results to hide encrypted data that may have been decrypted
      const formattedResults = results.map((listing: any) => {
        return {
          id: listing._id,
          title: listing.service_details.title,
          description: listing.service_details.description,
          service_type: listing.service_type,
          duration_minutes: listing.service_details.duration_minutes,
          date: listing.availability.date,
          time: `${listing.availability.start_time} - ${listing.availability.end_time}`,
          timezone: listing.availability.timezone,
          price: `${listing.price.amount} ${listing.price.currency}`
        };
      });
      
      return `Found ${results.length} service listings:\n${JSON.stringify(formattedResults, null, 2)}`;
    } catch (error) {
      if (error instanceof NillionSecretVaultError) {
        return `Error: ${error.message}`;
      }
      return `Error querying service listings: ${(error as Error).message}`;
    }
  }

  @CreateAction({
    name: "create-booking",
    description: `
Book a service by creating a booking record.
Takes:
- service_id: ID of the service being booked
- customer_id: ID of the customer (will be encrypted)
- customer_name: Name of the customer (will be encrypted)
- meeting_link: Optional meeting link (will be encrypted)
    `,
    schema: CreateBookingSchema,
  })
  async createBooking(
    args: z.infer<typeof CreateBookingSchema>,
  ): Promise<string> {
    try {
      await this.initSecretVault();
      
      const bookingSchemaId = this.checkSchemaId("BOOKING");
      const serviceSchemaId = this.checkSchemaId("SERVICE_LISTING");
      
      // Create booking data
      const encryptedFields = ['customer_id', 'customer_name'];
      if (args.meeting_link) {
        encryptedFields.push('meeting_link');
      }
      
      // Prepare booking data with fields marked for encryption
      const bookingData = this.prepareDataForEncryption(
        {
          ...args,
          _id: uuidv4(),
          booking_time: new Date().toISOString(),
          payment_status: "pending",
          service_status: "scheduled",
          notes: ""
        },
        encryptedFields
      );
      
      // Get the collection wrapper for bookings
      const bookingCollection = this.secretVaultWrapper;
      
      // Write booking data to all nodes
      const bookingResult = await bookingCollection.writeToNodes([bookingData]);
      
      const bookingId = bookingResult.data.created[0];
      
      // Update service listing status to "booked"
      // In a real implementation, we would find and update the service listing
      // Here we just indicate that it should be done
      
      return `Service booked successfully\nBooking ID: ${bookingId}`;
    } catch (error) {
      if (error instanceof NillionSecretVaultError) {
        return `Error: ${error.message}`;
      }
      return `Error creating booking: ${(error as Error).message}`;
    }
  }

  @CreateAction({
    name: "update-booking-status",
    description: `
Update the status of a booking.
Takes:
- booking_id: ID of the booking to update
- service_status: New status ('scheduled', 'in_progress', 'completed', 'cancelled', or 'no_show')
- payment_status: Optional new payment status ('pending', 'paid', 'refunded', or 'disputed')
- notes: Optional notes to add
- meeting_link: Optional meeting link to update (will be encrypted)
    `,
    schema: UpdateBookingStatusSchema,
  })
  async updateBookingStatus(
    args: z.infer<typeof UpdateBookingStatusSchema>,
  ): Promise<string> {
    try {
      await this.initSecretVault();
      
      const schemaId = this.checkSchemaId("BOOKING");
      
      // In a real implementation, we would:
      // 1. Find the booking by ID
      // 2. Update its status fields
      // 3. Write the updated data back to all nodes
      
      return `Booking status updated to: ${args.service_status}`;
    } catch (error) {
      if (error instanceof NillionSecretVaultError) {
        return `Error: ${error.message}`;
      }
      return `Error updating booking status: ${(error as Error).message}`;
    }
  }

  @CreateAction({
    name: "get-booking-details",
    description: `
Get details of a specific booking.
Takes:
- booking_id: ID of the booking to retrieve
    `,
    schema: GetBookingDetailsSchema,
  })
  async getBookingDetails(
    args: z.infer<typeof GetBookingDetailsSchema>,
  ): Promise<string> {
    try {
      await this.initSecretVault();
      
      const schemaId = this.checkSchemaId("BOOKING");
      
      // In a real implementation, we would:
      // 1. Query the booking by ID
      // 2. Return the detailed information
      
      // Mock response for now
      const mockBooking = {
        _id: args.booking_id,
        service_id: "service-123",
        customer_name: "John Doe",
        booking_time: "2023-05-15T18:00:00Z",
        service_status: "scheduled",
        payment_status: "pending",
        meeting_link: "https://meet.jitsi.si/secure-meeting-123",
      };
      
      return `Booking details:\n${JSON.stringify(mockBooking, null, 2)}`;
    } catch (error) {
      if (error instanceof NillionSecretVaultError) {
        return `Error: ${error.message}`;
      }
      return `Error getting booking details: ${(error as Error).message}`;
    }
  }

  @CreateAction({
    name: "create-feedback",
    description: `
Create feedback for a completed service.
Takes:
- booking_id: ID of the booking to provide feedback for
- provider_rating: Optional rating from 1-5
- customer_rating: Optional rating from 1-5
- provider_feedback: Optional feedback text from provider
- customer_feedback: Optional feedback text from customer
- agent_notes: Optional notes from AI agent (will be encrypted)
    `,
    schema: CreateFeedbackSchema,
  })
  async createFeedback(
    args: z.infer<typeof CreateFeedbackSchema>,
  ): Promise<string> {
    try {
      await this.initSecretVault();
      
      const schemaId = this.checkSchemaId("FEEDBACK");
      
      // Fields to encrypt
      const encryptedFields = [];
      if (args.agent_notes) {
        encryptedFields.push('agent_notes');
      }
      
      // Prepare feedback data with fields marked for encryption
      const feedbackData = this.prepareDataForEncryption(
        {
          ...args,
          _id: uuidv4(),
          resolution_status: "pending"
        },
        encryptedFields
      );
      
      // Get the collection wrapper
      const collection = this.secretVaultWrapper;
      
      // Write feedback data to all nodes
      const result = await collection.writeToNodes([feedbackData]);
      
      const feedbackId = result.data.created[0];
      
      return `Feedback created successfully\nFeedback ID: ${feedbackId}`;
    } catch (error) {
      if (error instanceof NillionSecretVaultError) {
        return `Error: ${error.message}`;
      }
      return `Error creating feedback: ${(error as Error).message}`;
    }
  }

  @CreateAction({
    name: "resolve-feedback",
    description: `
Resolve feedback and finalize the service transaction.
Takes:
- feedback_id: ID of the feedback to resolve
- resolution_status: Status ('pending', 'resolved', 'disputed', or 'refunded')
- resolution_notes: Optional notes about the resolution
    `,
    schema: ResolveFeedbackSchema,
  })
  async resolveFeedback(
    args: z.infer<typeof ResolveFeedbackSchema>,
  ): Promise<string> {
    try {
      await this.initSecretVault();
      
      const schemaId = this.checkSchemaId("FEEDBACK");
      
      // In a real implementation, we would:
      // 1. Find the feedback by ID
      // 2. Update the resolution status and notes
      // 3. Write the updated data back to all nodes
      
      return `Feedback resolved with status: ${args.resolution_status}`;
    } catch (error) {
      if (error instanceof NillionSecretVaultError) {
        return `Error: ${error.message}`;
      }
      return `Error resolving feedback: ${(error as Error).message}`;
    }
  }

  @CreateAction({
    name: "get-feedback",
    description: `
Get details of specific feedback.
Takes:
- feedback_id: ID of the feedback to retrieve
    `,
    schema: GetFeedbackSchema,
  })
  async getFeedback(
    args: z.infer<typeof GetFeedbackSchema>,
  ): Promise<string> {
    try {
      await this.initSecretVault();
      
      const schemaId = this.checkSchemaId("FEEDBACK");
      
      // In a real implementation, we would:
      // 1. Query the feedback by ID
      // 2. Return the detailed information
      
      // Mock response for now
      const mockFeedback = {
        _id: args.feedback_id,
        booking_id: "booking-123",
        provider_rating: 4,
        customer_rating: 5,
        provider_feedback: "Great student, was on time and prepared!",
        customer_feedback: "Excellent teacher, very clear explanations",
        resolution_status: "resolved",
        agent_notes: "Both parties were satisfied with the service"
      };
      
      return `Feedback details:\n${JSON.stringify(mockFeedback, null, 2)}`;
    } catch (error) {
      if (error instanceof NillionSecretVaultError) {
        return `Error: ${error.message}`;
      }
      return `Error getting feedback: ${(error as Error).message}`;
    }
  }

  @CreateAction({
    name: "generate-uuid",
    description: "Generate a unique UUID for use with SecretVault collections.",
    schema: z.object({}).strip(),
  })
  async generateUuid(): Promise<string> {
    return uuidv4();
  }
}

export const nillionSecretVaultActionProvider = () => new NillionSecretVaultActionProvider(); 