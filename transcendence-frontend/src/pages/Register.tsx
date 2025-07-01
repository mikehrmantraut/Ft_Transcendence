import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../components/form/InputField";
import { authService } from "../services/authService";
import { useUser } from "../context/user/UserContext";

export default function Register() {
    const navigate = useNavigate();
    const { login } = useUser();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        // Debug logs
        console.log("🔍 API Base URL:", import.meta.env.VITE_API_BASE_URL);
        console.log("🔍 Register form data:", { email, firstName, lastName, passwordLength: password.length });

        // Basit validasyon
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            setError("Lütfen tüm alanları doldurun.");
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError("Parolalar eşleşmiyor.");
            setIsLoading(false);
            return;
        }

        if (password.length < 8) {
            setError("Parola en az 8 karakter olmalıdır.");
            setIsLoading(false);
            return;
        }

        // Güçlü parola kontrolü
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasSpecialChar) {
            setError("Parola en az 1 büyük harf, 1 küçük harf ve 1 özel karakter içermelidir.");
            setIsLoading(false);
            return;
        }

        try {
            console.log("🚀 Kayıt isteği gönderiliyor...");
            const response = await authService.register({
                email,
                password,
                firstName,
                lastName
            });

            console.log("✅ Kayıt başarılı:", response);

            // Kullanıcıyı context'e kaydet
            login(response.user);
            
            alert("Kayıt başarılı! Ana sayfaya yönlendiriliyorsunuz.");
            navigate("/");
            
        } catch (error: any) {
            console.error('❌ Registration error:', error);
            console.error('❌ Error response:', error.response?.data);
            setError(error.response?.data?.error || "Kayıt işlemi başarısız oldu. Lütfen tekrar deneyin.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-24 p-6 bg-white rounded-md shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">Kayıt Ol</h2>
            <form onSubmit={handleSubmit}>
                <InputField
                    label="Ad"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                />
                <InputField
                    label="Soyad"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                />
                <InputField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                />
                <InputField
                    label="Parola (en az 8 karakter, 1 büyük, 1 küçük harf, 1 özel karakter)"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    placeholder="örn: MyPass123!"
                />
                <InputField
                    label="Parola (Tekrar)"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                />
                {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md font-semibold"
                >
                    {isLoading ? "Kaydediliyor..." : "Kayıt Ol"}
                </button>
            </form>
        </div>
    );
}
