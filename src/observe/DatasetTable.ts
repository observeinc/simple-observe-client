export interface IDatasetSchema {
    columns: Array<{
        name: string;
        type: string;
    }>;
};

// DatasetTable is returned by the opalQuery() function in query.ts.
// It represents the actual data gotten from the export endpoint.
export class DatasetTable {
    public running: boolean;
    public error?: string;
    public schema: IDatasetSchema;
    public rows: Array<Array<any>>;

    constructor(running: boolean, error?: string, schema?: IDatasetSchema, rows?: Array<Array<any>>) {
        this.running = running;
        this.error = error;
        this.schema = schema || { columns: [] };
        this.rows = rows || [];
    }
};
