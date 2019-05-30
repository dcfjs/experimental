import * as http2 from 'http2';
import streamToBuffer from './streamToBuffer';

export interface ClientConfig {}

export class RequestError extends Error {}

export class RequestNotFoundError extends Error {
  constructor() {
    super('Not found.');
  }
}
export class RequestInternalServerError extends Error {}
export class RequestInvalidResponseError extends Error {
  constructor() {
    super('Invalid Response.');
  }
}

export class Client {
  private _sess: http2.ClientHttp2Session;
  constructor(sess: http2.ClientHttp2Session) {
    this._sess = sess;
  }
  async close() {
    await new Promise(resolve => this._sess.close(resolve));
  }
  get<RespT = any>(url: string): Promise<RespT> {
    return this.request(http2.constants.HTTP2_METHOD_GET, url, undefined);
  }
  post<RespT = any, ReqT = {}>(url: string, body: ReqT): Promise<RespT> {
    return this.request(http2.constants.HTTP2_METHOD_POST, url, body);
  }
  async request<RespT = any, ReqT = {}>(
    method: string,
    url: string,
    body: ReqT,
  ): Promise<RespT> {
    const req = this._sess.request({
      [http2.constants.HTTP2_HEADER_METHOD]: method,
      [http2.constants.HTTP2_HEADER_PATH]: url,
    });
    try {
      if (body) {
        req.end(JSON.stringify(body));
      }
      const headers: http2.IncomingHttpHeaders &
        http2.IncomingHttpStatusHeader = await new Promise(
        (resolve, reject) => {
          req.on('error', reject);
          req.on('headers', resolve);
        },
      );

      switch ((headers[http2.constants.HTTP2_HEADER_STATUS] as any) as number) {
        case http2.constants.HTTP_STATUS_NOT_FOUND:
          throw new RequestNotFoundError();
        case http2.constants.HTTP_STATUS_INTERNAL_SERVER_ERROR:
          throw new RequestInternalServerError(
            (await streamToBuffer(req)).toString(),
          );
        case http2.constants.HTTP_STATUS_OK:
          return JSON.parse((await streamToBuffer(req)).toString());
        default:
          throw new RequestInvalidResponseError();
      }
    } finally {
      req.close();
    }
  }
}

export async function createClient(
  endpoint: string,
  config?: ClientConfig,
): Promise<Client> {
  const session: http2.ClientHttp2Session = await new Promise(
    (resolve, reject) => {
      const session = http2.connect(endpoint);
      session.on('error', reject);
      session.on('connect', () => {
        resolve(session);
      });
    },
  );

  return new Client(session);
}
