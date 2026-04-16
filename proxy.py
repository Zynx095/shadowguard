import json
import requests
from mitmproxy import http

# ==========================================
# SHADOWGUARD PROXY CONFIG
# ==========================================
API_ENFORCER_URL = "http://192.168.137.1:8000/api/chat/send"

# Words that trigger an immediate hard-block (Case-Insensitive)
CRITICAL_KEYWORDS = [
    "password", "passwd", "pwd", "secret_key", "api_key", 
    "database", "db_pass", "sql", "credentials", "login"
]

print("\n[🛡️] SHADOWGUARD PROXY ACTIVE")
print("[📡] Intercepting: API & Web Browser Traffic")
print("[🔒] Protocol: Central Enforcer Hand-off Enabled\n")

def request(flow: http.HTTPFlow):
    url = flow.request.pretty_url
    
    # Catch BOTH the App API and the Web Browser URLs
    if "api.openai.com/v1/chat/completions" in url or "chatgpt.com/backend-api" in url:
        try:
            # 1. Unpack the outgoing JSON payload
            payload = json.loads(flow.request.content)
            messages = payload.get("messages", [])
            
            user_prompt = ""
            content_ref = None # Keep track of where the text is for redacting
            
            if messages:
                last_message = messages[-1]
                content = last_message.get("content", "")
                
                # Check if it's the App format (string) or Browser format (dictionary)
                if isinstance(content, str):
                    user_prompt = content
                    content_ref = "string"
                elif isinstance(content, dict) and "parts" in content:
                    user_prompt = str(content["parts"][0])
                    content_ref = "dict"
            
            # If we successfully grabbed the text, send it to the UI!
            if user_prompt:
                # --- NEW: DEVICE FINGERPRINTING ---
                client_ip = flow.client_conn.peername[0]
                user_agent = flow.request.headers.get("User-Agent", "").lower()
                
                device_type = "Unknown Device"
                if "iphone" in user_agent or "ipad" in user_agent: device_type = "Apple iOS"
                elif "android" in user_agent: device_type = "Android Node"
                elif "windows" in user_agent: device_type = "Windows Client"
                elif "macintosh" in user_agent: device_type = "macOS Node"
                
                fingerprint = f"{device_type} ({client_ip})"
                # ----------------------------------

                try:
                    # 2. Forward to the SHADOWGUARD ENFORCER (main.py)
                    # FIXED: Removed the crashing duplicate code here!
                    response = requests.post(
                        API_ENFORCER_URL, 
                        json={"message": user_prompt, "device": fingerprint}, 
                        timeout=5
                    )
                    
                    if response.status_code == 200:
                        decision = response.json()
                        status = decision.get("status")
                        processed_message = decision.get("processed_message")

                        # --- OVERRIDE: FORCE BLOCK FOR PASSWORDS & DATABASES ---
                        prompt_lower = user_prompt.lower()
                        if any(keyword in prompt_lower for keyword in CRITICAL_KEYWORDS):
                            status = "BLOCKED"

                        # 3. ACTION: BLOCKED
                        if status == "BLOCKED":
                            print(f"\n[🛑] BLOCKED: {user_prompt[:50]}...")
                            # SEVER THE CONNECTION ENTIRELY
                            flow.kill()

                        # 4. ACTION: REDACTED
                        elif status == "REDACTED":
                            print(f"\n[✂️] REDACTED: Original: {user_prompt[:30]}...")
                            
                            # Safely repack the data depending on if it came from App or Browser
                            if content_ref == "string":
                                payload["messages"][-1]["content"] = processed_message
                            elif content_ref == "dict":
                                payload["messages"][-1]["content"]["parts"][0] = processed_message
                                
                            flow.request.content = json.dumps(payload).encode("utf-8")

                        # 5. ACTION: LOGGED
                        else:
                            print(f"\n[✅] CLEAN: {user_prompt[:50]}...")
                
                except requests.exceptions.ConnectionError:
                    print("\n[⚠️] ENFORCER OFFLINE: Could not reach main.py")

        except Exception as e:
            # Silently pass if ChatGPT sends a background packet that isn't a chat message
            pass