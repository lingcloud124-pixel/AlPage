declare module 'sql.js' {
  export interface Database {
    run(sql: string): Database;
    exec(sql: string): { columns: string[]; values: any[][] }[];
    prepare(sql: string): Statement;
    getRowsModified(): number;
    export(): Uint8Array;
  }
  
  export interface Statement {
    bind(values: any[]): void;
    step(): boolean;
    getAsObject(): Record<string, any>;
    free(): void;
  }
  
  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string;
  }): Promise<{
    Database: new (data?: Uint8Array) => Database;
  }>;
}