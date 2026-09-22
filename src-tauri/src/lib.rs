use serde::{Deserialize, Serialize};

const GROQ_MODEL: &str = "openai/gpt-oss-120b";

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
    let response = client
        .post("https://api.groq.com/openai/v1/chat/completions")
        .bearer_auth(api_key.trim())
        .json(&GroqRequest {
            model: GROQ_MODEL,
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
    if status.as_u16() == 401 {
        return Err("Der Groq API-Key ist ungültig.".into());
    }
    if status.as_u16() == 429 {
        return Err("Das Groq-Limit ist gerade erreicht. Bitte versuche es später erneut.".into());
    }
    if !status.is_success() {
        let details = response.text().await.unwrap_or_default();
        return Err(format!("Groq-Fehler ({status}): {}", details.chars().take(240).collect::<String>()));
    }

    let payload = response
        .json::<GroqResponse>()
        .await
        .map_err(|error| format!("Ungültige Antwort von Groq: {error}"))?;

    payload
        .choices
        .into_iter()
        .next()
        .and_then(|choice| choice.message.content)
        .filter(|content| !content.trim().is_empty())
        .ok_or_else(|| "Groq hat keine Antwort zurückgegeben.".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![groq_chat])
        .run(tauri::generate_context!())
        .expect("error while running ÜK Notizen");
}
