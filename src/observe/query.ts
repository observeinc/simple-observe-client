import { DatasetInfo } from "./DatasetInfo";
import { DatasetTable } from "./DatasetTable";
import LoginInfo from "./LoginInfo";

// There are more available documented parameters on a query stage,
// such as parameter bindings and multiple inputs, but we're keeping
// the API to a minimum here.
export interface IOpalStage {
    id: string;
    pipeline: string;
};

// The parameters needed to run an OPAL query. Note that this includes
// the actual query ("stages," and their input "datasets") as well as
// necessary metadata (time window) and some control data ("signal")
// for aborting the query.
export interface IQueryParameters {
    signal: AbortSignal;
    datasets: { [key: string]: DatasetInfo };
    stages: IOpalStage[];
    startTime?: Date;
    endTime?: Date;
    interval?: string;
    rowCount?: number;
    name?: string;
};

function makeQuery(l: LoginInfo, params: IQueryParameters): any {
    return {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/x-ndjson',
            'Authorization': `Bearer ${l.customer} ${l.token}`
        },
        body: JSON.stringify({
            query: {
                stages: buildStages(params)
            },
            presentation: {
                limit: `${params.rowCount || 1000}`,
                linkify: true
            }
        }),
        signal: params.signal,
        credentials: 'include',
        referrerPolicy: 'origin'
    };
}

// Sniffing whether a returned value might be a timestamp for presentation.
// Observe stores and returns payload timestamps as nanoseconds in the UNIX
// epoch, encoded as strings (to avoid floating point quantization.)
function isTimestampString(v: string): boolean {
    return !Number.isNaN(parseInt(v)) && v >= '1600000000000000000' && v <= '1900000000000000000';
}

// Observe returns numbers a string type in JSON, because of floating point
// quantization problems. When making up our minds for how to treat it,
// inspect the actual value to see whether it requires float (is a decimal)
// or is "safe" (magnitude less than 12 digits.)
function opalNumberType(v: number): string {
    const s: string = v.toString();
    if (s.length < 12) {
        return 'float64';
    }
    if (s.indexOf('.') >= 0) {
        return 'float64';
    }
    return 'int64';
}

// Given a string, that's already not a number, what do we // think it should
// be? This is for cases where arrays or objects are returned as JSON encoded
// strings.
function opalStringType(v: string): string {
    if (v.startsWith('[')) {
        return 'array';
    }
    if (v.startsWith('{')) {
        return 'object';
    }
    if (isTimestampString(v)) {
        return 'timestamp';
    }
    return 'string';
}

// Given an object returned in JSON, is it an "object" or an "array"?
function opalObjectType(v: object): string {
    if (Array.isArray(v)) {
        return 'array';
    }
    return 'object';
}

// Build the payload needed to run an OPAL query for the export endpoint.
function buildStages(params: IQueryParameters): any[] {
    const dsInputs = Object.entries(params.datasets).map((kv: [string, DatasetInfo]) => {
        const [id, ds] = kv;
        return {
            inputName: id,
            datasetId: ds.id
        };
    });
    const stageInputs: any[] = [];
    return params.stages.map(s => {
        const ret = {
            stageID: s.id,
            pipeline: s.pipeline,
            input: [...dsInputs, ...stageInputs],
        };
        stageInputs.push({
            inputName: s.id,
            stageId: s.id
        });
        return ret;
    })
}

// Given a result in nd-json format, slice it up and convert each column
// to an appropriate datatype, by sniffing the data in the first row.
// The dataset list returns exact schema information, but we may add
// additional OPAL, and the "export" endpoint does not return schema.
function makeResult(rslt: Response, txt: string): DatasetTable {
    // trim final newline to not get a blank row at the end
    if (txt.length > 0 && txt.charAt(txt.length - 1) == '\n') {
        txt = txt.slice(0, -1);
    }
    const lines = txt.split('\n');
    console.log(`status ${rslt.status} got ${lines.length} lines, first is: `, lines.length > 0 ? lines[0] : null);
    if (rslt.status != 200) {
        // an error, but not with JSON
        return new DatasetTable(false, lines.length ? lines[0] : rslt.statusText);
    }
    if (!lines.length) {
        return new DatasetTable(false, "No data returned");
    }
    // This is the success case -- we have nd-json data
    let cols: string[] | null = null;
    let rows: any[][] = [];
    let schema: { name: string, type: string }[] = [];
    lines.map((line: string) => {
        const d = JSON.parse(line);
        if (!cols) {
            cols = Object.keys(d);
            schema = cols.map((c: string) => ({ name: c, type: opalType(d[c]) }));
        }
        rows.push(cols.map((c: string) => d[c]));
    });
    return new DatasetTable(false, undefined, { columns: schema }, rows);
}

// Type sniffing. https://www.youtube.com/watch?v=mwpwPwWIueM
export function opalType(v: any): string {
    switch (typeof v) {
        case 'number':
            return opalNumberType(v);
        case 'boolean':
            return 'bool';
        case 'string':
            return opalStringType(v);
        case 'object':
            return opalObjectType(v);
        default:
            return 'string';
    }
}

// Given login credentials, and an expressed OPAL query, run the export
// endpoint and decode the resulting data into a dataset table you can present.
export async function opalQuery(l: LoginInfo, params: IQueryParameters): Promise<DatasetTable> {
    console.log('opalQuery', params);
    const rslt = await fetch(l.getUrl('/v1/meta/export/query'), makeQuery(l, params));
    if (rslt.status !== 200) {
        // deal with JSON errors separately
        if (rslt.headers.get('content-type')?.includes('application/json')) {
            const j = await rslt.json();
            console.log('error', j);
            return new DatasetTable(false, j?.message || rslt.statusText);
        }
    }
    const txt = await rslt.text();
    return makeResult(rslt, txt);
}
