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
  const server = http2.createServer(async (request, response) => {
    let body = null;
    if (
      request.method === http2.constants.HTTP2_METHOD_OPTIONS ||
      request.method === http2.constants.HTTP2_METHOD_HEAD
    ) {
      response.end();
      return;
    }
    if (
      request.method === http2.constants.HTTP2_METHOD_POST ||
      request.method === http2.constants.HTTP2_METHOD_PUT
    ) {
      body = JSON.parse((await streamToBuffer(request)).toString());
    }
    const handler = handlers[request.url];
    if (!handler) {
      response.setHeader(
        http2.constants.HTTP2_HEADER_STATUS,
        http2.constants.HTTP_STATUS_NOT_FOUND,
      );
      response.end();
      return;
    }
    try {
      let resp = await handler(body);
      response.end(JSON.stringify(resp));
    } catch (e) {
      response.setHeader(
        http2.constants.HTTP2_HEADER_STATUS,
        http2.constants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      );
      response.end(e.message);
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(config.port, config.host, config.backlog, () =>
      resolve(new Server(server)),
    );
    server.on('error', reject);
  });
}
