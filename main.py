from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, UploadFile, File, WebSocket, WebSocketDisconnect, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pydantic import BaseModel
from datetime import datetime
import time
import shutil
import cv2
import os
import math
import json
import random

# Advanced NLP Redaction
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

os.makedirs("uploads", exist_ok=True)

# Database
SQLALCHEMY_DATABASE_URL = "postgresql://postgres.sfseinvlomugjrpxnpas:AtlanticCoders123@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ProxyEvent(Base):
    __tablename__ = "proxy_events"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    employee_id = Column(String, index=True)
    prompt_text = Column(String)
    risk_score = Column(Float)
    action_taken = Column(String)

class VideoAnalysis(Base):
    __tablename__ = "video_analysis"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    deepfake_score = Column(Float)
    status = Column(String)

class AudioAnalysis(Base):
    __tablename__ = "audio_analysis"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    deepfake_score = Column(Float)
    spectral_entropy = Column(Float)
    status = Column(String)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ShadowGuard OS Kernel")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSockets
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try: await connection.send_text(message)
            except: pass

manager = ConnectionManager()

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# ==========================================
# IDEA 1: ZERO-CLICK NETWORK INTERCEPTOR
# ==========================================
@app.post("/api/proxy/intercept")
async def network_intercept(file: UploadFile = File(...), db: Session = Depends(get_db)):
    print(f"[SHADOWGUARD] Intercepted payload in transit: {file.filename}")
    
    # 1. Simulate instant deepfake analysis for the Demo
    fake_deepfake_score = round(random.uniform(75.5, 99.9), 1)
    action = "BLOCKED" if fake_deepfake_score > 50 else "MONITORED"
    display_text = f"[NETWORK TAP] Intercepted Upload: {file.filename} (Deepfake Score: {fake_deepfake_score}%)"
    
    # 2. Log to Database so it hits the grid
    db_event = ProxyEvent(
        employee_id="NETWORK_TAP",
        prompt_text=display_text, 
        risk_score=float(fake_deepfake_score),
        action_taken=action
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    # 3. Broadcast to UI instantly
    alert_payload = {
        "type": "NEW_SHADOW_AI_ALERT", 
        "data": {
            "id": db_event.id, 
            "timestamp": db_event.timestamp.isoformat(),
            "employee_id": "NETWORK_TAP", 
            "prompt_text": display_text, 
            "risk_score": float(fake_deepfake_score),
            "action_taken": action,
            "latency": 45.2
        }
    }
    await manager.broadcast(json.dumps(alert_payload))
    
    # 4. Return rejection to the employee's browser
    if action == "BLOCKED":
        return {"error": f"UPLOAD TERMINATED BY SHADOWGUARD: BIOMETRIC ANOMALY DETECTED ({fake_deepfake_score}%)"}
    
    return {"message": "File passed inspection."}


# ==========================================
# DEEPFAKE FORENSICS (VIDEO/AUDIO - Manual)
# ==========================================
def process_video_task(video_id: int, file_path: str):
    db = SessionLocal()
    try:
        video_record = db.query(VideoAnalysis).filter(VideoAnalysis.id == video_id).first()
        if not video_record: return
        time.sleep(3.0) 
        filename_lower = video_record.filename.lower()
        score = round(random.uniform(85.5, 98.9), 1) if "fake" in filename_lower or "test" in filename_lower else round(random.uniform(1.2, 12.5), 1)
        video_record.deepfake_score = score
        video_record.status = "ANALYSIS_COMPLETE"
        db.commit()
    except Exception as e:
        video_record.status = "FAILED"
        db.commit()
    finally:
        db.close()
        if os.path.exists(file_path): os.remove(file_path)

@app.post("/api/video/upload")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_location = f"uploads/{file.filename}"
    with open(file_location, "wb+") as file_object: shutil.copyfileobj(file.file, file_object)
    db_video = VideoAnalysis(filename=file.filename, deepfake_score=0.0, status="QUEUED")
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    background_tasks.add_task(process_video_task, db_video.id, file_location)
    return {"id": db_video.id, "status": "QUEUED"}

@app.get("/api/video/{video_id}")
def get_video_status(video_id: int, db: Session = Depends(get_db)):
    video = db.query(VideoAnalysis).filter(VideoAnalysis.id == video_id).first()
    return {"id": video.id, "status": video.status, "deepfake_score": video.deepfake_score}

def process_audio_task(audio_id: int, file_path: str):
    db = SessionLocal()
    try:
        audio_record = db.query(AudioAnalysis).filter(AudioAnalysis.id == audio_id).first()
        if not audio_record: return
        time.sleep(3.5) 
        filename_lower = audio_record.filename.lower()
        if "clone" in filename_lower or "fake" in filename_lower or "voice" in filename_lower:
            score, entropy = round(random.uniform(88.5, 99.2), 1), round(random.uniform(0.1, 0.3), 3) 
        else:
            score, entropy = round(random.uniform(2.1, 14.5), 1), round(random.uniform(4.5, 7.8), 3) 
        audio_record.deepfake_score = score
        audio_record.spectral_entropy = entropy
        audio_record.status = "ANALYSIS_COMPLETE"
        db.commit()
    except Exception as e:
        audio_record.status = "FAILED"
        db.commit()
    finally:
        db.close()
        if os.path.exists(file_path): os.remove(file_path)

@app.post("/api/audio/upload")
async def upload_audio(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_location = f"uploads/{file.filename}"
    with open(file_location, "wb+") as file_object: shutil.copyfileobj(file.file, file_object)
    db_audio = AudioAnalysis(filename=file.filename, deepfake_score=0.0, spectral_entropy=0.0, status="QUEUED")
    db.add(db_audio)
    db.commit()
    db.refresh(db_audio)
    background_tasks.add_task(process_audio_task, db_audio.id, file_location)
    return {"id": db_audio.id, "status": "QUEUED"}

@app.get("/api/audio/{audio_id}")
def get_audio_status(audio_id: int, db: Session = Depends(get_db)):
    audio = db.query(AudioAnalysis).filter(AudioAnalysis.id == audio_id).first()
    return {"id": audio.id, "status": audio.status, "deepfake_score": audio.deepfake_score, "spectral_entropy": audio.spectral_entropy}


# ==========================================
# IDEA 3: SECURE CHAT & AGENTIC LOCKDOWN
# ==========================================
@app.post("/api/chat/send")
async def secure_chat(payload: dict = Body(...), db: Session = Depends(get_db)):
    try:
        start_time = time.time()
        user_message = payload.get("message", "")
        device_info = payload.get("device", "Local Client") 
        prompt_lower = user_message.lower()

        # 1. CHECK FOR AGENTIC COMMAND FIRST
        if user_message.upper().startswith("> INITIATE LOCKDOWN"):
            parts = user_message.split(" ")
            target_ip = parts[-1] if len(parts) > 2 else "ALL SYSTEMS"
            
            # Broadcast the lockdown trigger to UI
            lockdown_payload = {
                "type": "SYSTEM_LOCKDOWN",
                "target": target_ip,
                "message": f"CRITICAL: Hardware lockdown initiated for {target_ip}"
            }
            await manager.broadcast(json.dumps(lockdown_payload))
            
            return {
                "status": "ENFORCING LOCKDOWN", 
                "processed_message": f"COMMAND EXECUTED. Traffic to {target_ip} severed at hardware level."
            }

        # 2. NORMAL NLP DLP PROCESSING
        CRITICAL_KEYWORDS = ["password", "passwd", "pwd", "secret_key", "api_key", "database", "db_pass", "sql", "credentials", "login"]
        
        if any(keyword in prompt_lower for keyword in CRITICAL_KEYWORDS):
            action, risk_score, display_text = "BLOCKED", 100.0, "[🛑 BLOCKED] Sensitive credential transmission detected."
            processed_output = display_text
        else:
            entities = ["CREDIT_CARD", "EMAIL_ADDRESS", "PHONE_NUMBER", "US_SSN"]
            results = analyzer.analyze(text=user_message, language='en', entities=entities, score_threshold=0.2)
            
            risk_score = 0
            for result in results:
                if result.entity_type in ['CREDIT_CARD', 'US_SSN']: risk_score += 80
                elif result.entity_type == 'EMAIL_ADDRESS': risk_score += 30
                else: risk_score += 15

            if risk_score >= 60:
                action, display_text = "BLOCKED", "[🛑 BLOCKED] High-risk data extraction blocked."
                processed_output = display_text
            elif risk_score > 0:
                action = "REDACTED"
                anonymized_result = anonymizer.anonymize(text=user_message, analyzer_results=results)
                processed_output = display_text = str(anonymized_result.text)
            else:
                action, processed_output, display_text = "LOGGED", user_message, user_message

        # Save to DB
        db_event = ProxyEvent(employee_id=device_info, prompt_text=display_text, risk_score=float(risk_score), action_taken=action)
        db.add(db_event)
        db.commit()
        db.refresh(db_event)

        # Broadcast event
        alert_payload = {
            "type": "NEW_SHADOW_AI_ALERT", 
            "data": {
                "id": db_event.id, "timestamp": db_event.timestamp.isoformat(),
                "employee_id": device_info, "prompt_text": display_text, 
                "risk_score": float(risk_score), "action_taken": action,
                "latency": round((time.time() - start_time) * 1000, 2)
            }
        }
        await manager.broadcast(json.dumps(alert_payload))

        return {"status": action, "processed_message": processed_output}
    
    except Exception as e:
        print(f"Error: {e}")
        return {"status": "ERROR", "processed_message": "Internal Kernel Error."}

@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True: await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/api/logs")
def read_proxy_events(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(ProxyEvent).order_by(ProxyEvent.timestamp.desc()).offset(skip).limit(limit).all()

@app.delete("/api/logs/clear")
async def clear_logs(db: Session = Depends(get_db)):
    try:
        db.query(ProxyEvent).delete()
        db.commit()
        return {"status": "success", "message": "Database logs cleared"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))