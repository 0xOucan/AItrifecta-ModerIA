// Default SecretVault Node Configuration
export const NODES_CONFIG = [
  {
    url: process.env.SV_NODE1_URL,
    did: process.env.SV_NODE1_DID,
  },
  {
    url: process.env.SV_NODE2_URL,
    did: process.env.SV_NODE2_DID,
  },
  {
    url: process.env.SV_NODE3_URL,
    did: process.env.SV_NODE3_DID,
  },
];

// Organization Credentials - Loaded from .env file
export const DEFAULT_CREDENTIALS = {
  secretKey: process.env.SV_PRIVATE_KEY,
  orgDid: process.env.SV_ORG_DID,
};

// Schema Templates for Marketplace
export const SERVICE_LISTING_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Service Listing",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "_id": {
        "type": "string",
        "format": "uuid",
        "coerce": true
      },
      "provider_name": {
        "type": "object",
        "properties": {
          "%share": {
            "type": "string"
          }
        },
        "required": ["%share"]
      },
      "provider_id": {
        "type": "object",
        "properties": {
          "%share": {
            "type": "string"
          }
        },
        "required": ["%share"]
      },
      "service_type": {
        "type": "string"
      },
      "service_details": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "duration_minutes": {
            "type": "integer",
            "minimum": 15
          }
        },
        "required": ["title", "description", "duration_minutes"]
      },
      "availability": {
        "type": "object",
        "properties": {
          "date": {
            "type": "string",
            "format": "date"
          },
          "start_time": {
            "type": "string",
            "format": "time"
          },
          "end_time": {
            "type": "string",
            "format": "time"
          },
          "timezone": {
            "type": "string"
          }
        },
        "required": ["date", "start_time", "end_time", "timezone"]
      },
      "price": {
        "type": "object",
        "properties": {
          "amount": {
            "type": "number"
          },
          "currency": {
            "type": "string"
          }
        },
        "required": ["amount", "currency"]
      },
      "contact_info": {
        "type": "object",
        "properties": {
          "%share": {
            "type": "string"
          }
        },
        "required": ["%share"]
      },
      "status": {
        "type": "string",
        "enum": ["available", "booked", "completed", "cancelled"]
      }
    },
    "required": ["_id", "provider_name", "provider_id", "service_type", "service_details", "availability", "price", "contact_info", "status"]
  }
};

export const BOOKING_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Service Booking",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "_id": {
        "type": "string",
        "format": "uuid",
        "coerce": true
      },
      "service_id": {
        "type": "string"
      },
      "customer_id": {
        "type": "object",
        "properties": {
          "%share": {
            "type": "string"
          }
        },
        "required": ["%share"]
      },
      "customer_name": {
        "type": "object",
        "properties": {
          "%share": {
            "type": "string"
          }
        },
        "required": ["%share"]
      },
      "booking_time": {
        "type": "string",
        "format": "date-time"
      },
      "meeting_link": {
        "type": "object",
        "properties": {
          "%share": {
            "type": "string"
          }
        },
        "required": ["%share"]
      },
      "payment_status": {
        "type": "string",
        "enum": ["pending", "paid", "refunded", "disputed"]
      },
      "service_status": {
        "type": "string",
        "enum": ["scheduled", "in_progress", "completed", "cancelled", "no_show"]
      },
      "notes": {
        "type": "string"
      }
    },
    "required": ["_id", "service_id", "customer_id", "customer_name", "booking_time", "payment_status", "service_status"]
  }
};

export const FEEDBACK_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Service Feedback",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "_id": {
        "type": "string",
        "format": "uuid",
        "coerce": true
      },
      "booking_id": {
        "type": "string"
      },
      "provider_rating": {
        "type": "integer",
        "minimum": 1,
        "maximum": 5
      },
      "customer_rating": {
        "type": "integer",
        "minimum": 1,
        "maximum": 5
      },
      "provider_feedback": {
        "type": "string"
      },
      "customer_feedback": {
        "type": "string"
      },
      "resolution_status": {
        "type": "string",
        "enum": ["pending", "resolved", "disputed", "refunded"]
      },
      "agent_notes": {
        "type": "object",
        "properties": {
          "%share": {
            "type": "string"
          }
        },
        "required": ["%share"]
      }
    },
    "required": ["_id", "booking_id", "resolution_status"]
  }
};

// Reserved Schema IDs - will be populated after creation
export const SCHEMA_IDS = {
  SERVICE_LISTING: process.env.SCHEMA_ID_SERVICE_LISTING || "",
  BOOKING: process.env.SCHEMA_ID_BOOKING || "",
  FEEDBACK: process.env.SCHEMA_ID_FEEDBACK || ""
}; 