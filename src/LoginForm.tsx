import { Button } from '@kobalte/core';
import type { Component } from 'solid-js';
import { TextField } from './TextField';
import { LoginState } from './observe/login';

export const LoginForm: Component<{ state: LoginState }> = (props: { state: LoginState }) => {
    const info = props.state.getInfo();
    return (
        <div class='form'>
            <TextField
                label='Customer'
                value={info.customer}
                onChange={(e: any) => props.state.setInfo({ customer: e.target.value })}
            />
            <TextField
                label='Site'
                value={info.site}
                onChange={(e: any) => props.state.setInfo({ site: e.target.value })}
            />
            <TextField
                label='Email'
                value={info.email}
                onChange={(e: any) => props.state.setInfo({ email: e.target.value })}
            />
            <Button.Root onClick={() => props.state.bootstrap()}>Login</Button.Root>
        </div>
    );
};
