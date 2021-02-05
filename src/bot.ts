import * as socketio from 'socket.io-client';
import * as tmi from 'tmi.js';

console.log('Connecting to socket.io server', process.env.SOCKETIO_SERVER_ADDR);
const io = socketio(process.env.SOCKETIO_SERVER_ADDR);

const chatbotChannels = process.env.CHATBOT_CHANNELS.split(' ');

const client = new tmi.Client({
    options: { debug: true },
    connection: { reconnect: true },
    identity: {
        username: '0xqwerty',
        password: `oauth:${process.env.CHATBOT_OAUTH_TOKEN}`
    },
    channels: chatbotChannels.slice()
});

client.connect();

// Join all channels we are supposed to annouce redemptions on
for (const channel of chatbotChannels) {
    console.log(`Joining ${channel}`);
    io.emit('join', `streamer:${channel}`);
}

interface redemption {
    id: string;
    broadcaster: string;
    reward_id: string;
    reward_title: string;
    redeemed_by: string;
}

io.on('redemption', (data: redemption) => {
    console.log('redemption', data);

    // If channel is a bot "client", announce redemption
    if (chatbotChannels.includes(data.broadcaster)) {
        client.say(data.broadcaster, `@${data.redeemed_by} redeemed: ${data.reward_title}`);
    }
});

io.on('message', (msg: string) => {
    console.log('message: ' + msg);
});
