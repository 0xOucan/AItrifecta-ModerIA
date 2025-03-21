import { SecretVaultWrapper, Node, Credentials } from 'secretvaults';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import readline from 'readline';

// Load environment variables
config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Sample data for automated testing
const sampleData = {
  serviceListing: {
    providerName: "Maria Garcia",
    providerId: "provider-123",
    serviceType: "language_lesson",
    serviceDetails: {
      title: "Spanish Language Lessons",
      description: "Learn Spanish with a native speaker. Perfect for beginners to intermediate learners.",
      durationMinutes: 60
    },
    availability: {
      date: "2023-05-15",
      startTime: "15:00",
      endTime: "18:00",
      timezone: "America/Mexico_City"
    },
    price: {
      amount: 30,
      currency: "USD"
    },
    contactInfo: "maria@example.com"
  },
  booking: {
    customerId: "customer-456",
    customerName: "John Smith",
    meetingLink: "https://meet.example.com/abcd1234",
    customerEmail: "john@example.com"
  },
  feedback: {
    customerRating: 5,
    customerFeedback: "Maria was an excellent teacher and I learned a lot in just one session.",
    agentNotes: "High satisfaction from customer. Provider delivered quality service."
  },
  dispute: {
    reason: "Lesson was shorter than advertised",
    desiredResolution: "50% refund",
    evidenceDetails: "The session lasted only 30 minutes instead of the promised 60 minutes."
  }
};

// Simulated user input with delay
async function simulateTyping(message: string, delay = 500): Promise<void> {
  console.log(`${colors.cyan}User is typing...${colors.reset}`);
  await new Promise(resolve => setTimeout(resolve, delay));
  console.log(`${colors.cyan}User: ${message}${colors.reset}`);
}

// Display bot response
function displayBotResponse(message: string): void {
  console.log(`${colors.green}Bot: ${message}${colors.reset}`);
  console.log(`${colors.yellow}-------------------${colors.reset}`);
}

// Display bot form request and auto-fill response
async function simulateFormFilling(formTitle: string, fields: {[key: string]: string}, delay = 1000): Promise<void> {
  // Display the form request
  let formRequest = `Please provide the following information for ${formTitle}:\n`;
  Object.keys(fields).forEach(field => {
    formRequest += `- ${field}: ?\n`;
  });
  
  displayBotResponse(formRequest);
  
  // Simulate thinking delay
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Display auto-filled response
  let formResponse = `Here's my information for the ${formTitle}:\n`;
  Object.entries(fields).forEach(([field, value]) => {
    formResponse += `- ${field}: ${value}\n`;
  });
  
  await simulateTyping(formResponse, 800);
}

// Display error message
function displayError(message: string): void {
  console.error(`${colors.red}ERROR: ${message}${colors.reset}`);
}

// Display info message
function displayInfo(message: string): void {
  console.log(`${colors.blue}${message}${colors.reset}`);
}

// Display success message
function displaySuccess(message: string): void {
  console.log(`${colors.green}${message}${colors.reset}`);
}

// Helper function to wait for user to press any key
function waitForKeyPress(message = 'Press any key to continue...'): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${message}${colors.reset}`, () => {
      rl.close();
      resolve();
    });
  });
}

// Log timestamp
function logWithTimestamp(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`${colors.magenta}[${timestamp}] ${message}${colors.reset}`);
}

// Add a custom class that extends SecretVaultWrapper to add schema ID support
class EnhancedSecretVaultWrapper extends SecretVaultWrapper {
  constructor(nodes: Node[], credentials: Credentials) {
    super(nodes, credentials);
  }

  async writeWithSchema(data: any[], schemaId: string): Promise<any> {
    // Add schema ID to each record
    const enrichedData = data.map(item => ({
      ...item,
      schema: schemaId
    }));
    
    return await super.writeToNodes(enrichedData);
  }

  async readWithSchema(query: any, schemaId: string): Promise<any[]> {
    // Add schema ID to query
    const enrichedQuery = {
      ...query,
      schema: schemaId
    };
    
    return await super.readFromNodes(enrichedQuery);
  }
}

async function main() {
  try {
    displayInfo('=== NILLION SECRET VAULT TEST SCRIPT ===');
    displayInfo('This script tests real interactions with the Nillion SecretVault API');
    displayInfo('Each step will test a different functionality with actual data');
    displayInfo('Sample data will be automatically provided for all required fields');
    console.log(`${colors.yellow}-------------------${colors.reset}`);
    
    await waitForKeyPress('Press any key to start the test script...');
    
    // Verify environment variables
    if (!process.env.SV_ORG_DID || !process.env.SV_PRIVATE_KEY || 
        !process.env.SV_NODE1_URL || !process.env.SV_NODE1_DID || 
        !process.env.SV_NODE2_URL || !process.env.SV_NODE2_DID || 
        !process.env.SV_NODE3_URL || !process.env.SV_NODE3_DID ||
        !process.env.SCHEMA_ID_SERVICE_LISTING || 
        !process.env.SCHEMA_ID_BOOKING || 
        !process.env.SCHEMA_ID_FEEDBACK) {
      displayError('Required environment variables are missing.');
      displayError('Make sure all Nillion SecretVault variables are set in your .env file.');
      process.exit(1);
    }
    
    // Store schema IDs for ease of use
    const SERVICE_LISTING_SCHEMA_ID = process.env.SCHEMA_ID_SERVICE_LISTING as string;
    const BOOKING_SCHEMA_ID = process.env.SCHEMA_ID_BOOKING as string;
    const FEEDBACK_SCHEMA_ID = process.env.SCHEMA_ID_FEEDBACK as string;
    
    // Log schema IDs for verification
    displayInfo(`Using Service Listing Schema ID: ${SERVICE_LISTING_SCHEMA_ID}`);
    displayInfo(`Using Booking Schema ID: ${BOOKING_SCHEMA_ID}`);
    displayInfo(`Using Feedback Schema ID: ${FEEDBACK_SCHEMA_ID}`);
    
    // Connect to SecretVault
    logWithTimestamp('Initializing SecretVault connection...');
    
    const nodes: Node[] = [
      {
        url: process.env.SV_NODE1_URL!,
        did: process.env.SV_NODE1_DID!,
      },
      {
        url: process.env.SV_NODE2_URL!,
        did: process.env.SV_NODE2_DID!,
      },
      {
        url: process.env.SV_NODE3_URL!,
        did: process.env.SV_NODE3_DID!,
      }
    ];

    const credentials: Credentials = {
      secretKey: process.env.SV_PRIVATE_KEY!,
      orgDid: process.env.SV_ORG_DID!,
    };

    displayInfo('Connecting to Nillion nodes:');
    nodes.forEach((node, index) => {
      displayInfo(`Node ${index+1}: ${node.url} (${node.did.substring(0, 12)}...)`);
    });

    // Use the enhanced wrapper that includes schema ID support
    const secretVault = new EnhancedSecretVaultWrapper(nodes, credentials);
    logWithTimestamp('Initializing SecretVault wrapper...');
    await secretVault.init();
    displaySuccess('SecretVault connection established successfully');
    console.log(`${colors.yellow}-------------------${colors.reset}`);
    
    await waitForKeyPress();
    
    // Test 1: Create a service listing
    displayInfo('[DEMO] Scenario: Create a new language tutoring service listing with my information.');
    
    // Simulate user typing
    await simulateTyping('I want to create a new service listing for language lessons');
    
    // Simulate bot response asking for details and auto-filling the form
    await simulateFormFilling("language tutoring service", {
      "Provider Name": sampleData.serviceListing.providerName,
      "Provider ID": sampleData.serviceListing.providerId,
      "Service Type": sampleData.serviceListing.serviceType,
      "Title": sampleData.serviceListing.serviceDetails.title,
      "Description": sampleData.serviceListing.serviceDetails.description,
      "Duration (minutes)": sampleData.serviceListing.serviceDetails.durationMinutes.toString(),
      "Availability Date": sampleData.serviceListing.availability.date,
      "Start Time": sampleData.serviceListing.availability.startTime,
      "End Time": sampleData.serviceListing.availability.endTime,
      "Timezone": sampleData.serviceListing.availability.timezone,
      "Price Amount": sampleData.serviceListing.price.amount.toString(),
      "Price Currency": sampleData.serviceListing.price.currency,
      "Contact Info": sampleData.serviceListing.contactInfo
    });
    
    // Prepare the service listing data
    const serviceId = uuidv4();
    logWithTimestamp(`Generated Service ID: ${serviceId}`);
    
    const serviceListingData = {
      _id: serviceId,
      provider_name: { '%allot': sampleData.serviceListing.providerName },
      provider_id: { '%allot': sampleData.serviceListing.providerId },
      service_type: sampleData.serviceListing.serviceType,
      service_details: {
        title: sampleData.serviceListing.serviceDetails.title,
        description: sampleData.serviceListing.serviceDetails.description,
        duration_minutes: sampleData.serviceListing.serviceDetails.durationMinutes
      },
      availability: {
        date: sampleData.serviceListing.availability.date,
        start_time: sampleData.serviceListing.availability.startTime,
        end_time: sampleData.serviceListing.availability.endTime,
        timezone: sampleData.serviceListing.availability.timezone
      },
      price: {
        amount: sampleData.serviceListing.price.amount,
        currency: sampleData.serviceListing.price.currency
      },
      contact_info: { '%allot': sampleData.serviceListing.contactInfo },
      status: 'available'
    };
    
    // Write the service listing to SecretVault
    logWithTimestamp('Writing service listing to SecretVault...');
    try {
      displayInfo(`Data to write: ${JSON.stringify(serviceListingData, null, 2)}`);
      displayInfo(`Using schema ID: ${SERVICE_LISTING_SCHEMA_ID}`);
      
      // Use enhanced method that adds schema ID
      const result = await secretVault.writeWithSchema([serviceListingData], SERVICE_LISTING_SCHEMA_ID);
      
      // Check if the operation was successful
      if (result && result.data && result.data.created && result.data.created.length > 0) {
        displaySuccess(`Service listing created successfully with ID: ${result.data.created[0]}`);
        
        // Display success message
        displayBotResponse(`Service listing created successfully!
Service ID: ${serviceId}
Title: ${sampleData.serviceListing.serviceDetails.title}
Price: ${sampleData.serviceListing.price.amount} ${sampleData.serviceListing.price.currency}
Duration: ${sampleData.serviceListing.serviceDetails.durationMinutes} minutes`);
        
        displayInfo(`Full API Response: ${JSON.stringify(result, null, 2)}`);
      } else {
        displayError('Service listing creation failed - unexpected response format');
        displayInfo(`Response received: ${JSON.stringify(result, null, 2)}`);
      }
    } catch (error: any) {
      displayError(`Error creating service listing: ${error.message}`);
      if (error.stack) {
        displayInfo(`Stack trace: ${error.stack}`);
      }
      displayBotResponse('I encountered an error while creating your service listing. Please try again later.');
    }
    
    await waitForKeyPress();
    
    // Test 2: Query service listings
    displayInfo('[DEMO] Scenario: Show me available services that I can book.');
    
    // Simulate user typing a query with criteria
    await simulateFormFilling("service search", {
      "Service Type": sampleData.serviceListing.serviceType,
      "Date": sampleData.serviceListing.availability.date, 
      "Maximum Price": (sampleData.serviceListing.price.amount + 10).toString()
    });
    
    // Query the service listings
    logWithTimestamp('Querying service listings from SecretVault...');
    try {
      const filters = {
        service_type: sampleData.serviceListing.serviceType,
        status: 'available'
      };
      
      displayInfo(`Query filters: ${JSON.stringify(filters, null, 2)}`);
      displayInfo(`Using schema ID: ${SERVICE_LISTING_SCHEMA_ID}`);
      
      // Use enhanced method that adds schema ID
      const results = await secretVault.readWithSchema(filters, SERVICE_LISTING_SCHEMA_ID);
      
      logWithTimestamp(`Retrieved ${results.length} service listings`);
      
      if (results.length > 0) {
        // Format results for display
        const formattedResults = results.map((listing: any) => {
          return {
            id: listing._id,
            title: listing.service_details.title,
            description: listing.service_details.description,
            duration_minutes: listing.service_details.duration_minutes,
            date: listing.availability.date,
            time: `${listing.availability.start_time} - ${listing.availability.end_time}`,
            timezone: listing.availability.timezone,
            price: `${listing.price.amount} ${listing.price.currency}`
          };
        });
        
        displaySuccess(`Found ${results.length} service listings`);
        displayBotResponse(`Found ${formattedResults.length} language lessons:
${JSON.stringify(formattedResults, null, 2)}`);
        
        // Keep the raw data for the next test
        const firstListing = results[0];
        displayInfo(`First listing raw data: ${JSON.stringify(firstListing, null, 2)}`);
      } else {
        displayInfo('No service listings found matching criteria');
        displayBotResponse('I couldn\'t find any language lessons currently available.');
      }
    } catch (error: any) {
      displayError(`Error querying service listings: ${error.message}`);
      if (error.stack) {
        displayInfo(`Stack trace: ${error.stack}`);
      }
      displayBotResponse('I encountered an error while searching for services. Please try again later.');
    }
    
    await waitForKeyPress();
    
    // Test 3: Create a booking
    displayInfo('[DEMO] Scenario: Book the Spanish lesson for tomorrow at 3 PM.');
    
    // Simulate user typing
    await simulateTyping(`I'd like to book the Spanish lesson with ID ${serviceId}`);
    
    // Generate a secure meeting link
    const meetingId = uuidv4();
    displayBotResponse(`I've generated a secure meeting link for your session: ${meetingId}`);
    
    // Simulate bot response asking for details and auto-filling the form
    await simulateFormFilling("booking", {
      "Customer ID": sampleData.booking.customerId,
      "Customer Name": sampleData.booking.customerName,
      "Customer Email": sampleData.booking.customerEmail,
      "Meeting Link": sampleData.booking.meetingLink
    });
    
    // Prepare the booking data
    const bookingId = uuidv4();
    logWithTimestamp(`Generated Booking ID: ${bookingId}`);
    
    const bookingData = {
      _id: bookingId,
      service_id: serviceId,
      customer_id: { '%allot': sampleData.booking.customerId },
      customer_name: { '%allot': sampleData.booking.customerName },
      booking_time: new Date().toISOString(),
      meeting_link: { '%allot': sampleData.booking.meetingLink },
      payment_status: 'pending',
      service_status: 'scheduled',
      notes: ''
    };
    
    // Write the booking to SecretVault
    logWithTimestamp('Writing booking to SecretVault...');
    try {
      displayInfo(`Booking data to write: ${JSON.stringify(bookingData, null, 2)}`);
      displayInfo(`Using schema ID: ${BOOKING_SCHEMA_ID}`);
      
      // Use enhanced method that adds schema ID
      const result = await secretVault.writeWithSchema([bookingData], BOOKING_SCHEMA_ID);
      
      // Check if the operation was successful
      if (result && result.data && result.data.created && result.data.created.length > 0) {
        displaySuccess(`Booking created successfully with ID: ${result.data.created[0]}`);
        
        // Display success message
        displayBotResponse(`Booking created successfully!
Booking ID: ${bookingId}
Service: ${sampleData.serviceListing.serviceDetails.title}
Status: Scheduled
Payment: Pending
Meeting link has been securely stored and shared with the provider`);
        
        displayInfo(`Full API Response: ${JSON.stringify(result, null, 2)}`);
      } else {
        displayError('Booking creation failed - unexpected response format');
        displayInfo(`Response received: ${JSON.stringify(result, null, 2)}`);
      }
    } catch (error: any) {
      displayError(`Error creating booking: ${error.message}`);
      if (error.stack) {
        displayInfo(`Stack trace: ${error.stack}`);
      }
      displayBotResponse('I encountered an error while creating your booking. Please try again later.');
    }
    
    await waitForKeyPress();
    
    // Test 4: Create feedback
    displayInfo('[DEMO] Scenario: Mark the booking as completed and leave a 5-star review.');
    
    // Simulate user typing
    await simulateTyping(`I'd like to give feedback for my lesson with booking ID ${bookingId}`);
    
    // Simulate bot response asking for feedback and auto-filling the form
    await simulateFormFilling("feedback", {
      "Booking ID": bookingId,
      "Customer Rating": sampleData.feedback.customerRating.toString(),
      "Customer Feedback": sampleData.feedback.customerFeedback,
      "Service Status": "completed",
      "Payment Status": "paid"
    });
    
    // Prepare the feedback data
    const feedbackId = uuidv4();
    logWithTimestamp(`Generated Feedback ID: ${feedbackId}`);
    
    const feedbackData = {
      _id: feedbackId,
      booking_id: bookingId,
      customer_rating: sampleData.feedback.customerRating,
      customer_feedback: sampleData.feedback.customerFeedback,
      agent_notes: { '%allot': sampleData.feedback.agentNotes },
      resolution_status: 'pending'
    };
    
    // Write the feedback to SecretVault
    logWithTimestamp('Writing feedback to SecretVault...');
    try {
      displayInfo(`Feedback data to write: ${JSON.stringify(feedbackData, null, 2)}`);
      displayInfo(`Using schema ID: ${FEEDBACK_SCHEMA_ID}`);
      
      // Use enhanced method that adds schema ID
      const result = await secretVault.writeWithSchema([feedbackData], FEEDBACK_SCHEMA_ID);
      
      // Check if the operation was successful
      if (result && result.data && result.data.created && result.data.created.length > 0) {
        displaySuccess(`Feedback created successfully with ID: ${result.data.created[0]}`);
        
        // Display success message
        displayBotResponse(`Feedback submitted successfully!
Feedback ID: ${feedbackId}
Rating: ${sampleData.feedback.customerRating}/5
Thank you for your positive feedback!`);
        
        displayInfo(`Full API Response: ${JSON.stringify(result, null, 2)}`);
      } else {
        displayError('Feedback creation failed - unexpected response format');
        displayInfo(`Response received: ${JSON.stringify(result, null, 2)}`);
      }
    } catch (error: any) {
      displayError(`Error creating feedback: ${error.message}`);
      if (error.stack) {
        displayInfo(`Stack trace: ${error.stack}`);
      }
      displayBotResponse('I encountered an error while submitting your feedback. Please try again later.');
    }
    
    await waitForKeyPress();
    
    // Test 5: Create a dispute (simulation only - not actually writing to SecretVault)
    displayInfo('[DEMO] Scenario: There was an issue with the service quality. Open a dispute for partial refund.');
    displayInfo('Note: This is a simulated dispute resolution process (no actual data is written)');
    
    // Simulate user typing
    await simulateTyping(`I need to open a dispute for my booking with ID ${bookingId}`);
    
    // Simulate bot response asking for dispute details and auto-filling the form
    await simulateFormFilling("dispute", {
      "Booking ID": bookingId,
      "Dispute Reason": sampleData.dispute.reason,
      "Desired Resolution": sampleData.dispute.desiredResolution,
      "Evidence Details": sampleData.dispute.evidenceDetails
    });
    
    // Create a dispute record (in a real implementation, this would be written to SecretVault)
    const disputeId = uuidv4();
    logWithTimestamp(`Generated Dispute ID: ${disputeId}`);
    displayInfo('Simulating dispute creation (no actual write to SecretVault)');
    
    // Simulate successful dispute creation response
    displayBotResponse(`Dispute for booking ${bookingId} has been opened.
Dispute ID: ${disputeId}
Reason: ${sampleData.dispute.reason}
Requested resolution: ${sampleData.dispute.desiredResolution}
Your case will be reviewed and you will be notified of the outcome.`);
    
    console.log(`${colors.yellow}-------------------${colors.reset}`);
    displaySuccess('All tests completed!');
    displayInfo('The script has tested:');
    displayInfo('1. Creating a service listing');
    displayInfo('2. Querying service listings');
    displayInfo('3. Creating a booking');
    displayInfo('4. Submitting feedback');
    displayInfo('5. Opening a dispute (simulated)');
    
    // Final verification
    displayInfo('Performing final verification query...');
    try {
      // Query for our test data by ID
      displayInfo(`Verifying service listing with ID: ${serviceId}`);
      const serviceResults = await secretVault.readWithSchema({ _id: serviceId }, SERVICE_LISTING_SCHEMA_ID);
      
      displayInfo(`Verifying booking with ID: ${bookingId}`);
      const bookingResults = await secretVault.readWithSchema({ _id: bookingId }, BOOKING_SCHEMA_ID);
      
      displayInfo(`Verifying feedback with ID: ${feedbackId}`);
      const feedbackResults = await secretVault.readWithSchema({ _id: feedbackId }, FEEDBACK_SCHEMA_ID);
      
      displaySuccess(`Verification results:
- Service listing: ${serviceResults.length > 0 ? 'Found ✓' : 'Not found ✗'}
- Booking: ${bookingResults.length > 0 ? 'Found ✓' : 'Not found ✗'}
- Feedback: ${feedbackResults.length > 0 ? 'Found ✓' : 'Not found ✗'}`);
      
    } catch (error: any) {
      displayError(`Error during verification: ${error.message}`);
      if (error.stack) {
        displayInfo(`Stack trace: ${error.stack}`);
      }
    }
    
  } catch (error: any) {
    displayError(`Test script failed: ${error.message}`);
    displayError(error.stack);
    process.exit(1);
  }
}

main(); 