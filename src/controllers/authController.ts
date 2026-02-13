import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
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
    const userExists = await User.findOne({ $or: [{ matricNumber }, { schoolEmail }] });

    if (userExists) {
        res.status(400).json({ message: 'User already exists' });
        return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
        lastname,
        firstname,
        middlename,
        matricNumber,
        schoolEmail,
        password: hashedPassword,
    });

    if (user) {
        res.status(201).json({
            _id: user.id,
            name: `${user.firstname} ${user.lastname}`,
            email: user.schoolEmail,
            token: generateToken(user.id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
    const { matricNumber, password } = req.body;

    // Check for user email
    const user = await User.findOne({ matricNumber });

    if (user && (await bcrypt.compare(password, user.password as string))) {
        res.json({
            _id: user.id,
            name: `${user.firstname} ${user.lastname}`,
            email: user.schoolEmail,
            token: generateToken(user.id),
            // Return onboarding status indicator if needed?
            isOnboarded: !!user.school, // Simple check if they have completed academic info
        });
    } else {
        res.status(400).json({ message: 'Invalid credentials' });
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: any, res: Response) => {
    // req.user is set by auth middleware
    const user = await User.findById(req.user.id);

    res.status(200).json(user);
};
