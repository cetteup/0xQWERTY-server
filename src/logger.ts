import { AsyncLocalStorage } from 'async_hooks';
import { Logger, TLogLevelName } from 'tslog';
import Config from './config';

const asyncLocalStorage: AsyncLocalStorage<{ 'requestId': string }> = new AsyncLocalStorage();

const logger: Logger = new Logger({
    name: 'MainLogger',
    minLevel: Config.LOG_LEVEL as TLogLevelName,
    displayFunctionName: false,
    requestId: (): string => {
        return asyncLocalStorage.getStore()?.requestId as string;
    }
});
export { asyncLocalStorage, logger };
