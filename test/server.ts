import * as assert from 'assert';
import { Server, createServer } from '@dcfjs/server/server';
import {
  Client,
  createClient,
  RequestNotFoundError,
} from '@dcfjs/server/client';
import { expect } from 'chai';

describe('Server', () => {
  let server: Server;
  before(async () => {
    server = await createServer(
      {
        '/foo': () => {
          return {
            hello: 'world',
          };
        },
      },
      {
        port: 8001,
      },
    );
  });
  after(async () => {
    await server.close();
  });
  it('Connect', async () => {
    console.log('Enter');
    const client = await createClient('http://localhost:8001');
    await client.close();
  });
  describe('TestWithConnection', () => {
    let client: Client;
    before(async () => {
      client = await createClient('http://localhost:8001');
    });
    after(async () => {
      await client.close();
    });
    it('NotFound', async () => {
      await expect(async () => {
        await client.get('/bar');
      }).throws(RequestNotFoundError);
    });
  });
});
