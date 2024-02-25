export interface IDatasetSchema {
    columns: Array<{
        name: string;
        type: string;
    }>;
};

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
