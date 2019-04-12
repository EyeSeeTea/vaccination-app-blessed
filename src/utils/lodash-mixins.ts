import _ from "lodash";

declare module "lodash" {
    interface LoDashStatic {
        getOrFail<TObject extends object, TKey extends keyof TObject>(
            object: TObject | null | undefined,
            path: TKey | [TKey]
        ): TObject[TKey];
        cartesianProduct<T>(arr: T[][]): T[][];
    }

    interface LoDashImplicitWrapper<TValue> {
        getOrFail<TObject extends object, TKey extends keyof TObject>(
            this: LoDashImplicitWrapper<TObject | null | undefined>,
            path: TKey | [TKey]
        ): TObject[TKey];
    }
}

function cartesianProduct<T>(arr: T[][]): T[][] {
    return arr.reduce(
        (a, b) => {
            return a
                .map(x => {
                    return b.map(y => {
                        return x.concat(y);
                    });
                })
                .reduce((c, d) => c.concat(d), []);
        },
        [[]] as T[][]
    );
}

function getOrFail(obj: any, key: string | number): any {
    const value = _.get(obj, key);
    if (value === undefined) {
        throw new Error(`Key ${key} not found in object ${JSON.stringify(obj, null, 2)}`);
    } else {
        return value;
    }
}

_.mixin({ cartesianProduct });

_.mixin(
    {
        getOrFail,
    },
    { chain: false }
);
