import { DatasetInfo } from './DatasetInfo';
import LoginInfo from './LoginInfo';

export async function listDatasets(l: LoginInfo): Promise<DatasetInfo[]> {
    /* TODO: move this to observe/ and use /v1/dataset
     */
    const rslt = await fetch(l.getUrl('/v1/dataset'), {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${l.customer} ${l.token}`
        }
    });
    const j = await rslt.json();
    console.log('got dataset list', j);
    const ret = j.
        data?.
        map((d: { meta: { id: string }, config: { name: string } }) => new DatasetInfo().setInfo({
            id: d.meta.id,
            name: d.config.name
        })).
        sort((a: DatasetInfo, b: DatasetInfo) => a.name.localeCompare(b.name, undefined, {
            sensitivity: 'base'
        }));
    return ret || [];
}
