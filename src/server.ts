import * as express from 'express';
import * as  http from 'http';
import * as socketio from 'socket.io';
import * as boom from '@hapi/boom';
import { verifyEventSubSignature } from './utilites';

const port = Number(process.env.PORT || 3000);

const app = express();

const server = http.createServer(app);
const io = new socketio.Server(server);

const twitchBodyParser = express.json({ verify: verifyEventSubSignature });

app.post('/webhooks/eventsub-callback', twitchBodyParser, (req, res) => {
    console.log(req.body);

    if (req.body?.event) {
        const redemption = {
            id: req.body.event.id,
            broadcaster: req.body.event.broadcaster_user_login,
            reward_id: req.body.event.reward.id,
            reward_title: req.body.event.reward.title,
            redeemed_by: req.body.event.user_name
        };
        io.to(`streamer:${req.body.event.broadcaster_user_login}`).emit('redemption', redemption);
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

// TODO: Add POST endpoint to add new EventSub subscription

// TODO: Add async function to retrieve manageable 

io.on('connect', (socket: socketio.Socket) => {
    console.log('Socket connected');

    socket.on('join', (room) => {
        socket.join(room);
        socket.send(`You joined ${room}`);
    });
});

server.listen(port, () => {
    console.log(`Socket.IO server running at http://localhost:${port}/`);
});
