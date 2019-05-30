import * as http2 from 'http2';
import streamToBuffer from './streamToBuffer';

export type ServerHandler = (body: any | null) => any | Promise<any>;
export type ServerHandlerMap = { [url: string]: ServerHandler };

export interface ServerConfig {
  port?: number;
  host?: string;
  backlog?: number;
}

export class Server {
  private _server: http2.Http2Server;
  constructor(server: http2.Http2Server) {
    this._server = server;
  }
  async close() {
    await new Promise(resolve => this._server.close(resolve));
  }
}

export async function createServer(
  handlers: ServerHandlerMap,
  config: ServerConfig = {},
): Promise<Server> {
  const server = http2.createServer();

  server.on('stream', async (stream, header) => {
    let body = null;
    const method = header[http2.constants.HTTP2_HEADER_METHOD];
    const path = header[http2.constants.HTTP2_HEADER_PATH] as string;
    if (
      method === http2.constants.HTTP2_METHOD_OPTIONS ||
      method === http2.constants.HTTP2_METHOD_HEAD
    ) {
      stream.respond({
        [http2.constants.HTTP2_HEADER_STATUS]: http2.constants.HTTP_STATUS_NOT_FOUND
      })
      stream.end();
      return;
    }
    if (
      method === http2.constants.HTTP2_METHOD_POST ||
      method === http2.constants.HTTP2_METHOD_PUT
    ) {
      body = JSON.parse((await streamToBuffer(stream)).toString());
    }
    const handler = handlers[path];
    if (!handler) {
      stream.respond({
        [http2.constants.HTTP2_HEADER_STATUS]: http2.constants.HTTP_STATUS_NOT_FOUND,
      });
      stream.end();
      return;
    }
    try {
      let resp = await handler(body);
      stream.end(JSON.stringify(resp));
    } catch (e) {
      stream.respond({
        [http2.constants.HTTP2_HEADER_STATUS]: http2.constants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      });
      stream.end(e.message);
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(config.port, config.host, config.backlog, () =>
      resolve(new Server(server)),
    );
    server.on('error', reject);
  });
}
