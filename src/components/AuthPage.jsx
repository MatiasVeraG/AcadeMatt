import React, { useEffect, useState } from 'react';
import { Mail, Lock, User, AlertCircle, Loader2, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import bgImage from '../../images/BG.png';

const AuthPage = ({ onAuthSuccess, onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const { login, signup, loginWithGoogle, resetPassword } = useAuth();

  const handleLogin = async () => {
    try {
      const result = await login(email, password);
      setNotice('');
      onAuthSuccess(result?.redirectPath);
    } catch (err) {
      const code = err.code || err.message;

      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        setNotice('');
        setError('Invalid email or password. Please try again.');
        return;
      }

      if (code === 'auth/wrong-password') {
        setNotice('');
        setError('Invalid email or password. Please try again.');
        return;
      }

      if (code === 'auth/network-request-failed') {
        setNotice('');
        setError('Check your internet connection.');
        return;
      }

      if (code === 'auth/email-not-verified') {
        setNotice('');
        setError('We sent you a confirmation email. Verify your account before signing in.');
        return;
      }

      if ((err.code || err.message) === 'auth/profile-not-found') {
        setNotice('');
        setError('You do not have an active AcadeMatt account. Sign up with email and username.');
        return;
      }

      setNotice('');
      setError(getErrorMessage(code));
    }
  };

  useEffect(() => {
    try {
      const profileMissing = sessionStorage.getItem('auth_profile_missing') === '1';
      if (!profileMissing) return;

      const pendingEmail = sessionStorage.getItem('auth_profile_missing_email') || '';
      const pendingName = sessionStorage.getItem('auth_profile_missing_name') || '';

      setIsLogin(true);
      if (pendingEmail) setEmail(pendingEmail);
      if (pendingName) setDisplayName(pendingName);
      setNotice('');
      setError('You do not have an active AcadeMatt account. Sign up with email and username.');

      sessionStorage.removeItem('auth_profile_missing');
      sessionStorage.removeItem('auth_profile_missing_email');
      sessionStorage.removeItem('auth_profile_missing_name');
    } catch (_) {}
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      if (isLogin) {
        await handleLogin();
      } else {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        // Todos los nuevos usuarios son estudiantes por defecto
        await signup(email, password, displayName, 'student');
        setNotice('Your account was created successfully. Please confirm your email before signing in.');
        setIsLogin(true);
        setPassword('');
        return;
      }
    } catch (err) {
      if ((err.code || err.message) !== 'auth/profile-not-found') {
        console.error(err);
      }
      const code = err.code || err.message;
      if (code === 'auth/email-already-in-use-unverified') {
        setError('');
        setNotice(getErrorMessage(code));
      } else {
        setError(getErrorMessage(code));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      onAuthSuccess(result?.redirectPath);
      return;
    } catch (err) {
      if ((err.code || err.message) !== 'auth/profile-not-found') {
        console.error(err);
      }
      if ((err.code || err.message) === 'auth/profile-not-found') {
        setNotice('');
        setError("We couldn't find an existing profile linked to this Google account. Tap 'Sign Up' to create your AcadeMatt account.");
        return;
      }
      setError(getErrorMessage(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code) => {
    const errors = {
      'auth/email-already-in-use': 'An account with this email already exists. Please sign in or reset your password.',
      'auth/email-in-use-with-google': 'This email is already registered with Google. Please use Sign In with Google.',
      'auth/email-already-in-use-unverified': 'La cuenta ya existe y no esta verificada. Te reenviamos el correo de activacion.',
      'auth/invalid-email': 'Invalid email address',
      'auth/user-not-found': 'Invalid email or password. Please try again.',
      'auth/wrong-password': 'Invalid email or password. Please try again.',
      'auth/weak-password': 'Password is too weak',
      'auth/invalid-credential': 'Invalid email or password. Please try again.',
      'auth/network-request-failed': 'Check your internet connection.',
      'permission-denied': 'No se pudo completar el registro por permisos de base de datos. Intenta de nuevo.',
      'auth/popup-blocked': 'Popup bloqueado por el navegador. Habilita popups para continuar con Google.',
      'auth/unauthorized-domain': 'Este dominio no esta autorizado en Firebase Auth. Agrega academatt.com en Authorized domains.',
      'auth/operation-not-allowed': 'Google Sign-In no esta habilitado en Firebase Authentication.',
      'auth/email-not-verified': 'We sent you a confirmation email. Verify your account before signing in.',
      'auth/profile-not-found': 'We could not find your AcadeMatt user. Complete Sign Up first.',
    };
    return errors[code] || 'Something went wrong, please try again later.';
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setError(getErrorMessage(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  const goBackToLogin = () => {
    setIsForgotPassword(false);
    setResetSent(false);
    setError('');
    setNotice('');
    setEmail('');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#2148c0] flex flex-col">
      {/* Background blob image */}
      <div className="absolute inset-0 w-full h-full">
        <img alt="" className="absolute block w-full h-full object-cover object-center" src={bgImage} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 px-10 py-6">
        <button onClick={onBack} className="text-white text-4xl font-bold hover:opacity-80 transition-opacity" style={{ fontFamily: "'DM Sans', sans-serif" }}>AcadeMatt</button>
      </nav>

      {/* Form container */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 pb-8">
        <div className="w-full max-w-[375px]">

          {/* Title */}
          <h2
            className="font-bold text-white text-center mb-10"
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '52.851px', letterSpacing: '-0.4297px' }}
          >
            {isForgotPassword ? 'Password Recovery' : isLogin ? 'Log In' : 'Sign Up'}
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-white/10 border border-white/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-100">{error}</p>
            </div>
          )}

          {notice && (
            <div className="mb-4 bg-white/10 border border-white/30 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-100">{notice}</p>
            </div>
          )}

          {/* ΓöÇΓöÇ Forgot Password Flow ΓöÇΓöÇ */}
          {isForgotPassword ? (
            resetSent ? (
              <div className="flex flex-col items-center gap-6 text-center">
                <CheckCircle className="w-14 h-14 text-green-300" />
                <p className="text-white text-xl font-semibold" style={{ fontFamily: 'DM Sans, sans-serif' }}>Email sent!</p>
                <p className="text-white/70 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Check your inbox at <strong className="text-white">{email}</strong>.
                </p>
                <button
                  onClick={goBackToLogin}
                  className="w-full h-[56px] bg-white rounded-[5px] shadow-[0px_5px_5px_0px_rgba(0,0,0,0.30)] text-[#2148c0] text-xl font-semibold uppercase hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  <ArrowLeft className="w-5 h-5" /> Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="flex flex-col items-center gap-4">
                <div className="relative w-full h-[56px]">
                  <div className="absolute inset-0 rounded-[5px] border-[1.25px] border-white" />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="absolute inset-0 bg-white/10 pl-12 pr-4 text-white text-[17.485px] font-light uppercase placeholder:text-white/60 focus:outline-none rounded-[5px]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                    placeholder="Email"
                    required
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[56px] bg-white rounded-[5px] shadow-[0px_5px_5px_0px_rgba(0,0,0,0.30)] text-[#2148c0] text-[19.983px] font-semibold uppercase hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center justify-center"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset my password'}
                </button>
                <button
                  type="button"
                  onClick={goBackToLogin}
                  className="flex items-center justify-center gap-2 text-white/70 hover:text-white text-sm"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>
              </form>
            )
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-3">
                {!isLogin && (
                  <div className="relative h-[56px]">
                    <div className="absolute inset-0 rounded-[5px] border-[1.25px] border-white" />
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[25px] h-[25px] text-white" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="absolute inset-0 bg-white/10 pl-12 pr-4 text-white text-[17.485px] font-light uppercase placeholder:text-white/60 focus:outline-none rounded-[5px]"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                      placeholder="Username"
                      required={!isLogin}
                    />
                  </div>
                )}

                <div className="relative h-[56px]">
                  <div className="absolute inset-0 rounded-[5px] border-[1.25px] border-white" />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[25px] h-[25px] text-white" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="absolute inset-0 bg-white/10 pl-12 pr-4 text-white text-[17.485px] font-light uppercase placeholder:text-white/60 focus:outline-none rounded-[5px]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                    placeholder="Email"
                    required
                  />
                </div>

                <div className="relative h-[56px]">
                  <div className="absolute inset-0 rounded-[5px] border-[1.25px] border-white" />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[25px] h-[25px] text-white" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="absolute inset-0 bg-white/10 pl-12 pr-12 text-white text-[17.485px] font-light placeholder:text-white/60 focus:outline-none rounded-[5px]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                    placeholder="Password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setError(''); }}
                      className="text-xs text-white/70 hover:text-white"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[56px] bg-white rounded-[5px] shadow-[0px_5px_5px_0px_rgba(0,0,0,0.30)] text-[#2148c0] text-[19.983px] font-semibold uppercase hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center justify-center mt-1"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    isLogin ? 'Login' : 'Signup'
                  )}
                </button>

              </form>

              {isLogin && (
                <>
                  {/* Divider */}
                  <div className="flex justify-center my-5">
                    <span className="text-xs text-white/50">or continue with</span>
                  </div>

                  {/* Google Login */}
                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white/10 border border-white/30 text-white py-2.5 rounded-[5px] text-sm font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </button>
                </>
              )}

              {/* Toggle Login/Register */}
              <p className="mt-5 text-center text-sm text-white/60">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setNotice('');
                  }}
                  className="text-white font-semibold hover:underline"
                >
                  {isLogin ? 'Sign Up' : 'Log In'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

