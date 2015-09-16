import Stream from 'stream';
import YError from 'yerror';
import Whook from '../whook';

export default class EchoHook extends Whook {
  static specs({ statusCode=200 } = {}) {
    return {
      methods: ['POST'],
      nodes: ['echo'],
      in: {
        $schema: 'http://json-schema.org/draft-04/schema#',
        title: 'EchoHook input specs',
        type: 'object',
        properties: {
          contentType: {
            source: 'headers:Content-Type',
            type: 'string',
            description: 'The type of the content to echo.',
          },
          contentLength: {
            source: 'headers:Content-Length',
            type: 'number',
            description: 'The length of the content to echo.',
          },
        },
      },
      out: {
        $schema: 'http://json-schema.org/draft-04/schema#',
        title: 'EchoHook output specs',
        type: 'object',
        properties: {
          statusCode: {
            type: 'number',
            required: true,
            destination: 'status',
            enum: [statusCode],
          },
          contentType: {
            type: 'string',
            destination: 'headers:Content-Type',
          },
          contentLength: {
            type: 'number',
            destination: 'headers:Content-Length',
          },
        },
      },
      services: {},
    };
  }
  init(specs) {
    this._statusCode = specs.out.properties.statusCode.enum[0];
  }
  // Logic applyed to response/request abstract data before sending response content
  pre({ in: { contentType, contentLength }, out: out }, next) {
    out.statusCode = this._statusCode;
    out.contentType = contentType;
    out.contentLength = contentLength;
    next();
  }
  // Logic applyed to response/request abstract data when sending response content
  process($, inStream) {
    return inStream;
  }
}
