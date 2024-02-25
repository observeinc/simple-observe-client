import type { Component } from 'solid-js';
import { Accessor, For, Signal, createMemo, createSignal } from 'solid-js';
import styles from './DatasetBrowser.module.css';
import { TextField } from './TextField';
import { DatasetInfo } from './observe/DatasetInfo';

export const DatasetBrowser: Component<{ datasetList: Accessor<DatasetInfo[]>, selectedDataset: Signal<DatasetInfo | null> }> = (props: { datasetList: Accessor<DatasetInfo[]>, selectedDataset: Signal<DatasetInfo | null> }) => {
    const [filter, setFilter] = createSignal("");
    return (<>{createMemo(() => {
        const fVal = filter();
        console.log('filter changed', fVal);
        return (<div class={styles.vbox + " " + styles.datasetbrowser}>
            <TextField class={styles.filter} placeholder='Search Dataset' onChange={(e: any) => setFilter(e.target.value.toLocaleLowerCase())} />
            <div class={styles.datasetlist}>
                <For each={props.datasetList().filter(d => !fVal || d.name.toLocaleLowerCase().includes(fVal))}>
                    {(d: DatasetInfo) => (
                        <div class={
                            styles.datasetitem + (props.selectedDataset[0]()?.id === d.id ? " " + styles.selected : "")
                        } onClick={(_: any) => props.selectedDataset[1](d)}>{d.name}</div>
                    )}
                </For>
            </div>
        </div>);
    })}</>);
};
