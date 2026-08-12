update core.file_upload_profiles
set allowed_mime_types = array['image/png','image/jpeg']::text[],
    allowed_extensions = array['png','jpg','jpeg']::text[],
    max_size_bytes = 15728640,
    updated_at = now()
where code = 'certificate_template_v1'
  and status = 'active';
