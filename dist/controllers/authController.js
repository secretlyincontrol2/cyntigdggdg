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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.loginUser = exports.registerUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};
// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { lastname, firstname, middlename, matricNumber, schoolEmail, password } = req.body;
    if (!lastname || !firstname || !matricNumber || !schoolEmail || !password) {
        res.status(400).json({ message: 'Please add all fields' });
        return;
    }
    // Password Validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        res.status(400).json({
            message: 'Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number and one special character.'
        });
        return;
    }
    // Check if user exists
    const userExists = yield prismaClient_1.default.user.findFirst({
        where: {
            OR: [
                { matricNumber },
                { schoolEmail }
            ]
        }
    });
    if (userExists) {
        res.status(400).json({ message: 'User already exists' });
        return;
    }
    // Hash password
    const salt = yield bcryptjs_1.default.genSalt(10);
    const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
    // Create user
    try {
        const user = yield prismaClient_1.default.user.create({
            data: {
                lastname,
                firstname,
                middlename,
                matricNumber,
                schoolEmail,
                password: hashedPassword,
            },
        });
        res.status(201).json({
            _id: user.id,
            name: `${user.firstname} ${user.lastname}`,
            email: user.schoolEmail,
            token: generateToken(user.id),
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ message: 'Invalid user data' });
    }
});
exports.registerUser = registerUser;
// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { matricNumber, password } = req.body;
    // Check for user
    const user = yield prismaClient_1.default.user.findUnique({
        where: { matricNumber }
    });
    if (user && (yield bcryptjs_1.default.compare(password, user.password))) {
        res.json({
            _id: user.id,
            name: `${user.firstname} ${user.lastname}`,
            email: user.schoolEmail,
            token: generateToken(user.id),
            isOnboarded: !!user.school,
        });
    }
    else {
        res.status(400).json({ message: 'Invalid credentials' });
    }
});
exports.loginUser = loginUser;
// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // req.user is set by auth middleware
    const user = yield prismaClient_1.default.user.findUnique({
        where: { id: req.user.id }
    });
    if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
    }
    // Exclude password from response
    const { password } = user, userWithoutPassword = __rest(user, ["password"]);
    res.status(200).json(userWithoutPassword);
});
exports.getMe = getMe;
