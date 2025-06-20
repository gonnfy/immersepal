# .env に記載されているキーの一覧 (シークレットとして扱う)
locals {
  secrets = [
    "DATABASE_URL",
    "DIRECT_URL",
    "DB_PASSWORD",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GCP_PROJECT_ID",
    "GCS_BUCKET_NAME",
    "VERTEX_AI_MODEL_NAME",
    "VERTEX_AI_REGION",
    "NEXT_PUBLIC_TTS_LANGUAGE_CODE_EN",
    "NEXT_PUBLIC_TTS_VOICE_NAME_EN",
    "NEXT_PUBLIC_TTS_LANGUAGE_CODE_JA",
    "NEXT_PUBLIC_TTS_VOICE_NAME_JA",
  ]
}

resource "google_cloud_run_v2_service" "anki_ai" {
  name     = "anki-ai-service"
  location = var.region
  project  = var.project_id

  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0 
      max_instance_count = 10
    }
  
    service_account = "anki-ai-runtime-sa@${var.project_id}.iam.gserviceaccount.com"

    containers {
      image = "asia-northeast1-docker.pkg.dev/${var.project_id}/anki-ai-repo/anki-ai:${var.image_tag}"
      ports {
        container_port = 8080
      }
      
      dynamic "env" {
        for_each = toset(local.secrets)

        content {
          name = env.value
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "allow_unauthenticated" {
  project  = google_cloud_run_v2_service.anki_ai.project
  location = google_cloud_run_v2_service.anki_ai.location
  name     = google_cloud_run_v2_service.anki_ai.name

  role   = "roles/run.invoker"
  member = "allUsers"
}