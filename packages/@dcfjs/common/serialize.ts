const v8 = require('v8');

export function serialize(target: any): Buffer {
  return v8.serialize(target);
}

export function deserialize(buffer: Buffer): any {
  return v8.deserialize(buffer);
}
