import * as express from 'express';
import * as boom from '@hapi/boom';
import * as axios from 'axios';
import * as crypto from 'crypto';
import { appConfig } from './config';

const verifyEventSubSignature = (req: express.Request, res: express.Response, buf: Buffer, encoding: BufferEncoding) => {
    // Deconstruct signature header into algorith and signature
    const [algoritm, signature] = String(req.headers['twitch-eventsub-message-signature']).split('=', 2);
    // Init hmac using given algorithm and secret
    const hmac = crypto.createHmac(algoritm, appConfig.EVENTSUB_SECRET);
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

interface EventsubSubscription {
    id: string,
    status: string,
    type: string,
    version: string,
    condition: {
        broadcaster_user_id: string,
        reward_id?: string
    },
    created_at: string,
    transport: {
        method: string,
        callback: string
    },
    cost: number
}

const setupEventsubSubscriptions = async (aclient: axios.AxiosInstance, broadcasterId: string, rewardIds: Array<string>) => {
    // Get existing rewards
    const response = await aclient.get('https://api.twitch.tv/helix/eventsub/subscriptions', {
        params: {
            status: 'enabled'
        }
    });

    const existingRewards: Array<string> = response.data.data
        .filter((eventsub: EventsubSubscription) => eventsub.condition.broadcaster_user_id == broadcasterId && eventsub.condition.reward_id)
        .map((eventsub: EventsubSubscription) => eventsub.condition.reward_id);

    const rewardsWithoutEventsub = rewardIds.filter((rewardId: string) => !existingRewards.includes(rewardId));

    const pendingRequests: Array<Promise<axios.AxiosResponse>> = [];
    for (const rewardId of rewardsWithoutEventsub) {
        const payload = {
            type: 'channel.channel_points_custom_reward_redemption.add',
            version: '1',
            condition: {
                broadcaster_user_id: broadcasterId,
                reward_id: rewardId
            },
            transport: {
                method: 'webhook',
                callback: `${appConfig.SELF_BASE_URI}/webhooks/eventsub-callback`,
                secret: appConfig.EVENTSUB_SECRET
            }
        };

        pendingRequests.push(aclient.post('https://api.twitch.tv/helix/eventsub/subscriptions', payload));
    }

    await Promise.all(pendingRequests);
};

export { verifyEventSubSignature, setupEventsubSubscriptions };