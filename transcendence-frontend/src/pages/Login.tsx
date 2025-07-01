import { useState } from "react";
import InputField from "../components/form/InputField";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useUser } from "../context/user/UserContext";
import { authService } from "../services/authService";

export default function Login() {
    const { login } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const message = location.state?.message;

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        if (!email || !password) {
            setError("Lütfen tüm alanları doldurun.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await authService.login({
                email,
                password
            });

            // Kullanıcıyı context'e kaydet
            login(response.user);
            
            navigate("/");
            
        } catch (error: any) {
            console.error('Login error:', error);
            setError(error.response?.data?.error || "Giriş başarısız. Email veya parolanızı kontrol edin.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-24 p-6 bg-white rounded-md shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">Giriş Yap</h2>

            {/* 💬 Auth'dan gelen uyarı mesajı */}
            {message && (
                <div className="mb-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded text-center">
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <InputField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={error && !email ? error : undefined}
                    placeholder="email@example.com"
                    disabled={isLoading}
                />
                <InputField
                    label="Parola"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={error && !password ? error : undefined}
                    placeholder="Parolanız"
                    disabled={isLoading}
                />

                {error && email && password && (
                    <>
                        <p className="text-red-500 mb-2 text-center">{error}</p>
                        <div className="text-center">
                            <Link
                                to="/register"
                                className="text-blue-600 hover:underline font-semibold"
                            >
                                Kayıt Ol
                            </Link>
                        </div>
                    </>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-semibold mt-4"
                >
                    {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
                </button>
            </form>
        </div>
    );
}
