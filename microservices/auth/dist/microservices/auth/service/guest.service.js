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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_schemas_1 = require("../schemas/user.schemas");
const crypto = require("crypto");
const jwt_1 = require("@nestjs/jwt");
let GuestService = class GuestService {
    constructor(userRepository, jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }
    async createGuestToken(ipAddress, userAgent) {
        const token = crypto.randomBytes(32).toString('hex');
        const existingGuest = await this.userRepository.findOne({
            where: {
                proveedor: 'guest',
                idProveedor: token,
                esInvitado: true,
            },
        });
        if (existingGuest) {
            existingGuest.ultimoInicioSesion = new Date();
            await this.userRepository.save(existingGuest);
            const payload = {
                sub: existingGuest.id.toString(),
                email: existingGuest.email,
                name: existingGuest.nombre,
                provider: existingGuest.proveedor,
                etiquetas: existingGuest.etiquetas || [],
                cupones: [],
                perfil: existingGuest.perfil || "cliente",
                numeroCelular: existingGuest.numeroCelular || "",
                numeroDocumento: existingGuest.numeroDocumento || ""
            };
            const jwtToken = this.jwtService.sign(payload, { expiresIn: '7d' });
            return { token: jwtToken, user: existingGuest };
        }
        const guestUser = this.userRepository.create({
            email: `guest_${token}@temp.ecommerce`,
            nombre: 'Usuario Invitado',
            proveedor: 'guest',
            idProveedor: token,
            esInvitado: true,
            infoDispositivo: { ipAddress, userAgent },
            ultimoInicioSesion: new Date(),
            fechaExpiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        const payload = {
            sub: guestUser.id.toString(),
            email: guestUser.email,
            name: guestUser.nombre,
            provider: guestUser.proveedor,
            etiquetas: guestUser.etiquetas || [],
            cupones: [],
            perfil: guestUser.perfil || "cliente",
            numeroCelular: guestUser.numeroCelular || "",
            numeroDocumento: guestUser.numeroDocumento || ""
        };
        await this.userRepository.save(guestUser);
        const jwtToken = this.jwtService.sign(payload, { expiresIn: '7d' });
        return { token: jwtToken, user: guestUser };
    }
};
exports.GuestService = GuestService;
exports.GuestService = GuestService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_schemas_1.User)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _b : Object])
], GuestService);
//# sourceMappingURL=guest.service.js.map