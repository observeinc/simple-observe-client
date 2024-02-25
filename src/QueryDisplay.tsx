import type { Component } from 'solid-js';
import { Accessor, For, Signal, createMemo } from 'solid-js';
import styles from './QueryDisplay.module.css';
import { DatasetTable } from './observe/DatasetTable';

const presenters: { [key: string]: (v: any) => string } = {
    'string': (v: string) => v,
    'int64': (v: number) => v.toLocaleString(),
    'float64': (v: number) => v.toLocaleString(),
    'timestamp': (v: string) => new Date(parseInt(v.slice(0, -6))).toISOString(),
    'object': (v: any) => JSON.stringify(v),
    'array': (v: any) => JSON.stringify(v)
};

function present(c: any, typ: string): string {
    if (typ in presenters) {
        return presenters[typ](c);
    }
    return '' + c;
}

export const QueryDisplay: Component<{ dataTable: Signal<DatasetTable | null> }> = (props: { dataTable: Signal<DatasetTable | null> }) => {
    return (<>{createMemo(() => {
        const [getTable, _setTable] = props.dataTable;
        const table = getTable();
        const schema = table?.schema;
        const rows = table?.rows;
        console.log('table', table);
        if (table?.running) {
            return (<div class={styles.queryrunning}>Running query...</div>);
        }
        if (table?.error) {
            return (<div class={styles.queryerror}>Error: {table.error}</div>);
        }
        if (!table || !schema || !rows) {
            return null;
        }
        return (
            <div class={styles.querycontainer}>
                <table class={styles.querytable}>
                    <thead class={styles.queryheader}><tr>
                        <For each={schema.columns}>
                            {(c: { name: string }) => (<th class={styles.queryheader}>{c.name}</th>)}
                        </For>
                    </tr></thead>
                    <tbody class={styles.querybody}>
                        <For each={rows}>
                            {(r: any[]) => (<tr class={styles.queryrow}>
                                <For each={r}>
                                    {(c: any, ix: Accessor<number>) => (<td class={styles.querycell}>{present(c, schema.columns[ix()].type)}</td>)}
                                </For>
                            </tr>)}
                        </For>
                    </tbody>
                </table>
            </div>
        );
    })}</>);
};
