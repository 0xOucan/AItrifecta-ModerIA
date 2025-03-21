declare module 'secretvaults' {
  export interface Node {
    url: string;
    did: string;
  }

  export interface Credentials {
    secretKey: string;
    orgDid: string;
  }

  export interface SchemaNodeResponse {
    status: number;
    node: Node;
    schemaId: string;
    name: string;
  }

  export type SchemaResult = SchemaNodeResponse[];

  export class SecretVaultWrapper {
    constructor(nodes: Node[], credentials: Credentials);
    init(): Promise<void>;
    createSchema(schema: any, title: string): Promise<SchemaResult>;
    writeToNodes(data: any[]): Promise<{ success: boolean; data: { created: string[] } }>;
    readFromNodes(query: any): Promise<any[]>;
  }
} 