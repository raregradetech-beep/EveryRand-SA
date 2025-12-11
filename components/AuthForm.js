// components/AuthForm.js
'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../lib/firebase';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        try {
            if (isLogin) {
                // Log In existing user
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                // Register new user
                await createUserWithEmailAndPassword(auth, email, password);
            }
            // Success! Redirect to the budget page
            router.push('/');

        } catch (err) {
            console.error("Auth Error:", err);
            // Show user-friendly error messages
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                setError("Incorrect email or password. Please check your details.");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("This email address is already registered. Try logging in.");
            } else {
                setError("An unknown error occurred. Check your internet connection.");
            }
        }
    };

    return (
        <div className="max-w-md mx-auto p-8 mt-16 bg-white rounded-xl shadow-2xl border border-gray-100">
            <h2 className="text-3xl font-bold text-center text-blue-700 mb-6">
                {isLogin ? 'Welcome Back!' : 'Start Your Zero-Based Budget'}
            </h2>
            <p className="text-center text-gray-500 mb-8">
                {isLogin ? 'Log in to Every Rand.' : 'Sign up and give every rand a name.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    />
                </div>
                <div>
                    <input
                        type="password"
                        placeholder="Password (min 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    />
                </div>

                {error && (
                    <div className="text-red-600 bg-red-50 p-3 rounded border border-red-200 text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white font-bold p-3 rounded-lg hover:bg-blue-700 transition duration-150 shadow-md"
                >
                    {isLogin ? 'Log In' : 'Sign Up'}
                </button>
            </form>

            <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="mt-6 w-full text-center text-sm text-blue-600 hover:text-blue-800 transition duration-150"
            >
                {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Log In'}
            </button>
        </div>
    );
}
