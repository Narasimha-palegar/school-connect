import { createContext, useContext, useEffect, useState } from "react";
import api from "@/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // null = loading, false = unauth, object = auth
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("sc_token");
        if (!token) {
            setUser(false);
            setLoading(false);
            return;
        }
        api.get("/auth/me")
            .then((r) => setUser(r.data))
            .catch(() => {
                localStorage.removeItem("sc_token");
                setUser(false);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = (token, userObj) => {
        localStorage.setItem("sc_token", token);
        setUser(userObj);
    };
    const logout = () => {
        localStorage.removeItem("sc_token");
        setUser(false);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
