import { SecretVaultWrapper, Node, Credentials, SchemaResult } from 'secretvaults';
import { config } from 'dotenv';
import { SERVICE_LISTING_SCHEMA, BOOKING_SCHEMA, FEEDBACK_SCHEMA } from '../action-providers/nillion-secretvault/constants.js';

config();

function getSchemaIdFromResponse(response: SchemaResult): string {
  if (!Array.isArray(response) || response.length === 0) {
    throw new Error('Invalid response format from SecretVault API');
  }

  // All nodes should return the same schema ID
  const schemaId = response[0].schemaId;
  
  // Verify all nodes returned the same schema ID
  const allSameId = response.every(r => r.schemaId === schemaId);
  if (!allSameId) {
    throw new Error('Inconsistent schema IDs returned from nodes');
  }

  return schemaId;
}

async function main() {
  // Verify that environment variables are set properly
  if (!process.env.SV_ORG_DID || !process.env.SV_PRIVATE_KEY) {
    console.error('ERROR: Required environment variables SV_ORG_DID and SV_PRIVATE_KEY must be set.');
    process.exit(1);
  }

  if (!process.env.SV_NODE1_URL || !process.env.SV_NODE1_DID || 
      !process.env.SV_NODE2_URL || !process.env.SV_NODE2_DID || 
      !process.env.SV_NODE3_URL || !process.env.SV_NODE3_DID) {
    console.error('ERROR: Node environment variables are missing.');
    console.error('Make sure SV_NODE1_URL, SV_NODE1_DID, SV_NODE2_URL, SV_NODE2_DID, SV_NODE3_URL, and SV_NODE3_DID are properly set.');
    process.exit(1);
  }

  try {
    console.log('Initializing SecretVault organization...');
    
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

    const org = new SecretVaultWrapper(nodes, credentials);
    await org.init();
    console.log('Organization initialized successfully');

    // Create Service Listing Schema
    console.log('\nCreating Service Listing Schema...');
    const serviceListingResult = await org.createSchema(SERVICE_LISTING_SCHEMA, 'Service Listing');
    console.log('Debug - Full response:', JSON.stringify(serviceListingResult, null, 2));
    const serviceListingId = getSchemaIdFromResponse(serviceListingResult);
    console.log('📝 Service Listing Schema created:');
    console.log(`Schema ID: ${serviceListingId}`);
    console.log('Set this value in your .env file as SCHEMA_ID_SERVICE_LISTING');
    
    // Create Booking Schema
    console.log('\nCreating Booking Schema...');
    const bookingResult = await org.createSchema(BOOKING_SCHEMA, 'Service Booking');
    console.log('Debug - Full response:', JSON.stringify(bookingResult, null, 2));
    const bookingId = getSchemaIdFromResponse(bookingResult);
    console.log('📝 Booking Schema created:');
    console.log(`Schema ID: ${bookingId}`);
    console.log('Set this value in your .env file as SCHEMA_ID_BOOKING');
    
    // Create Feedback Schema
    console.log('\nCreating Feedback Schema...');
    const feedbackResult = await org.createSchema(FEEDBACK_SCHEMA, 'Service Feedback');
    console.log('Debug - Full response:', JSON.stringify(feedbackResult, null, 2));
    const feedbackId = getSchemaIdFromResponse(feedbackResult);
    console.log('📝 Feedback Schema created:');
    console.log(`Schema ID: ${feedbackId}`);
    console.log('Set this value in your .env file as SCHEMA_ID_FEEDBACK');

    console.log('\n✅ All schemas created successfully');
    console.log('\nTo configure your environment:');
    console.log('1. Open your .env file');
    console.log(`2. Set SCHEMA_ID_SERVICE_LISTING="${serviceListingId}"`);
    console.log(`3. Set SCHEMA_ID_BOOKING="${bookingId}"`);
    console.log(`4. Set SCHEMA_ID_FEEDBACK="${feedbackId}"`);
    
  } catch (error: any) {
    console.error('❌ Error creating schemas:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main(); 