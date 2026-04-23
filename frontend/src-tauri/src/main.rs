// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Emitter; // <-- 1. Changed this from Manager to Emitter
use sysinfo::Disks;
use std::thread;
use std::time::Duration;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Spawn an independent background thread to monitor physical hardware
            thread::spawn(move || {
                let mut disks = Disks::new_with_refreshed_list();
                let mut initial_disk_count = disks.list().len();

                loop {
                    thread::sleep(Duration::from_secs(2)); // Scan every 2 seconds
                    disks.refresh_list();
                    let current_disk_count = disks.list().len();

                    // If a NEW drive (USB) is physically plugged in
                    if current_disk_count > initial_disk_count {
                        println!("UNAUTHORIZED HARDWARE DETECTED!");
                        
                        // Fire a high-priority event to the React Dashboard
                        // <-- 2. Changed emit_all to just emit
                        app_handle.emit("HARDWARE_BREACH", "UNAUTHORIZED USB DETECTED").unwrap();
                        
                        initial_disk_count = current_disk_count; // Update count
                    } else if current_disk_count < initial_disk_count {
                        // Drive was removed
                        initial_disk_count = current_disk_count;
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}