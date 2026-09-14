@echo off
title ShadowGuard OS - Full System Launch
echo [📜] Initializing ShadowGuard Kernel...

:: 1. THE MAGIC FIX: We temporarily add your Python Scripts to the Windows PATH.
:: This completely bypasses the quotation mark errors caused by the spaces in your name!
set "PATH=%PATH%;C:\Users\Yukith M Joseph\AppData\Roaming\Python\Python314\Scripts"

:: 2. Launch the Backend Enforcer (FASTAPI)
:: This line automatically checks if you have a virtual environment (venv) and activates it!
start "ShadowGuard Core API" cmd /k "if exist venv\Scripts\activate (venv\Scripts\activate & uvicorn main:app --host 192.168.137.1 --port 8000) else (py -m uvicorn main:app --host 192.168.137.1 --port 8000)"

:: 3. Launch the Network Proxy (MITMPROXY)
:: Because we fixed the PATH in Step 1, we can just call mitmdump normally!
start "ShadowGuard Network Proxy" cmd /k "mitmdump -s proxy.py -p 8080 --set block_global=false --listen-host 192.168.137.1"

:: 4. Launch the Frontend Dashboard (VITE)
:: FIXED: Added 'cd frontend &&' so it opens the correct folder before running npm!
start "ShadowGuard UI" cmd /k "cd frontend && npm run dev -- --host"

echo [✅] ALL NODES DEPLOYED.
echo [ℹ️] Ensure your phone proxy is set to 192.168.137.1 Port 8080.
pause