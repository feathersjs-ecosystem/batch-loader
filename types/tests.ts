import BatchLoader = require('@feathers-plus/batch-loader');
import { Application, Service } from '@feathersjs/feathers';

const app: Application = null as any;

const myContext = { hello: 'world' };

new BatchLoader((keys, context) => {
    // $ExpectType { hello: string; }
    context;
    return app.service('users').find({ query: { id: { $in: keys } } })
      .then(records => {
        return [];
      });
  },
  { context: myContext }
);

// $ExpectType BatchLoader<any, any, { hello: string; }>
BatchLoader.loaderFactory(app.service('users'), 'id')(myContext);
