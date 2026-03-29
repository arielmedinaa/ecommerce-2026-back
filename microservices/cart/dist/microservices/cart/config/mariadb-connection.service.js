"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MariaDbConnectionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MariaDbConnectionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
let MariaDbConnectionService = MariaDbConnectionService_1 = class MariaDbConnectionService {
    constructor(connection) {
        this.connection = connection;
        this.logger = new common_1.Logger(MariaDbConnectionService_1.name);
    }
    onModuleInit() {
        if (this.connection.isInitialized) {
            const { host, port, database } = this.connection.options;
            this.logger.log(`✅ Successfully connected to MariaDB database`);
            this.logger.log(`   Host: ${host}:${port}`);
            this.logger.log(`   Database: ${database}`);
        }
        else {
            this.logger.error('❌ Failed to connect to MariaDB database');
        }
    }
};
exports.MariaDbConnectionService = MariaDbConnectionService;
exports.MariaDbConnectionService = MariaDbConnectionService = MariaDbConnectionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectConnection)()),
    __metadata("design:paramtypes", [typeorm_2.Connection])
], MariaDbConnectionService);
//# sourceMappingURL=mariadb-connection.service.js.map