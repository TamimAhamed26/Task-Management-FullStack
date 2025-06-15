// app/(auth)/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',

        },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200 via-base-300 to-base-100 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-base-100 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-sm bg-opacity-95">
          
          {/* Left Side - Branding & Illustration */}
          <div className="relative bg-gradient-to-br from-primary to-secondary p-12 flex flex-col justify-center items-center text-primary-content overflow-hidden">
            <div className="absolute top-10 left-10 w-20 h-20 border border-primary-content/20 rounded-full"></div>
            <div className="absolute bottom-10 right-10 w-32 h-32 border border-primary-content/10 rounded-full"></div>
            <div className="absolute top-1/2 left-0 w-4 h-32 bg-primary-content/10 rounded-r-full"></div>
            
            <div className="relative z-10 text-center">
              <div className="mb-8">
                <div className="w-24 h-24 mx-auto mb-6 bg-primary-content/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-12 h-12 text-primary-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary-content to-primary-content/80 bg-clip-text">
                  Welcome Back
                </h1>
                <p className="text-xl text-primary-content/90 leading-relaxed max-w-md">
                  Secure access to your personalized dashboard. Manage your tasks with confidence and efficiency.
                </p>
              </div>
              
              {/* Features list */}
              <div className="space-y-4 text-left max-w-sm">
                <div className="flex items-center space-x-3 text-primary-content/80">
                  <div className="w-2 h-2 bg-primary-content rounded-full"></div>
                  <span className="text-sm">End-to-end encryption</span>
                </div>
                <div className="flex items-center space-x-3 text-primary-content/80">
                  <div className="w-2 h-2 bg-primary-content rounded-full"></div>
                  <span className="text-sm">Real-time synchronization</span>
                </div>
                <div className="flex items-center space-x-3 text-primary-content/80">
                  <div className="w-2 h-2 bg-primary-content rounded-full"></div>
                  <span className="text-sm">24/7 customer support</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="p-12 lg:p-16 flex flex-col justify-center">
            <div className="w-full max-w-md mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-base-content mb-2">Sign In</h2>
                <p className="text-base-content/60">Enter your credentials to access your account</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                {/* Email Field */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-base-content/80">Email Address</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="john@example.com"
                      className="input input-bordered w-full pl-12 pr-4 py-3 text-base focus:input-primary transition-all duration-300 bg-base-200/50"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-base-content/80">Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="input input-bordered w-full pl-12 pr-12 py-3 text-base focus:input-primary transition-all duration-300 bg-base-200/50"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-base-content/40 hover:text-base-content/60 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember me & Forgot password */}
                <div className="flex items-center justify-between">
                  <label className="label cursor-pointer">
<input
  type="checkbox"
  checked={rememberMe}
  onChange={(e) => setRememberMe(e.target.checked)}
  className="checkbox checkbox-primary checkbox-sm mr-2"
/>                    <span className="label-text text-sm text-base-content/70">Remember me</span>
                  </label>
                  <a href="#" className="link link-primary text-sm font-medium hover:underline">
                    Forgot password?
                  </a>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="alert alert-error shadow-lg">
                    <svg className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary w-full py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:loading"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>

                {/* Divider */}
                <div className="divider text-base-content/40">OR</div>

                {/* Social Login */}
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" className="btn btn-outline btn-neutral hover:btn-neutral transition-all duration-300">
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </button>
                  <button type="button" className="btn btn-outline btn-neutral hover:btn-neutral transition-all duration-300">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </button>
                </div>

                {/* Sign up link */}
                <div className="text-center pt-6">
                  <p className="text-base-content/60">
                    Don't have an account?{' '}
                    <a href="#" className="link link-primary font-semibold hover:underline">
                      Sign up 
                    </a>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}