variable "project_id" {
  type        = string
  description = "The GCP project ID."
  default     = "adept-bridge-457703-u9"
}

variable "region" {
  type        = string
  description = "The GCP region to deploy resources."
  default     = "asia-northeast1"
}