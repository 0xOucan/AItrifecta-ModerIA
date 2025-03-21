export class NillionSecretVaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NillionSecretVaultError';
  }
}

export class InitializationError extends NillionSecretVaultError {
  constructor(message: string) {
    super(`Failed to initialize SecretVault: ${message}`);
    this.name = 'InitializationError';
  }
}

export class SchemaCreationError extends NillionSecretVaultError {
  constructor(message: string) {
    super(`Failed to create schema: ${message}`);
    this.name = 'SchemaCreationError';
  }
}

export class DataWriteError extends NillionSecretVaultError {
  constructor(message: string) {
    super(`Failed to write data to SecretVault: ${message}`);
    this.name = 'DataWriteError';
  }
}

export class DataReadError extends NillionSecretVaultError {
  constructor(message: string) {
    super(`Failed to read data from SecretVault: ${message}`);
    this.name = 'DataReadError';
  }
}

export class InvalidDataError extends NillionSecretVaultError {
  constructor(message: string) {
    super(`Invalid data provided: ${message}`);
    this.name = 'InvalidDataError';
  }
}

export class MissingSchemaError extends NillionSecretVaultError {
  constructor(schemaType: string) {
    super(`Schema ID for ${schemaType} is missing. Please create the schema first.`);
    this.name = 'MissingSchemaError';
  }
}

export class ConfigurationError extends NillionSecretVaultError {
  constructor(message: string) {
    super(`Configuration error: ${message}`);
    this.name = 'ConfigurationError';
  }
}

export class BookingError extends NillionSecretVaultError {
  constructor(message: string) {
    super(`Booking error: ${message}`);
    this.name = 'BookingError';
  }
}

export class FeedbackError extends NillionSecretVaultError {
  constructor(message: string) {
    super(`Feedback error: ${message}`);
    this.name = 'FeedbackError';
  }
} 