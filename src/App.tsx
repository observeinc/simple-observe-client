import type { Component } from 'solid-js';
import { Match, Signal, Switch, createEffect, createSignal } from 'solid-js';
import styles from './App.module.css';
import { DatasetBrowser } from './DatasetBrowser';
import { DatasetFilter } from './DatasetFilter';
import { FilterInput } from './FilterInput';
import { LoginForm } from './LoginForm';
import { QueryDisplay } from './QueryDisplay';
import { DatasetInfo } from './observe/DatasetInfo';
import { DatasetTable } from './observe/DatasetTable';
import { listDatasets } from './observe/dataset.ts';
import { LoginState, login } from './observe/login';
import { opalQuery } from './observe/query.ts';

const loggedInEffect = (loginState: LoginState, datasetList: Signal<DatasetInfo[]>) => () => {
  // loggedIn changes
  if (loginState.getState() === 'loggedIn') {
    listDatasets(loginState.getInfo()).then((dss: DatasetInfo[]) => datasetList[1](dss));
  } else {
    datasetList[1]([]);
  }
};

let prevQuery: AbortController | null = null;

const runQueryEffect = (loginState: LoginState, selectedDataset: Signal<DatasetInfo | null>, datasetFilter: Signal<DatasetFilter>, queryResult: Signal<DatasetTable | null>) => () => {
  // abortable query fetch
  if (prevQuery) {
    prevQuery.abort();
    prevQuery = null;
  }
  const dataset = selectedDataset[0]();
  const filter = datasetFilter[0]();
  const linfo = loginState.getInfo();
  const [_getQueryResult, setQueryResult] = queryResult;
  if (!dataset || !filter) {
    console.log('dataset or filter is null', dataset, filter);
    setQueryResult(null);
    return;
  }
  console.log('fetching dataset query', dataset.id, filter.opal);
  // show progress
  setQueryResult(new DatasetTable(true));
  prevQuery = new AbortController();
  opalQuery(linfo, {
    signal: prevQuery.signal,
    datasets: { "in": dataset },
    stages: [{
      id: 'query',
      pipeline: filter.opal,
    }],
    interval: '20m'
  }).then((rslt: DatasetTable) => {
    // show the actual result
    setQueryResult(rslt);
  });
}

const App: Component = () => {

  console.log('App hello world!');

  // signals
  const loginState = login();
  const datasetList = createSignal<DatasetInfo[]>([]);
  const selectedDataset = createSignal<DatasetInfo | null>(null, { equals: false });
  const datasetFilter = createSignal<DatasetFilter>(new DatasetFilter(), { equals: false });
  const queryResult = createSignal<DatasetTable | null>(null, { equals: false });

  // effects
  createEffect(loggedInEffect(loginState, datasetList));
  createEffect(runQueryEffect(loginState, selectedDataset, datasetFilter, queryResult));
  createEffect(() => {
    console.log('datasetFilter', datasetFilter[0]());
  })

  // component
  return (
    <div class={styles.App}>
      {loginState.error() ? <div class={styles.Error}>{loginState.error()}</div> : null}
      <Switch fallback={<div class={styles.Loading}>Loading</div>}>
        <Match when={loginState.getState() === 'unconfigured'}>
          <LoginForm state={loginState} />
        </Match>
        <Match when={loginState.getState() === 'loggedIn'}>
          <div class={styles.hbox + " " + styles.databrowser}>
            <DatasetBrowser datasetList={datasetList[0]} selectedDataset={selectedDataset} />
            <div class={styles.vbox}>
              <FilterInput selectedDataset={selectedDataset[0]} datasetFilter={datasetFilter} />
              <QueryDisplay dataTable={queryResult} />
            </div>
          </div>
        </Match>
      </Switch>
    </div>
  );
};

export default App;
