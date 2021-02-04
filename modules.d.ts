declare namespace NodeJS {
    export interface ProcessEnv {
      PORT: string;
      SOCKETIO_SERVER_ADDR: string;
      CHATBOT_OAUTH_TOKEN: string;
      CHATBOT_CHANNELS: string;
    }
  }