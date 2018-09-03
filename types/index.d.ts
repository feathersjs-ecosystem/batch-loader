// TypeScript Version: 2.3

/*
 Forked from facebook/dataloader (src/index.d.ts)

 -- original license start --

 BSD License

 For DataLoader software

 Copyright (c) 2015, Facebook, Inc. All rights reserved.

 Redistribution and use in source and binary forms, with or without modification,
 are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice, this
 list of conditions and the following disclaimer.

 * Redistributions in binary form must reproduce the above copyright notice,
 this list of conditions and the following disclaimer in the documentation
 and/or other materials provided with the distribution.

 * Neither the name Facebook nor the names of its contributors may be used to
 endorse or promote products derived from this software without specific
 prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 -- original license end --
*/

import { HookContext, Service } from '@feathersjs/feathers';

declare class BatchLoader<K, V, C> {
    constructor(batchLoadFn: BatchLoader.BatchLoadFn<K, V, C>, options?: BatchLoader.Options<K, V, C>);

    /**
     * Reorganizes the records from the service call into the result expected from the batch function.
     */
    static getResultsByKey(keys: ReadonlyArray<string | number>, resultArray: ReadonlyArray<any>,
                           serializeRecordKey: ((item: any) => string) | string, resultType: '' | '!' | '[]',
                           options?: BatchLoader.GetResultsByKeyOptions): object[];

    /**
     * Returns the unique elements in an array.
     */
    static getUniqueKeys(keys: string[]): string[];

    static loaderFactory<T>(service: Service<T>, id: string, multi?: boolean, options?: BatchLoader.LoaderFactoryOptions): <C>(context: C) => BatchLoader<any, T, C>;

    /**
     * Loads a key, returning a `Promise` for the value represented by that key.
     */
    load(key: K): Promise<V>;

    /**
     * Loads multiple keys, promising an array of values:
     *
     *     var [ a, b ] = await myLoader.loadMany([ 'a', 'b' ]);
     *
     * This is equivalent to the more verbose:
     *
     *     var [ a, b ] = await Promise.all([
     *       myLoader.load('a'),
     *       myLoader.load('b')
     *     ]);
     *
     */
    loadMany(keys: K[]): Promise<V[]>;

    /**
     * Clears the value at `key` from the cache, if it exists. Returns itself for
     * method chaining.
     */
    clear(key: K): BatchLoader<K, V, C>;

    /**
     * Clears the entire cache. To be used when some event results in unknown
     * invalidations across this particular `BatchLoader`. Returns itself for
     * method chaining.
     */
    clearAll(): BatchLoader<K, V, C>;

    /**
     * Adds the provied key and value to the cache. If the key already exists, no
     * change is made. Returns itself for method chaining.
     */
    prime(key: K, value: V): BatchLoader<K, V, C>;
}

declare namespace BatchLoader {
    interface GetResultsByKeyOptions {
        onError: (i: number, message: string) => void;
        defaultElem: any;
    }

    interface LoaderFactoryOptions {
        getKey?: (item: any) => string | number;
        paramNames: string | string[];
        injects: object;
    }

    // If a custom cache is provided, it must be of this type (a subset of ES6 Map).
    interface CacheMap<K, V> {
        get(key: K): V | void;
        set(key: K, value: V): any;
        delete(key: K): any;
        clear(): any;
    }

    // A Function, which when given an Array of keys, returns a Promise of an Array
    // of values or Errors.
    type BatchLoadFn<K, V, C> = (keys: K[], context: C) => Promise<Array<V | Error>>;

    // Optionally turn off batching or caching or provide a cache key function or a
    // custom cache instance.
    interface Options<K, V, C> {
        /**
         * Default `true`. Set to `false` to disable batching,
         * instead immediately invoking `batchLoadFn` with a
         * single load key.
         */
        batch?: boolean;

        /**
         * Default `Infinity`. Limits the number of items that get
         * passed in to the `batchLoadFn`.
         */
        maxBatchSize?: number;

        /**
         * Default `true`. Set to `false` to disable memoization caching,
         * instead creating a new Promise and new key in the `batchLoadFn` for every
         * load of the same key.
         */
        cache?: boolean;

        /**
         * A function to produce a cache key for a given load key.
         * Defaults to `key => key`. Useful to provide when JavaScript
         * objects are keys and two similarly shaped objects should
         * be considered equivalent.
         */
        cacheKeyFn?: (key: any) => any;

        /**
         * An instance of Map (or an object with a similar API) to
         * be used as the underlying cache for this loader.
         * Default `new Map()`.
         */
        cacheMap?: CacheMap<K, Promise<V>>;

        /**
         * A feathers hook context object
         */
        context?: C;
    }
}

export = BatchLoader;
