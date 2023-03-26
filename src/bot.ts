import * as socketio from 'socket.io-client';
import Config from './config';
import { logger } from './logger';
import { ChatClient } from '@twurple/chat';
import { RefreshingAuthProvider } from '@twurple/auth';

interface Redemption {
    id: string;
    broadcaster: string;
    reward_id: string;
    reward_title: string;
    redeemed_by: string;
}

(async () => {
    logger.info('Connecting to socket.io server:', Config.SOCKETIO_SERVER_ADDR);
    let io: SocketIOClient.Socket;
    try {
        io = socketio.default(Config.SOCKETIO_SERVER_ADDR);
    }
    catch (e: unknown) {
        logger.fatal(`Failed to connect to socket.io server ${e}`, );
        process.exit(1);
    }

    const chatbotChannels = Config.CHATBOT_CHANNELS.split(' ');

    const authProvider = new RefreshingAuthProvider({
        clientId: Config.CLIENT_ID,
        clientSecret: Config.CLIENT_SECRET,
    });

    try {
        await authProvider.addUserForToken({
            expiresIn: null, obtainmentTimestamp: 0, scope: ['chat:read', 'chat:edit'],
            accessToken: Config.CHATBOT_ACCESS_TOKEN,
            refreshToken: Config.CHATBOT_REFRESH_TOKEN ?? null
        }, ['chat']);
    }
    catch (e: unknown) {
        logger.fatal(`Failed to configure auth provider with user: ${e}`,);
        process.exit(1);
    }

    const client = new ChatClient({
        channels: chatbotChannels.slice(),
        logger: {
            custom: logger.getChildLogger({name: 'ChatClientLogger'})
        },
        authProvider
    });


    try {
        await client.connect();
    }
    catch (e: unknown) {
        logger.fatal(`Failed to connect to Twitch chat: ${e}`);
        process.exit(1);
    }

    // Join all channels we are supposed to announce redemptions on
    for (const channel of chatbotChannels) {
        logger.info('Joining redemption announcement room for:', channel);
        io.emit('join', `streamer:${channel}`);
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
})();
