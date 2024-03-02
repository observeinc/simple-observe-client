import type { Component } from 'solid-js';
import { Accessor, Signal, createMemo } from 'solid-js';
import { DatasetFilter } from './DatasetFilter';
import styles from './FilterInput.module.css';
import { TextField } from './TextField';
import { DatasetInfo } from './observe/DatasetInfo';
import { LoginState } from './observe/login';

export interface IFilterInputProps {
    loginState: LoginState;
    selectedDataset: Accessor<DatasetInfo | null>;
    datasetFilter: Signal<DatasetFilter>;
}

export const FilterInput: Component<IFilterInputProps> = (props: IFilterInputProps) => {
    return (<>{createMemo(() => {
        const [_getDatasetFilter, setDatasetFilter] = props.datasetFilter;
        const userTypedSomething = (e: any) => {
            console.log('user typed something', e.target.value);
            if (e.target.value === 'logout') {
                props.loginState.logout();
            } else {
                setDatasetFilter((f: DatasetFilter) => f.setInfo({ opal: e.target.value }));
            }
        }
        return (
            <div class={styles.filterinput}>
                <TextField class={styles.textfield} label="" placeholder="filter log ~ /error/i" onChange={userTypedSomething} />
            </div>
        );
    })}</>);
};
