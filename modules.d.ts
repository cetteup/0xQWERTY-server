declare namespace NodeJS {
    export interface ProcessEnv {
      PORT: string;
      EVENTSUB_SECRET: string;
      SOCKETIO_SERVER_ADDR: string;
      CHATBOT_OAUTH_TOKEN: string;
      CHATBOT_CHANNELS: string;
    }
  }