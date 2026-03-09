#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Fix WebKitGTK rendering issues on Linux (NVIDIA GPUs, Wayland, tiling WMs)
  #[cfg(target_os = "linux")]
  {
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
  }

  tauri::Builder::default()
    .plugin(
      tauri_plugin_log::Builder::default()
        .level(log::LevelFilter::Info)
        .build(),
    )
    .plugin(tauri_plugin_store::Builder::default().build())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
