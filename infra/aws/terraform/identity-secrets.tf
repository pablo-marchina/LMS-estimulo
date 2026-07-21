resource "terraform_data" "identity_secret_guard" {
  input = {
    cpf_encryption_key_arn = try(var.secret_arns["CPF_ENCRYPTION_KEY"], null)
    cpf_lookup_hmac_key_arn = try(var.secret_arns["CPF_LOOKUP_HMAC_KEY"], null)
  }

  lifecycle {
    precondition {
      condition = (
        contains(keys(var.secret_arns), "CPF_ENCRYPTION_KEY")
        && contains(keys(var.secret_arns), "CPF_LOOKUP_HMAC_KEY")
      )
      error_message = "CPF_ENCRYPTION_KEY and CPF_LOOKUP_HMAC_KEY Secrets Manager ARNs are required."
    }
    precondition {
      condition = (
        var.secret_arns["CPF_ENCRYPTION_KEY"] != var.secret_arns["CPF_LOOKUP_HMAC_KEY"]
      )
      error_message = "CPF encryption and lookup HMAC must use independent secrets."
    }
  }
}
