# Pinata Setup Guide

## Getting Your Pinata JWT

1. Create an account on [Pinata](https://www.pinata.cloud/) if you don't have one already.

2. Once logged in, navigate to the API Keys section in your dashboard.

3. Create a new API key with the following permissions:
   - Files: Read and Write
   - Pinning: Read and Write

4. After creating the key, you'll be provided with:
   - API Key
   - API Secret
   - JWT

5. Copy the JWT token (it should be a long string, much longer than the truncated version in your .env file).

6. Update your `.env` file with the complete JWT:

```
PINATA_JWT="your_complete_jwt_token_here"
```

## Troubleshooting Pinata Uploads

If you're experiencing issues with file uploads to Pinata:

1. Verify that your JWT token is complete and not truncated.

2. Check the server logs for any error messages from the Pinata API.

3. Ensure that the file paths are correct and that the files exist in the specified locations.

4. Verify that your Pinata account has enough storage space available.

5. Check that your API key has the necessary permissions for file uploads.

## Testing Your Pinata Connection

You can test your Pinata connection by running a simple upload test:

1. Create a small test file.

2. Use the `/ipfsDocs` endpoint to upload the file.

3. Check the server logs for any error messages.

4. If successful, you should receive a CID (Content Identifier) in the response.

## Common Error Messages

- `401 Unauthorized`: Your JWT token is invalid or expired.
- `413 Request Entity Too Large`: The file you're trying to upload is too large.
- `429 Too Many Requests`: You've exceeded your rate limit.
- `500 Internal Server Error`: There's an issue with the Pinata service.