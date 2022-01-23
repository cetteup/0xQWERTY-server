import * as express from 'express';
import * as  http from 'http';
import * as socketio from 'socket.io';
import * as boom from '@hapi/boom';
import * as axios from 'axios';
import { verifyEventSubSignature, setupEventsubSubscriptions } from './utilities';
import Config from './config';

const app = express.default();

const server = http.createServer(app);
const io = new socketio.Server(server);

const twitchBodyParser = express.json({ verify: verifyEventSubSignature });

const observedTwitchEventsubIds: Array<string> = [];

const aclient = axios.default.create({
    timeout: 2000,
    headers: {
        'Client-Id': Config.CLIENT_ID,
        'Authorization': `Bearer ${Config.APP_ACCESS_TOKEN}`
    }
});

app.post('/client/eventsub-setup', express.json(), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.body?.broadcaster_id || !Array.isArray(req.body?.reward_ids)) {
        const err = boom.badData('Missing required parameters or invalid parameters');
        next(err);
    }
    else {
        try {
            await setupEventsubSubscriptions(aclient, req.body.broadcaster_id, req.body.reward_ids);
            res.status(200).json({ message: 'Eventsub subscriptions are all set up' });
        }
        catch (e) {
            console.log(e);
            const err = boom.badImplementation('Failed to set up eventsub subscriptions');
            next(err);
        }
    }
});

app.post('/webhooks/eventsub-callback', twitchBodyParser, (req: express.Request, res: express.Response) => {
    const messageId = String(req.headers['twitch-eventsub-message-id']);
    if (req.body?.event && !observedTwitchEventsubIds.includes(messageId)) {
        const redemption = {
            id: req.body.event.id,
            broadcaster: req.body.event.broadcaster_user_login,
            reward_id: req.body.event.reward.id,
            reward_title: req.body.event.reward.title,
            redeemed_by: req.body.event.user_name
        };
        io.to(`streamer:${req.body.event.broadcaster_user_login}`).emit('redemption', redemption);
        observedTwitchEventsubIds.push(messageId);
    }

    res.send(req.body.challenge);
});

app.use((err: boom.Boom, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Boomify error if not a boom error
    if (!boom.isBoom(err)) {
        err = boom.boomify(err);
    }
    res.status(err.output.statusCode).send({ errors: err?.data?.errors ? err.data.errors : [err.output.payload.message] });
});

// TODO: Add async function to retrieve manageable 

io.on('connect', (socket: socketio.Socket) => {
    console.log('Socket connected');

    socket.on('join', (room) => {
        socket.join(room);
        socket.send(`You joined ${room}`);
    });
});

server.listen(Config.LISTEN_PORT, () => {
    console.log(`Socket.IO server running at http://localhost:${Config.LISTEN_PORT}/`);
});
