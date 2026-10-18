# ADR 0002: Media storage

Status: accepted

- Production: Amazon S3 (suggested region ap-south-1) behind a CDN, using short-lived presigned upload URLs and server-generated object keys.
- Development: a local-disk implementation of the same storage interface. No extra Docker service.
- Uploads go to a private quarantine prefix, are validated (file signature, size, dimensions), re-encoded and stripped of metadata, then promoted to the public prefix.
- Limits (initial): 4 images per post, 5 MB each, JPEG, PNG or WebP. Profile pictures use the same pipeline.
- Video is out of scope until the safety and moderation tooling exists.
- Before any public launch: content-safety checks and takedown handling for uploads must be reviewed by Indian legal counsel.
