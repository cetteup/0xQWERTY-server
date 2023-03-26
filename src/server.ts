import * as boom from '@hapi/boom';
import * as express from 'express';
import * as http from 'http';
import { customAlphabet } from 'nanoid';
import * as socketio from 'socket.io';
import Config from './config';
import { asyncLocalStorage, logger } from './logger';
import { setupEventsubSubscriptions, verifyEventSubSignature } from './utility';
import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';

const app = express.default();

const server = http.createServer(app);
const io = new socketio.Server(server);

const twitchBodyParser = express.json({ verify: verifyEventSubSignature });

const observedTwitchEventsubIds: Array<string> = [];

const authProvider = new RefreshingAuthProvider({
    clientId: Config.CLIENT_ID,
    clientSecret: Config.CLIENT_SECRET
});
const apiClient = new ApiClient({ authProvider });

// Set up request-based error logging
app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const requestId: string = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 6)();
    await asyncLocalStorage.run({ requestId },  async () => {
        return next();
    });
});

app.post('/client/eventsub-setup', express.json(), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.body?.broadcaster_id || !Array.isArray(req.body?.reward_ids)) {
        const err = boom.badData('Missing required parameters or invalid parameters');
        next(err);
    }
    else {
        try {
            await setupEventsubSubscriptions(apiClient, req.body.broadcaster_id, req.body.reward_ids);
            res.status(200).json({ message: 'Eventsub subscriptions are all set up' });
        }
        catch (e: any) {
            logger.error('Failed to set up eventsub subscriptions', e.message);
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
    logger.info('Socket', socket.id, 'connected');

    socket.on('join', (room) => {
        logger.info('Socket', socket.id, 'joined', room);
        socket.join(room);
        socket.send(`You joined ${room}`);
    });
});

server.listen(Config.LISTEN_PORT, () => {
    logger.info(`Socket.IO/Express server running at http://localhost:${Config.LISTEN_PORT}/`);
});
