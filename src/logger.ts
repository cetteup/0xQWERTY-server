import { AsyncLocalStorage } from 'async_hooks';
import { ISettings, ISettingsParam, Logger, TLogLevelName } from 'tslog';
import Config from './config';
import { LogLevel } from '@twurple/chat';

const asyncLocalStorage: AsyncLocalStorage<{ 'requestId': string }> = new AsyncLocalStorage();

export class TwurpleCompatibleLogger extends Logger {
    constructor(settings: ISettingsParam, parentSettings?: ISettings) {
        super(settings, parentSettings);
    }

    public log(level: LogLevel, message: string) {
        switch (level) {
            case LogLevel.CRITICAL:
                this.fatal(message);
                break;
            case LogLevel.ERROR:
                this.error(message);
                break;
            case LogLevel.WARNING:
                this.warn(message);
                break;
            case LogLevel.DEBUG:
                this.debug(message);
                break;
            case LogLevel.TRACE:
                this.trace(message);
                break;
            default:
                this.info(message);
                break;
        }
    }

    public getChildLogger(settings?: ISettingsParam): TwurpleCompatibleLogger {
        const childSettings: ISettings = {
            ...this.settings,
            attachedTransports: [...this.settings.attachedTransports],
        };

        return new (this.constructor as new (
            settings?: ISettingsParam,
            parentSettings?: ISettings
        ) => this)(settings, childSettings);
    }
}

const logger = new TwurpleCompatibleLogger({
    name: 'MainLogger',
    minLevel: Config.LOG_LEVEL as TLogLevelName,
    displayFunctionName: false,
    requestId: (): string => {
        return asyncLocalStorage.getStore()?.requestId as string;
    }
});
export { asyncLocalStorage, logger };
