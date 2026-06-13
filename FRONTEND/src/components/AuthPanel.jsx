import { useState } from "react";
import { auth } from "../services/api.js";

export default function AuthPanel({ onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [loginType, setLoginType] = useState("user");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      if (mode === "login") {
        const response =
          loginType === "admin"
            ? await auth.adminLogin({ mail: form.email, pass: form.password })
            : await auth.login({ email: form.email, password: form.password });
        onLogin(response.user ?? response.admin);
      } else {
        const response = await auth.register({ name: form.name, email: form.email, password: form.password });
        setMessage(response.message || "Registration successful. You can now login.");
        setMode("login");
        setForm({ name: "", email: "", password: "" });
        onRegister && onRegister(response.user);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto mt-12 max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-xl shadow-slate-950/30">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-100">InvestPro</h1>
          <p className="text-sm text-slate-400">Secure login for users and admins, with simple registration guidance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-full px-4 py-2 text-sm ${mode === "login" ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-full px-4 py-2 text-sm ${mode === "register" ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300"}`}
          >
            Register
          </button>
        </div>
      </div>

      {mode === "login" && (
        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
          <div className="mb-2 font-semibold text-slate-100">Login type</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLoginType("user")}
              className={`rounded-full px-4 py-2 text-sm ${loginType === "user" ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300"}`}
            >
              User
            </button>
            <button
              type="button"
              onClick={() => setLoginType("admin")}
              className={`rounded-full px-4 py-2 text-sm ${loginType === "admin" ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300"}`}
            >
              Admin
            </button>
          </div>
          <p className="mt-3 text-slate-400">Choose the correct account type before signing in.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <label className="block text-sm text-slate-300">
            Name
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-500"
              placeholder="Your name"
            />
          </label>
        )}

        <label className="block text-sm text-slate-300">
          Email
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-500"
            placeholder="name@example.com"
          />
        </label>

        <label className="block text-sm text-slate-300 relative">
          Password
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={handleChange}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 pr-10 text-slate-100 outline-none focus:border-sky-500"
            placeholder="Enter password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-12 text-slate-400 hover:text-slate-200"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </label>

        {error && <div className="rounded-2xl bg-rose-950 px-4 py-3 text-sm text-rose-300">{error}</div>}
        {message && <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-slate-200">{message}</div>}

        <button
          type="submit"
          className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-white transition hover:bg-sky-400"
        >
          {mode === "login" ? "Login" : "Register"}
        </button>
      </form>
    </div>
  );
}
