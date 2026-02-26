import { ConfigService } from '@nestjs/config';
declare const GoogleStrategy_base: new (...args: any) => any;
export declare class GoogleStrategy extends GoogleStrategy_base {
    private configService;
    constructor(configService: ConfigService);
    validate(accessToken: string, refreshToken: string, profile: any, done: Function): Promise<void>;
}
export {};
