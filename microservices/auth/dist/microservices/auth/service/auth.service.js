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
var AuthService_1;
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const user_schemas_1 = require("../schemas/user.schemas");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const user_coupon_service_1 = require("./user-coupon.service");
const microservices_1 = require("@nestjs/microservices");
const resilient_client_decorator_1 = require("../../../shared/common/decorators/resilient-client.decorator");
const crypto = require("crypto");
let AuthService = AuthService_1 = class AuthService {
    constructor(userRepository, jwtService, userCouponService, resilientService, contentClient) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.userCouponService = userCouponService;
        this.resilientService = resilientService;
        this.contentClient = contentClient;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async createGuestUser(deviceInfo, email) {
        const guestSessionId = crypto.randomBytes(32).toString('hex');
        const guestEmail = email || `guest_${guestSessionId}@temp.ecommerce`;
        const guestUser = this.userRepository.create({
            email: guestEmail,
            nombre: 'Usuario Invitado',
            proveedor: 'guest',
            idProveedor: guestSessionId,
            esInvitado: true,
            infoDispositivo: deviceInfo || {},
            ultimoInicioSesion: new Date(),
            fechaExpiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            etiquetas: ['NUEVO_USUARIO'],
        });
        await this.userRepository.save(guestUser);
        const jwtToken = await this.generateUserToken(guestUser);
        this.logger.log(`Created new guest user: ${guestUser.id}`);
        return { data: guestUser, guestToken: jwtToken };
    }
    async createBasicUser(email) {
        const user = this.userRepository.create({
            email,
            nombre: email.split('@')[0],
            proveedor: 'usuario basico',
            idProveedor: email,
            esInvitado: false,
            ultimoInicioSesion: new Date(),
            etiquetas: ['NUEVO_USUARIO'],
        });
        await this.userRepository.save(user);
        const token = await this.generateUserToken(user);
        return {
            data: user,
            message: 'USUARIO CREADO EXITOSAMENTE',
            success: true,
            token,
        };
    }
    async validateGuestUser(guestToken) {
        const user = await this.userRepository.findOne({
            where: {
                idProveedor: guestToken,
                proveedor: 'guest',
                esInvitado: true,
            },
        });
        if (user && user.fechaExpiracion && user.fechaExpiracion < new Date()) {
            return null;
        }
        return user;
    }
    async validateBasicUser(email, deviceInfo) {
        if (!email) {
            return {
                data: null,
                message: 'email is required',
                success: false,
            };
        }
        const user = await this.userRepository.findOne({
            where: {
                email,
            },
        });
        if (!user) {
            const guestUser = await this.createGuestUser(deviceInfo, email);
            return {
                data: guestUser.data,
                message: 'USUARIO CREADO EXITOSAMENTE',
                success: true,
                token: guestUser.guestToken,
            };
        }
        await this.ultimoInicioSesionUsuario('', email);
        const newToken = await this.generateUserToken(user);
        return {
            data: user,
            message: 'USUARIO ENCONTRADO',
            success: true,
            token: newToken,
        };
    }
    async generateUserToken(user) {
        const userCoupons = await this.userCouponService.getCouponsForToken(user.id);
        const payload = {
            sub: user.id.toString(),
            email: user.email,
            name: user.nombre,
            provider: user.proveedor,
            etiquetas: user.etiquetas || [],
            cupones: userCoupons,
            perfil: user.perfil || "administrador",
            numeroCelular: user.numeroCelular || "",
            numeroDocumento: user.numeroDocumento || ""
        };
        return this.jwtService.sign(payload, { expiresIn: '24h' });
    }
    async validateGoogleUser(profile) {
        const { idProveedor, email, nombre, avatar } = profile;
        let user = await this.userRepository.findOne({
            where: { idProveedor, proveedor: 'google' },
        });
        if (!user) {
            user = this.userRepository.create({
                email,
                nombre,
                avatar,
                proveedor: 'google',
                idProveedor,
                ultimoInicioSesion: new Date(),
                etiquetas: ['GOOGLE_USER'],
            });
        }
        else {
            user.ultimoInicioSesion = new Date();
        }
        await this.userRepository.save(user);
        return user;
    }
    async login(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            provider: user.proveedor,
            name: user.nombre,
            esInvitado: user.esInvitado || false,
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.nombre,
                provider: user.proveedor,
                avatar: user.avatar,
                esInvitado: user.esInvitado || false,
                guestToken: user.esInvitado ? user.idProveedor : null,
            },
        };
    }
    async loginGuest(guestToken) {
        const user = await this.validateGuestUser(guestToken);
        if (!user) {
            throw new Error('Guest token expired or invalid');
        }
        return this.login(user);
    }
    async migrateGuestToRegistered(guestToken, googleProfile) {
        const guestUser = await this.validateGuestUser(guestToken);
        if (!guestUser) {
            throw new Error('Guest token expired or invalid');
        }
        const googleUser = await this.validateGoogleUser(googleProfile);
        await this.userRepository.delete(guestUser.id);
        this.logger.log(`Migrated guest ${guestToken} to Google user ${googleUser.email}`);
        return googleUser;
    }
    async extractTokenFromContext(context) {
        const request = context.getArgByIndex(1)?.req || context.switchToHttp()?.getRequest();
        if (!request?.headers?.authorization) {
            this.logger.warn('No authorization header found');
            return null;
        }
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : null;
    }
    async validateToken(token) {
        try {
            return this.jwtService.verify(token);
        }
        catch (error) {
            return null;
        }
    }
    async ultimoInicioSesionUsuario(token, email) {
        if (!email) {
            await this.userRepository.update(`guest_${token}`, {
                ultimoInicioSesion: new Date(),
            });
        }
        else {
            await this.userRepository.update(email, {
                ultimoInicioSesion: new Date(),
            });
        }
    }
    async getUsuarioEtiquetas(usuario_id) {
        const user = await this.userRepository.findOne({
            where: { id: Number(usuario_id) },
            select: { etiquetas: true },
        });
        const etiquetas = user?.etiquetas || [];
        this.logger.log(`Etiquetas para usuario ${usuario_id}: ${JSON.stringify(etiquetas)}`);
        return { etiquetas };
    }
    async getUserByDocument(documento) {
        try {
            const user = await this.userRepository.findOne({
                where: { id: documento },
            });
            if (!user) {
                return {
                    data: null,
                    success: false,
                    message: 'Usuario no encontrado',
                };
            }
            return {
                data: user,
                success: true,
                message: 'Usuario encontrado',
            };
        }
        catch (error) {
            this.logger.error('Error al obtener usuario por documento:', error);
            return {
                data: null,
                success: false,
                message: 'Error al buscar usuario',
            };
        }
    }
    async createUserCoupon(couponData) {
        try {
            const resilientOptions = {
                retries: 3,
                delay: 1000,
                fallback: async () => {
                    this.logger.warn('Using fallback for cupon limit - defaulting to 1');
                    return 1;
                },
                circuitBreaker: {
                    failureThreshold: 3,
                    resetTimeout: 30000,
                },
            };
            try {
                const cuponRes = await this.resilientService.sendWithResilience(this.contentClient, { cmd: 'obtener_cupon_por_id' }, { id: couponData.idCupon }, { retries: 2, delay: 800, fallback: async () => null, circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 } });
                const cupon = cuponRes?.data;
                if (cupon && cupon.vigente === false) {
                    return {
                        success: false,
                        message: 'EL CUPÓN ESTÁ VENCIDO O INACTIVO Y NO PUEDE ASIGNARSE',
                    };
                }
            }
            catch (e) {
                this.logger.warn('No se pudo verificar vigencia del cupón, se continúa', e);
            }
            const limitePorUsuarioCupon = await this.resilientService.sendWithResilience(this.contentClient, { cmd: 'listarCuponId' }, { idCupon: couponData.idCupon }, resilientOptions);
            const limiteRaw = Number(limitePorUsuarioCupon);
            const limite = Number.isFinite(limiteRaw) ? limiteRaw : 1;
            if (limite > 0) {
                const cantidadCuponesUsuario = await this.userCouponService.getUserCouponsCount(couponData.userId, couponData.idCupon);
                if (cantidadCuponesUsuario >= limite) {
                    return {
                        success: false,
                        message: 'USUARIO YA TIENE EL MÁXIMO DE ESTE CUPÓN',
                    };
                }
            }
            const coupon = await this.userCouponService.createCouponForUser(couponData.userId, {
                idCupon: couponData.idCupon,
                descripcion: couponData.descripcion,
                eventId: couponData.eventId,
            });
            if (!coupon) {
                return {
                    success: false,
                    message: 'USUARIO YA TIENE ESTE CUPÓN',
                };
            }
            return {
                success: true,
                message: 'Cupón creado exitosamente'.toUpperCase(),
                data: coupon,
            };
        }
        catch (error) {
            this.logger.error('Error al crear cupón de usuario:', error);
            return {
                success: false,
                message: 'Error al crear cupón',
            };
        }
    }
    async asignarCuponMasivo(payload) {
        const idCupon = Number(payload?.idCupon);
        const userIds = (Array.isArray(payload?.userIds) ? payload.userIds : [])
            .map((x) => Number(x))
            .filter((x) => Number.isFinite(x));
        if (!idCupon || userIds.length === 0) {
            return { success: false, message: 'FALTAN idCupon O userIds' };
        }
        try {
            const cuponRes = (await this.resilientService.sendWithResilience(this.contentClient, { cmd: 'obtener_cupon_por_id' }, { id: idCupon }, { retries: 2, delay: 800, fallback: async () => null, circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 } }));
            if (cuponRes?.data && cuponRes.data.vigente === false) {
                return { success: false, message: 'EL CUPÓN ESTÁ VENCIDO O INACTIVO Y NO PUEDE ASIGNARSE' };
            }
        }
        catch (e) {
            this.logger.warn('No se pudo verificar vigencia del cupón (masivo), se continúa', e);
        }
        let limite = 0;
        try {
            limite = (await this.resilientService.sendWithResilience(this.contentClient, { cmd: 'listarCuponId' }, { idCupon }, { retries: 2, delay: 800, fallback: async () => 0, circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 } }));
        }
        catch {
            limite = 0;
        }
        const asignados = [];
        const omitidos = [];
        const limiteNorm = Number.isFinite(limite) ? limite : 1;
        for (const uid of userIds) {
            try {
                if (limiteNorm > 0) {
                    const count = await this.userCouponService.getUserCouponsCount(uid, idCupon);
                    if (count >= limiteNorm) {
                        omitidos.push({ userId: uid, motivo: 'ya tiene el máximo del cupón' });
                        continue;
                    }
                }
                const created = await this.userCouponService.createCouponForUser(uid, {
                    idCupon,
                    descripcion: payload?.descripcion || 'Asignación masiva',
                });
                if (created)
                    asignados.push(uid);
                else
                    omitidos.push({ userId: uid, motivo: 'ya tiene el cupón' });
            }
            catch (e) {
                this.logger.error(`Error asignando cupón ${idCupon} al usuario ${uid}`, e);
                omitidos.push({ userId: uid, motivo: 'error' });
            }
        }
        return {
            success: true,
            message: `Asignados ${asignados.length}, omitidos ${omitidos.length}`,
            data: { asignados, omitidos },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_schemas_1.User)),
    __param(4, (0, common_1.Inject)('CONTENT_SERVICE')),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _b : Object, user_coupon_service_1.UserCouponService,
        resilient_client_decorator_1.ResilientService, typeof (_c = typeof microservices_1.ClientProxy !== "undefined" && microservices_1.ClientProxy) === "function" ? _c : Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map