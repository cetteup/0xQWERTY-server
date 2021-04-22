export const appConfig = Object.freeze({
    LISTEN_PORT: Number(process.env.PORT || 3000),
    SELF_BASE_URI: process.env.SELF_BASE_URI || 'https://api.0xqwerty.com',
    CLIENT_ID: process.env.CLIENT_ID || '',
    APP_ACCESS_TOKEN: process.env.APP_ACCESS_TOKEN || '',
    EVENTSUB_SECRET: process.env.EVENTSUB_SECRET || '',
    SOCKETIO_SERVER_ADDR: process.env.SOCKETIO_SERVER_ADDR,
    CHATBOT_OAUTH_TOKEN: process.env.CHATBOT_OAUTH_TOKEN || '',
    CHATBOT_CHANNELS: process.env.CHATBOT_CHANNELS || ''
});