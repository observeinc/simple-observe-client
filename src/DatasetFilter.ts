export class DatasetFilter {
    public opal: string = '';
    public setInfo(info: Partial<DatasetFilter>): DatasetFilter {
        console.log('DatasetFilter.setInfo', info);
        Object.assign(this, info);
        return this;
    }
};
