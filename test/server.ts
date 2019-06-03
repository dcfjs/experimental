import * as assert from 'assert';
import { Server, createServer } from '@dcfjs/common/server';
import {
  Client,
  createClient,
  RequestNotFoundError,
  RequestInternalServerError,
} from '@dcfjs/common/client';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { expect } from 'chai';

chai.use(chaiAsPromised);

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
        '/echo': (v: any) => {
          return v;
        },
        '/error': () => {
          throw new Error('SomeError');
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
    it('Request', async () => {
      expect(await client.get('/foo')).to.deep.equals({
        hello: 'world',
      });
    });
    it('Post', async () => {
      expect(await client.post('/echo', { test: 'echo' })).to.deep.equals({
        test: 'echo',
      });
    });
    it('NotFound', async () => {
      await expect(client.get('/bar')).to.be.rejectedWith(RequestNotFoundError);
    });
    it('ShouldThrow', async () => {
      await expect(client.get('/error')).to.be.rejectedWith(
        RequestInternalServerError,
      );
    });
  });
});
