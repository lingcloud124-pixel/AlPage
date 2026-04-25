import crypto from 'crypto';

const REGION = 'cn-north-1';
const SERVICE = 'cv';
const HOST = 'visual.volcengineapi.com';

function hmacSHA256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getDateString(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

function getAmzDateString(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}${String(d.getUTCSeconds()).padStart(2, '0')}Z`;
}

export interface VolcAuth {
  accessKey: string;
  secretKey: string;
}

export function buildSignedRequest(
  auth: VolcAuth,
  action: string,
  version: string,
  body: object,
) {
  const bodyStr = JSON.stringify(body);
  const dateStamp = getDateString();
  const xDate = getAmzDateString();

  const queryParams = new URLSearchParams({ Action: action, Version: version });
  const canonicalQueryString = queryParams.toString();

  const payloadHash = sha256Hex(bodyStr);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Host: HOST,
    'X-Date': xDate,
    'X-Content-Sha256': payloadHash,
  };

  const signedHeaderKeys = ['content-type', 'host', 'x-content-sha256', 'x-date'];
  const canonicalHeadersFixed = signedHeaderKeys
    .map((k) => {
      const actualKey = Object.keys(headers).find((h) => h.toLowerCase() === k)!;
      return `${k}:${headers[actualKey]}`;
    })
    .join('\n') + '\n';

  const signedHeaders = signedHeaderKeys.join(';');

  const canonicalRequest = [
    'POST',
    '/',
    canonicalQueryString,
    canonicalHeadersFixed,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/request`;
  const stringToSign = ['HMAC-SHA256', xDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');

  const kDate = hmacSHA256(auth.secretKey, dateStamp);
  const kRegion = hmacSHA256(kDate, REGION);
  const kService = hmacSHA256(kRegion, SERVICE);
  const kSigning = hmacSHA256(kService, 'request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorization = `HMAC-SHA256 Credential=${auth.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url: `https://${HOST}/?${canonicalQueryString}`,
    headers: {
      ...headers,
      Authorization: authorization,
    },
    body: bodyStr,
  };
}
