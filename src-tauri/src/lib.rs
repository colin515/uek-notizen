
use serde::{Deserialize, Serialize};
use tauri::Manager;

const GROQ_MODELS: [&str; 3] = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];

#[derive(Serialize)]
struct GroqMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Serialize)]
struct GroqRequest<'a> {
    model: &'a str,
    temperature: f32,
    messages: Vec<GroqMessage<'a>>,
}

#[derive(Deserialize)]
struct GroqResponse {
    choices: Vec<GroqChoice>,
}

#[derive(Deserialize)]
struct GroqChoice {
    message: GroqResponseMessage,
}

#[derive(Deserialize)]
struct GroqResponseMessage {
    content: Option<String>,
}

#[derive(Deserialize)]
struct TxtFile {
    name: String,
    content: String,
}

#[tauri::command]
async fn groq_chat(
    api_key: String,
    system_prompt: String,
    user_prompt: String,
) -> Result<String, String> {
    if api_key.trim().is_empty() {
        return Err("Bitte trage zuerst deinen Groq API-Key in den Einstellungen ein.".into());
    }

    let client = reqwest::Client::new();

    for (index, model) in GROQ_MODELS.iter().enumerate() {
        let response = client
            .post("https://api.groq.com/openai/v1/chat/completions")
            .bearer_auth(api_key.trim())
            .json(&GroqRequest {
                model,
                temperature: 0.25,
                messages: vec![
                    GroqMessage { role: "system", content: &system_prompt },
                    GroqMessage { role: "user", content: &user_prompt },
                ],
            })
            .send()
            .await
            .map_err(|error| format!("Groq konnte nicht erreicht werden: {error}"))?;

        let status = response.status();

        if status.is_success() {
            let payload = response
                .json::<GroqResponse>()
                .await
                .map_err(|error| format!("Ungültige Antwort von Groq: {error}"))?;

            return payload
                .choices
                .into_iter()
                .next()
                .and_then(|choice| choice.message.content)
                .filter(|content| !content.trim().is_empty())
                .ok_or_else(|| "Groq hat keine Antwort zurückgegeben.".into());
        }

        if status.as_u16() == 401 {
            return Err("Der Groq API-Key ist ungültig.".into());
        }

        if status.as_u16() == 429 {
            return Err("Das Groq-Limit ist gerade erreicht. Bitte versuche es später erneut.".into());
        }

        let details = response.text().await.unwrap_or_default();
        let permission_blocked =
            status.as_u16() == 403 &&
            (details.contains("model_permission_blocked") ||
             details.contains("blocked at the organization level") ||
             details.contains("blocked at the project level") ||
             (details.to_ascii_lowercase().contains("model") && details.to_ascii_lowercase().contains("blocked")));

        if permission_blocked && index + 1 < GROQ_MODELS.len() {
            continue;
        }

        return Err(format!(
            "Groq-Fehler ({status}): {}",
            details.chars().take(300).collect::<String>()
        ));
    }

    Err("Keines der erlaubten Groq-Modelle konnte verwendet werden.".into())
}

fn clean_module_number(value: &str) -> Result<String, String> {
    let number: String = value
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .take(8)
        .collect();

    if number.is_empty() || !number.chars().any(|c| c.is_ascii_digit()) {
        return Err("Ungültige Modulnummer.".into());
    }

    Ok(number)
}

async fn fetch_module_page(url: String) -> Result<Option<String>, String> {
    let client = reqwest::Client::builder()
        .user_agent("UEK-Notizen/1.4 (+https://github.com/colin515/uek-notizen)")
        .build()
        .map_err(|error| format!("Modulbaukasten-Client konnte nicht gestartet werden: {error}"))?;

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| format!("Modulbaukasten konnte nicht erreicht werden: {error}"))?;

    if response.status().as_u16() == 404 {
        return Ok(None);
    }

    if !response.status().is_success() {
        return Err(format!("Modulbaukasten-Fehler ({}).", response.status()));
    }

    response
        .text()
        .await
        .map(Some)
        .map_err(|error| format!("Moduldaten konnten nicht gelesen werden: {error}"))
}

#[tauri::command]
async fn fetch_official_module_html(module_number: String) -> Result<Option<String>, String> {
    let number = clean_module_number(&module_number)?;
    fetch_module_page(format!(
        "https://modulbaukasten.tie-international.com/module/{number}"
    ))
    .await
}

#[tauri::command]
async fn fetch_official_lbv_html(
    module_number: String,
    variant: u8,
) -> Result<Option<String>, String> {
    if variant == 0 || variant > 12 {
        return Err("Ungültige LBV-Variante.".into());
    }

    let number = clean_module_number(&module_number)?;
    fetch_module_page(format!(
        "https://modulbaukasten.tie-international.com/module/{number}/evaluation/{variant}"
    ))
    .await
}

fn safe_folder_name(value: &str) -> String {
    let cleaned: String = value
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == ' ' || *c == '-' || *c == '_' || *c == 'ä' || *c == 'ö' || *c == 'ü' || *c == 'Ä' || *c == 'Ö' || *c == 'Ü')
        .collect();
    let trimmed = cleaned.split_whitespace().collect::<Vec<_>>().join(" ");
    if trimmed.is_empty() { "UEK-Notizen".to_string() } else { trimmed }
}

fn safe_txt_name(value: &str) -> String {
    let stem = value.strip_suffix(".txt").unwrap_or(value);
    let cleaned: String = stem
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == ' ' || *c == '-' || *c == '_' || *c == 'ä' || *c == 'ö' || *c == 'ü' || *c == 'Ä' || *c == 'Ö' || *c == 'Ü')
        .collect();
    let trimmed = cleaned.split_whitespace().collect::<Vec<_>>().join(" ");
    if trimmed.is_empty() { "Notiz.txt".to_string() } else { format!("{trimmed}.txt") }
}

#[tauri::command]
async fn export_course_txt(
    app: tauri::AppHandle,
    course_folder: String,
    files: Vec<TxtFile>,
) -> Result<String, String> {
    let downloads = app
        .path()
        .download_dir()
        .map_err(|error| format!("Downloads-Ordner konnte nicht gefunden werden: {error}"))?;

    let folder = downloads.join(safe_folder_name(&course_folder));
    std::fs::create_dir_all(&folder)
        .map_err(|error| format!("ÜK-Ordner konnte nicht erstellt werden: {error}"))?;

    for file in files {
        let file_path = folder.join(safe_txt_name(&file.name));
        std::fs::write(&file_path, file.content.as_bytes())
            .map_err(|error| format!("TXT-Datei konnte nicht geschrieben werden: {error}"))?;
    }

    Ok(folder.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![groq_chat, fetch_official_module_html, fetch_official_lbv_html, export_course_txt])
        .run(tauri::generate_context!())
        .expect("error while running ÜK Notizen");
}
