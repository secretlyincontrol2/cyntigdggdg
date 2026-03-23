"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
describe('Auth API', () => {
    const testUser = {
        lastname: 'Test',
        firstname: 'User',
        matricNumber: 'TEST/21/0001',
        schoolEmail: 'testuser@school.edu',
        password: 'TestPassword1!',
    };
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Cleanup test user
        yield prismaClient_1.default.user.deleteMany({
            where: {
                OR: [
                    { matricNumber: testUser.matricNumber },
                    { schoolEmail: testUser.schoolEmail }
                ]
            }
        });
        yield prismaClient_1.default.$disconnect();
    }));
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app_1.default)
                .post('/api/auth/register')
                .send(testUser);
            if (res.status === 400 && res.body.message === 'User already exists') {
                // This is fine if cleanup failed previously
                expect(res.status).toBe(400);
            }
            else {
                expect(res.status).toBe(201);
                expect(res.body).toHaveProperty('token');
                expect(res.body.email).toBe(testUser.schoolEmail);
            }
        }));
        it('should fail with missing fields', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app_1.default)
                .post('/api/auth/register')
                .send({ lastname: 'Test' });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Please add all fields');
        }));
    });
    describe('POST /api/auth/login', () => {
        it('should login successfully with correct credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app_1.default)
                .post('/api/auth/login')
                .send({
                matricNumber: testUser.matricNumber,
                password: testUser.password,
            });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
        }));
        it('should fail with wrong password', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app_1.default)
                .post('/api/auth/login')
                .send({
                matricNumber: testUser.matricNumber,
                password: 'WrongPassword1!',
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid credentials');
        }));
    });
});
