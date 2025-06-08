terraform {
  backend "gcs" {
    bucket = "anki-ai-tfstate-20250609"
    prefix = "terraform/state"
  }
}