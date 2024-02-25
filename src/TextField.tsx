import { TextField as KTF } from '@kobalte/core';
import type { Component } from 'solid-js';

import styles from './TextField.module.css';

export interface ITextFieldProps {
    label?: string;
    value?: string;
    class?: string;
    placeholder?: string;
    onChange?: (e: any) => void;
};

export const TextField: Component<ITextFieldProps> = (props: ITextFieldProps) => {
    return (
        <KTF.Root defaultValue={props.value || ""} class={styles.textfield + (props.class ? " " + props.class : "")}>
            <KTF.Label class={styles.textlabel}>{props.label || ""}</KTF.Label>
            <KTF.Input onChange={props.onChange} class={styles.textinput} placeholder={props.placeholder || ""} />
            <KTF.Description />
            <KTF.ErrorMessage />
        </KTF.Root >
    );
};
