export default abstract class Config {
    static readonly LISTEN_PORT: number = Number(process.env.PORT || 8080);
    static readonly LOG_LEVEL: string = process.env.LOG_LEVEL || 'info';
    static readonly SELF_BASE_URI: string = process.env.SELF_BASE_URI || 'ttps://api.0xqwerty.com';
    static readonly CLIENT_ID: string = process.env.CLIENT_ID || '';
    static readonly APP_ACCESS_TOKEN: string = process.env.APP_ACCESS_TOKEN || '';
    static readonly EVENTSUB_SECRET: string = process.env.EVENTSUB_SECRET || '';
    static readonly SOCKETIO_SERVER_ADDR: string = process.env.SOCKETIO_SERVER_ADDR || '';
    static readonly CHATBOT_OAUTH_TOKEN: string = process.env.CHATBOT_OAUTH_TOKEN || '';
    static readonly CHATBOT_CHANNELS: string = process.env.CHATBOT_CHANNELS || '';
}