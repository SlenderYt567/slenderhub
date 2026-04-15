import React, { useEffect } from 'react';
import { CheckCircle, ExternalLink } from 'lucide-react';

const GatewayVerify: React.FC = () => {
    useEffect(() => {
        // Set the verification flag in localStorage
        localStorage.setItem('slender_gateway_verified', 'true');
        
        // Notify other tabs immediately
        window.dispatchEvent(new Event('storage'));
        
        // Try to close the tab after a delay if it's a popup
        const timer = setTimeout(() => {
            // window.close() only works if the script opened the window
            // but we can at least show a message
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-8 text-center backdrop-blur-sm shadow-2xl">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h1 className="text-3xl font-black mb-4">VERIFIED!</h1>
                <p className="text-gray-400 mb-8">
                    Your verification was successful. You can now return to the original tab to claim your key.
                </p>
                <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 text-sm text-gray-500 flex items-center justify-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    You can close this tab now.
                </div>
            </div>
        </div>
    );
};

export default GatewayVerify;
