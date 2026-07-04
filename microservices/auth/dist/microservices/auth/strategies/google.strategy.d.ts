declare const GoogleStrategy_base: any;
export declare class GoogleStrategy extends GoogleStrategy_base {
    private readonly logger;
    private readonly enabled;
    constructor();
    validate(accessToken: string, refreshToken: string, profile: any, done: Function): Promise<void>;
}
export {};
