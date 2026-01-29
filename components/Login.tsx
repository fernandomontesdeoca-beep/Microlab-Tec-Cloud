import React, { useState, useEffect } from 'react';
import { Settings, X, AlertTriangle, Globe, Copy, Check, ExternalLink, Code, WifiOff } from 'lucide-react';
import { saveFirebaseConfig, hasCustomConfig, resetFirebaseConfig } from '../services/firebaseConfig.ts';
import { Button, Modal, TextArea } from './UIComponents.tsx';
import { theme } from '../theme.ts';

interface LoginProps {
    onLogin: () => Promise<any>;
    onBypass: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onBypass }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<React.ReactNode | null>(null);
    const [showConfig, setShowConfig] = useState(!hasCustomConfig());
    const [configInput, setConfigInput] = useState('');
    const [domainError, setDomainError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    
    const hasConfig = hasCustomConfig();

    useEffect(() => {
        const handleStatusChange = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    const handleLogin = async () => {
        if (!isOnline) {
            setError("Se requiere conexión a internet para iniciar sesión.");
            return;
        }
        setLoading(true);
        setError(null);
        setDomainError(null);
        try {
            await onLogin();
        } catch (err: any) {
            console.error("Login Error Full Object:", err);
            let msg: React.ReactNode = "No se pudo iniciar sesión.";
            const code = err.code || '';
            const message = err.message || (typeof err === 'string' ? err : JSON.stringify(err));

            if (code === 'auth/configuration-not-found' || message.includes('CONFIGURATION_NOT_FOUND')) {
                msg = (
                    <div>
                        <p className="font-bold">Error de Configuración</p>
                        <ol className="list-decimal ml-4 mt-2 text-[10px] space-y-1">
                            <li>Ve a <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="underline font-bold">Firebase Console</a></li>
                            <li>Habilita el proveedor <strong>Google</strong> en Auth.</li>
                        </ol>
                    </div>
                );
                setShowConfig(true);
            } else if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
                setDomainError(window.location.hostname);
                setLoading(false);
                return;
            } else if (code === 'auth/network-request-failed') {
                 msg = "Error de conexión. Verifica tu internet.";
            } else {
                msg = message || "Ocurrió un error inesperado.";
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = () => {
        if (!configInput.trim()) return;
        try {
            saveFirebaseConfig(configInput);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleCopyDomain = () => {
        if(domainError) {
            navigator.clipboard.writeText(domainError);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (domainError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 animate-fadeIn">
                 <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border-2 border-red-100 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Globe className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Dominio No Autorizado</h2>
                    <p className="text-gray-600 mb-6 text-sm">Firebase bloqueó este dominio.</p>

                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6 relative group text-left shadow-inner">
                        <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Tu dominio actual</div>
                        <div className="text-lg font-mono font-bold text-white break-all pr-8">{domainError}</div>
                        <button onClick={handleCopyDomain} className="absolute top-1/2 -translate-y-1/2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white">
                            {copied ? <Check className="w-5 h-5 text-green-400"/> : <Copy className="w-5 h-5"/>}
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setDomainError(null)} className="flex-1">Volver</Button>
                        <Button variant="primary" onClick={handleLogin} className="flex-1">Reintentar</Button>
                    </div>
                    <button onClick={onBypass} className="mt-4 text-xs text-gray-400 font-bold hover:text-gray-600 underline flex items-center justify-center gap-1 w-full">
                        <Code className="w-3 h-3" /> Modo Desarrollo
                    </button>
                 </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-animate p-6 relative">
            <button onClick={() => setShowConfig(true)} className="absolute top-6 right-6 text-white/80 hover:text-white p-2 bg-white/10 rounded-full backdrop-blur transition">
                <Settings className="w-6 h-6" />
            </button>

            <div className="w-full max-w-sm bg-white/95 backdrop-blur-sm rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center text-center fade-in">
                <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl transform -rotate-3">
                    <svg className="w-14 h-14 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M130 150h60l66 120 66-120h60v212h-60V230l-66 110-66-110v142h-60z" fill="currentColor"/></svg>
                </div>
                
                <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Microlab Pro</h1>
                <p className="text-blue-600 font-bold text-xs uppercase tracking-[0.2em] mb-10">Cloud Management</p>
                
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-medium mb-6 w-full border border-red-100 animate-pulse flex items-start gap-2 text-left shadow-sm">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5"/>
                        <div className="flex-1 overflow-hidden break-words">{error}</div>
                    </div>
                )}
                
                <Button onClick={handleLogin} disabled={loading || !isOnline} className={`w-full mb-4 text-gray-700 border border-gray-200 ${isOnline ? 'bg-white hover:bg-gray-50' : 'bg-gray-100 opacity-80 cursor-not-allowed'}`}>
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    ) : (
                        isOnline ? "Ingresar con Google" : <span className="flex items-center gap-2"><WifiOff className="w-4 h-4"/> Sin Conexión</span>
                    )}
                </Button>
                
                {!isOnline && <p className="text-xs text-white/80 mb-4 font-medium">Se requiere internet para iniciar sesión.</p>}

                <button onClick={onBypass} className="w-full py-2 text-xs text-gray-200 hover:text-white font-bold transition flex items-center justify-center gap-2 bg-white/10 rounded-xl hover:bg-white/20">
                    <Code className="w-3 h-3" /> Modo Desarrollo / Offline
                </button>
            </div>

            {showConfig && (
                <Modal title="Configuración Firebase" onClose={() => setShowConfig(false)}>
                    <p className="text-sm text-gray-600 mb-4">Configuración actual del sistema.</p>
                    <TextArea val={configInput} set={setConfigInput} placeholder="Pega tu configuración..." rows={6} />
                    {hasConfig && (
                        <button onClick={resetFirebaseConfig} className="text-red-500 text-xs font-bold mt-4 underline hover:text-red-700 block mb-4">
                            Restablecer a valores de fábrica
                        </button>
                    )}
                    <Button onClick={handleSaveConfig} className="w-full">Guardar y Recargar</Button>
                </Modal>
            )}
        </div>
    );
};