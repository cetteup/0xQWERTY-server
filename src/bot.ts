import * as socketio from 'socket.io-client';
import * as tmi from 'tmi.js';
import Config from './config';
import { logger } from './logger';

logger.info('Connecting to socket.io server:', Config.SOCKETIO_SERVER_ADDR);
const io = socketio.default(Config.SOCKETIO_SERVER_ADDR);

const chatbotChannels = Config.CHATBOT_CHANNELS.split(' ');

const client = new tmi.Client({
    options: { debug: true },
    connection: { reconnect: true },
    identity: {
        username: '0xqwerty',
        password: `oauth:${Config.CHATBOT_OAUTH_TOKEN}`
    },
    channels: chatbotChannels.slice()
});

client.connect();

// Join all channels we are supposed to annouce redemptions on
for (const channel of chatbotChannels) {
    logger.info(`Joining Twitch chat of channel:`, channel);
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
