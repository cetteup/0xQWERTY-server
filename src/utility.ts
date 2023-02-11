import * as boom from '@hapi/boom';
import * as crypto from 'crypto';
import * as express from 'express';
import Config from './config';
import { logger } from './logger';
import { ApiClient, HelixEventSubSubscription } from '@twurple/api';

const verifyEventSubSignature = (req: express.Request, res: express.Response, buf: Buffer, encoding: BufferEncoding) => {
    // Deconstruct signature header into algorith and signature
    const [algoritm, signature] = String(req.headers['twitch-eventsub-message-signature']).split('=', 2);
    // Init hmac using given algorithm and secret
    const hmac = crypto.createHmac(algoritm, Config.EVENTSUB_SECRET);
    // Get remaining relevant headers
    const messageId = String(req.headers['twitch-eventsub-message-id']);
    const messageTimestamp = String(req.headers['twitch-eventsub-message-timestamp']);
    // Merge into a single buffer
    const hmacMessage = Buffer.concat([Buffer.from(messageId, encoding), Buffer.from(messageTimestamp, encoding), buf]);

    // Calculate hash
    const hash = hmac.update(hmacMessage).digest('hex');

    // Compare calculated hash to signature from header
    if (hash !== signature) {
        logger.error('Request signatur is invalid');
        throw boom.badRequest('Request signature is invalid');
    }
};

const setupEventsubSubscriptions = async (apiClient: ApiClient, broadcasterId: string, rewardIds: Array<string>) => {
    // Get existing rewards
    const response = await apiClient.eventSub.getSubscriptionsForStatus('enabled');

    const existingRewards: Array<string> = response.data
        .filter((eventsub) => eventsub.condition.broadcaster_user_id == broadcasterId && eventsub.condition.reward_id)
        .map((eventsub) => eventsub.condition.reward_id as string);

    const rewardsWithoutEventsub = rewardIds.filter((rewardId: string) => !existingRewards.includes(rewardId));

    const pendingRequests: Array<Promise<HelixEventSubSubscription>> = [];
    for (const rewardId of rewardsWithoutEventsub) {
        pendingRequests.push(apiClient.eventSub.createSubscription(
            'channel.channel_points_custom_reward_redemption.add',
            '1',
            {
                broadcaster_user_id: broadcasterId,
                reward_id: rewardId
            },
            {
                method: 'webhook',
                callback: `${Config.SELF_BASE_URI}/webhooks/eventsub-callback`,
                secret: Config.EVENTSUB_SECRET
            }
        ));
    }

    await Promise.all(pendingRequests);
};

export { verifyEventSubSignature, setupEventsubSubscriptions };
