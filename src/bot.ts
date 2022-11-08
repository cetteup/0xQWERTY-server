import * as socketio from 'socket.io-client';
import * as tmi from 'tmi.js';
import Config from './config';
import { logger } from './logger';
import axios from 'axios';

logger.info('Connecting to socket.io server:', Config.SOCKETIO_SERVER_ADDR);
const io = socketio.default(Config.SOCKETIO_SERVER_ADDR);

const chatbotChannels = Config.CHATBOT_CHANNELS.split(' ');
const oauthTokens: {
    access: string
    refresh?: string
} = {
    access: Config.CHATBOT_ACCESS_TOKEN,
    refresh: Config.CHATBOT_REFRESH_TOKEN
};

const client = new tmi.Client({
    connection: { reconnect: true },
    identity: {
        username: '0xqwerty',
        password: getClientPassword
    },
    channels: chatbotChannels.slice(),
    options: {
        messagesLogLevel: 'debug'
    },
    logger: logger.getChildLogger({ name: 'tmiLogger' })
});

client.connect();

// Join all channels we are supposed to announce redemptions on
for (const channel of chatbotChannels) {
    logger.info('Joining redemption announcement room for:', channel);
    io.emit('join', `streamer:${channel}`);
}

interface Redemption {
    id: string;
    broadcaster: string;
    reward_id: string;
    reward_title: string;
    redeemed_by: string;
}

io.on('redemption', (data: Redemption) => {
    logger.info('Received channel point redemption:', data);

    // If channel is a bot "client", announce redemption
    if (chatbotChannels.includes(data.broadcaster)) {
        client.say(data.broadcaster, `@${data.redeemed_by} redeemed: ${data.reward_title}`);
    }
});

io.on('message', (msg: string) => {
    logger.info('Received Socket.IO message:', msg);
});

type TwitchTokenResponse = {
    access_token: string
    expires_in: number
    refresh_token: string
    scope: string[]
    token_type: string
}

async function getClientPassword(): Promise<string> {
    // Return current access token if refresh is not possible or access token is still valid
    if (!Config.CLIENT_SECRET || !oauthTokens.refresh) {
        logger.debug('Chatbot token refresh is not available, continuing with initially configured access token');
        return formatOAuthPassword(oauthTokens.access);
    }

    if (await isAccessTokenValid(oauthTokens.access)) {
        logger.debug('Chatbot access token is still valid, continuing with current access token');
        return formatOAuthPassword(oauthTokens.access);
    }

    const params = new URLSearchParams({
        client_id: Config.CLIENT_ID,
        client_secret: Config.CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: oauthTokens.refresh
    });

    try {
        const resp = await axios.post('https://id.twitch.tv/oauth2/token', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const data: TwitchTokenResponse = resp.data;
        oauthTokens.access = data.access_token;
        oauthTokens.refresh = data.refresh_token;
        logger.debug('Successfully refreshed chatbot access token');
    }
    catch (e: any) {
        logger.error('Failed to refresh chatbot access token:', e.message);
    }

    // We can't really handle any errors during the refresh (e.g. Twitch offline, refresh token invalid),
    // so just return the current access token (refreshed or not)
    return formatOAuthPassword(oauthTokens.access);
}

export async function isAccessTokenValid(accessToken: string): Promise<boolean> {
    try {
        await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-Id': Config.CLIENT_ID,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return true;
    }
    catch (e) {
        return false;
    }
}

export function formatOAuthPassword(accessToken: string) {
    return `oauth:${accessToken}`;
}

