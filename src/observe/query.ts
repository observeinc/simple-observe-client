import { DatasetInfo } from "./DatasetInfo";
import { DatasetTable } from "./DatasetTable";
import LoginInfo from "./LoginInfo";

export interface IOpalStage {
    id: string;
    pipeline: string;
};

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

function isTimestampString(v: string): boolean {
    return !Number.isNaN(parseInt(v)) && v >= '1600000000000000000' && v <= '1900000000000000000';
}

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

function opalObjectType(v: object): string {
    if (Array.isArray(v)) {
        return 'array';
    }
    return 'object';
}

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

// Type sniffing. Gross!
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
