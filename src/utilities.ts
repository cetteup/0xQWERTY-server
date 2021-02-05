import * as express from 'express';
import * as boom from '@hapi/boom';
import * as crypto from 'crypto';

const verifyEventSubSignature = (req: express.Request, res: express.Response, buf: Buffer, encoding: BufferEncoding) => {
    // Deconstruct signature header into algorith and signature
    const [algoritm, signature] = String(req.headers['twitch-eventsub-message-signature']).split('=', 2);
    // Init hmac using given algorithm and secret
    const hmac = crypto.createHmac(algoritm, process.env.EVENTSUB_SECRET);
    // Get remaining relevant headers
    const messageId = String(req.headers['twitch-eventsub-message-id']);
    const messageTimestamp = String(req.headers['twitch-eventsub-message-timestamp']);
    // Merge into a single buffer
    const hmacMessage = Buffer.concat([Buffer.from(messageId, encoding), Buffer.from(messageTimestamp, encoding), buf]);

    // Calculate hash
    const hash = hmac.update(hmacMessage).digest('hex');

    // Compare calculated hash to signature from header
    if (hash !== signature) {
        console.log('Request signatur is invalid');
        const err = boom.badRequest('Request signature is invalid');
        throw err;
    }
};

export { verifyEventSubSignature };