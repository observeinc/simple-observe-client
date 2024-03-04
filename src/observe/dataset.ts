import { DatasetInfo } from './DatasetInfo';
import LoginInfo from './LoginInfo';

// Datasets come in a wide variety of shapes, so your UI might want to // slice
// them up further. The base function returns "all datasets" and you can filter
// them client-side. The API is also documented to // support name sub-string
// match, but there's typically only a few hundred datasets, so client-side
// filtering gives the more responsive // user interaction.
export async function listDatasets(l: LoginInfo): Promise<DatasetInfo[]> {
    const rslt = await fetch(l.getUrl('/v1/dataset'), {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${l.customer} ${l.token}`
        },
        credentials: 'include',
        referrerPolicy: 'origin'
    });
    const j = await rslt.json();
    console.log('got dataset list', j);
    // return list sorted by name
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
