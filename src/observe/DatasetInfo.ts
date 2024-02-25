export class DatasetInfo {
    public id: string = '';
    public name: string = '';

    public setInfo(info: Partial<DatasetInfo>): DatasetInfo {
        Object.assign(this, info);
        return this;
    }
};
