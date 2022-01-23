import * as socketio from 'socket.io-client';
import * as tmi from 'tmi.js';
import Config from './config';

console.log('Connecting to socket.io server', Config.SOCKETIO_SERVER_ADDR);
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
    console.log(`Joining ${channel}`);
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
    console.log('redemption', data);

    // If channel is a bot "client", announce redemption
    if (chatbotChannels.includes(data.broadcaster)) {
        client.say(data.broadcaster, `@${data.redeemed_by} redeemed: ${data.reward_title}`);
    }
});

io.on('message', (msg: string) => {
    console.log('message: ' + msg);
});
