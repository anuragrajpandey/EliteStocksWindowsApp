use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use discord_rich_presence::activity::{
    Activity, ActivityType, Assets, Button, Party, StatusDisplayType, Timestamps,
};
use discord_rich_presence::{DiscordIpc, DiscordIpcClient};
use serde::Deserialize;
use tauri::{AppHandle, Manager};

const APP_ID: &str = "1533038457193103590";

#[derive(Default, Clone)]
struct Desired {
    active: bool,
    paused: bool,
    details: Option<String>,
    state: Option<String>,
    large_image: Option<String>,
    large_text: Option<String>,
    small_image: Option<String>,
    small_text: Option<String>,
    start_ts: Option<i64>,
    end_ts: Option<i64>,
    party_id: Option<String>,
    party_size: Option<[i32; 2]>,
    button_label: Option<String>,
    button_url: Option<String>,
}

pub struct DiscordState {
    desired: Mutex<Desired>,
    enabled: AtomicBool,
    generation: AtomicU64,
}

impl DiscordState {
    pub fn new() -> Self {
        Self {
            desired: Mutex::new(Desired::default()),
            enabled: AtomicBool::new(false),
            generation: AtomicU64::new(0),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresenceInput {
    pub details: Option<String>,
    pub state: Option<String>,
    pub poster_url: Option<String>,
    pub large_text: Option<String>,
    pub small_image_url: Option<String>,
    pub small_text: Option<String>,
    pub start_ts: Option<i64>,
    pub end_ts: Option<i64>,
    #[serde(default)]
    pub paused: bool,
    pub party_id: Option<String>,
    pub party_size: Option<[i32; 2]>,
    pub button_label: Option<String>,
    pub button_url: Option<String>,
}

fn clean(s: Option<String>) -> Option<String> {
    s.map(|v| v.trim().to_string()).filter(|v| !v.is_empty())
}

fn safe_image(url: Option<String>) -> Option<String> {
    let mut u = url?.trim().to_string();
    if u.is_empty() {
        return None;
    }
    if u.starts_with('/') {
        u = format!("https://image.tmdb.org/t/p/w500{}", u);
    } else if u.starts_with("http://") {
        u = u.replacen("http://", "https://", 1);
    }
    if u.starts_with("https://") {
        if u.len() > 256 {
            if let Some(pos) = u.find('?') {
                u = u[..pos].to_string();
            }
        }
        if u.len() <= 256 {
            return Some(u);
        }
    }
    None
}

fn safe_button_url(url: Option<String>) -> Option<String> {
    let u = url?;
    if u.starts_with("https://") && u.len() <= 512 {
        Some(u)
    } else {
        None
    }
}

#[tauri::command]
pub fn discord_set_presence(state: tauri::State<'_, DiscordState>, p: PresenceInput) {
    {
        let mut d = state.desired.lock().unwrap();
        d.active = true;
        d.paused = p.paused;
        d.details = clean(p.details);
        d.state = clean(p.state);
        d.large_image = safe_image(p.poster_url);
        d.large_text = clean(p.large_text);
        d.small_image = safe_image(p.small_image_url);
        d.small_text = clean(p.small_text);
        d.start_ts = if p.paused { None } else { p.start_ts };
        d.end_ts = if p.paused { None } else { p.end_ts };
        d.party_id = clean(p.party_id);
        d.party_size = p.party_size;
        d.button_label = clean(p.button_label);
        d.button_url = safe_button_url(p.button_url);
    }
    state.generation.fetch_add(1, Ordering::SeqCst);
}

#[tauri::command]
pub fn discord_clear(state: tauri::State<'_, DiscordState>) {
    {
        let mut d = state.desired.lock().unwrap();
        *d = Desired::default();
    }
    state.generation.fetch_add(1, Ordering::SeqCst);
}

#[tauri::command]
pub fn discord_set_enabled(state: tauri::State<'_, DiscordState>, on: bool) {
    state.enabled.store(on, Ordering::SeqCst);
    if !on {
        if let Ok(mut d) = state.desired.lock() {
            *d = Desired::default();
        }
    }
    state.generation.fetch_add(1, Ordering::SeqCst);
}

pub fn shutdown(app: &AppHandle) {
    let state = app.state::<DiscordState>();
    state.enabled.store(false, Ordering::SeqCst);
    if let Ok(mut d) = state.desired.lock() {
        *d = Desired::default();
    };
}

pub fn run_loop(app: AppHandle) {
    let mut client: Option<DiscordIpcClient> = None;
    let mut last_gen: u64 = u64::MAX;

    loop {
        let state = app.state::<DiscordState>();

        if !state.enabled.load(Ordering::SeqCst) {
            if let Some(mut c) = client.take() {
                let _ = c.clear_activity();
                std::thread::sleep(Duration::from_millis(150));
                let _ = c.close();
            }
            last_gen = u64::MAX;
            std::thread::sleep(Duration::from_millis(500));
            continue;
        }

        if client.is_none() {
            let mut c = DiscordIpcClient::new(APP_ID);
            if c.connect().is_err() {
                std::thread::sleep(Duration::from_secs(2));
                continue;
            }
            client = Some(c);
            last_gen = u64::MAX;
        }

        let gen = state.generation.load(Ordering::SeqCst);
        if gen == last_gen {
            std::thread::sleep(Duration::from_millis(500));
            continue;
        }

        let desired = state.desired.lock().unwrap().clone();
        let Some(c) = client.as_mut() else {
            std::thread::sleep(Duration::from_millis(500));
            continue;
        };

        let result = if desired.active {
            let mut assets = Assets::new();
            let mut has_assets = false;

            if let Some(img) = desired.large_image.as_deref() {
                assets = assets.large_image(img);
                if let Some(t) = desired.large_text.as_deref() {
                    assets = assets.large_text(t);
                }
                has_assets = true;
            }

            if let Some(img) = desired.small_image.as_deref() {
                assets = assets.small_image(img);
                if let Some(t) = desired.small_text.as_deref() {
                    assets = assets.small_text(t);
                }
                has_assets = true;
            }

            let mut act = Activity::new()
                .activity_type(ActivityType::Watching)
                .status_display_type(StatusDisplayType::Details);

            if has_assets {
                act = act.assets(assets);
            }

            if let Some(d) = desired.details.as_deref() {
                act = act.details(d);
            }
            if let Some(s) = desired.state.as_deref() {
                act = act.state(s);
            }
            match (desired.start_ts, desired.end_ts) {
                (Some(start), Some(end)) => {
                    act = act.timestamps(Timestamps::new().start(start).end(end));
                }
                (Some(start), None) => {
                    act = act.timestamps(Timestamps::new().start(start));
                }
                _ => {}
            }
            if let Some(size) = desired.party_size {
                let mut party = Party::new().size(size);
                if let Some(id) = desired.party_id.as_deref() {
                    party = party.id(id);
                }
                act = act.party(party);
            }
            if let (Some(label), Some(url)) =
                (desired.button_label.as_deref(), desired.button_url.as_deref())
            {
                act = act.buttons(vec![Button::new(label, url)]);
            }
            c.set_activity(act)
        } else {
            c.clear_activity()
        };

        if result.is_ok() {
            last_gen = gen;
        } else {
            let _ = c.reconnect();
        }

        std::thread::sleep(Duration::from_millis(500));
    }
}
