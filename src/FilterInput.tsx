import type { Component } from 'solid-js';
import { Accessor, Signal, createMemo } from 'solid-js';
import { DatasetFilter } from './DatasetFilter';
import styles from './FilterInput.module.css';
import { TextField } from './TextField';
import { DatasetInfo } from './observe/DatasetInfo';

export const FilterInput: Component<{ selectedDataset: Accessor<DatasetInfo | null>, datasetFilter: Signal<DatasetFilter> }> = (props: { selectedDataset: Accessor<DatasetInfo | null>, datasetFilter: Signal<DatasetFilter> }) => {
    return (<>{createMemo(() => {
        const [_getDatasetFilter, setDatasetFilter] = props.datasetFilter;
        return (
            <div class={styles.filterinput}>
                <TextField class={styles.textfield} label="" placeholder="filter log ~ /error/i" onChange={(e: any) => setDatasetFilter((f: DatasetFilter) => f.setInfo({ opal: e.target.value }))} />
            </div>
        );
    })}</>);
};
