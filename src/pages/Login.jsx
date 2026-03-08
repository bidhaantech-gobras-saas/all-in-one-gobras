import { useState } from "react";
import "../App.css";
import { supabase } from "../supabaseClient";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const validateForm = () => {
    let newErrors = { email: "", password: "" };
    let isValid = true;

    if (!email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Enter a valid email address";
      isValid = false;
    }

    if (!password.trim()) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");

    if (!validateForm()) return;

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setAuthError(error.message);
    }
    // App.js onAuthStateChange ayaa toos dashboard u diraysa
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="image-overlay">
          <div className="brand-text">
            <span className="brand-badge">Global Logistics Platform</span>
            <h1>Move cargo smarter, faster, and with full visibility.</h1>
            <p>
              Manage shipments, operations, and freight workflows from one
              modern dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="logo-wrap">
            <div className="logo-circle">G</div>
            <div>
              <h3>Gobras</h3>
              <span>Logistics Suite</span>
            </div>
          </div>

          <h2>Welcome back</h2>
          <p className="subtitle">Sign in to continue to your dashboard</p>

          {authError && <div className="auth-error">{authError}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && (
                <small className="error-text">{errors.email}</small>
              )}
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password && (
                <small className="error-text">{errors.password}</small>
              )}
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a
                href="/"
                onClick={(e) => e.preventDefault()}
                className="forgot-link"
              >
                Forgot password?
              </a>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
